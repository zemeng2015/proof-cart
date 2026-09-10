import {z} from 'zod';
import {validateCartProposal, type CartProposal, type ProposalError, type ProposalResult} from '../cart/proposal';
import type {CatalogSnapshot} from '../catalog/evidence';
import {compareMoney, type Money} from '../catalog/money';
import {MoneySchema} from '../catalog/schemas';
import {createReadOnlyTools, PLANNER_DEADLINE_MS, PLANNER_FRESHNESS_MS, type PlannerDependencies, type ToolTrace} from './tools';

export type {PlannerDependencies} from './tools';
export const IntentSchema = z.strictObject({
  query: z.string().max(256).trim().min(1),
  currency: z.enum(['USD', 'CAD', 'EUR', 'GBP']),
  quantity: z.int().min(1).max(10).default(1),
  maxTotal: MoneySchema.optional(),
  material: z.string().max(80).trim().min(1).optional(),
}).refine(intent => intent.maxTotal === undefined || intent.maxTotal.currencyCode === intent.currency, {message: 'currency_mismatch'}).readonly();
export type PlannerIntent = z.infer<typeof IntentSchema>;
type ProposalSuccess = Extract<ProposalResult, {ok: true}>;
export type PlannerCandidate = Readonly<{
  productId: string; variantId: string; proposal: CartProposal; merchandiseSubtotal: Money;
  notices: ProposalSuccess['notices']; reasons: readonly Readonly<{code: 'price' | 'availability' | 'material'; evidenceId: string}>[];
}>;
export type ExclusionCode = ProposalError | 'material_unknown' | 'material_mismatch' | 'over_budget' | 'no_variants' | 'alternative_variant' | 'candidate_limit';
export type PlannerExclusion = Readonly<{productId: string; variantId: string | null; code: ExclusionCode}>;
export type PlannerNotice = 'incomplete_search' | 'incomplete_variants';
export type PlannerError = 'invalid_intent' | 'invalid_configuration' | 'deadline_exceeded' | 'tool_failed';
export type PlannerResult = Readonly<{ok: false; error: PlannerError; toolTrace: readonly ToolTrace[]}> |
  Readonly<{ok: true; intent: PlannerIntent; snapshot: CatalogSnapshot; candidates: readonly PlannerCandidate[]; exclusions: readonly PlannerExclusion[]; notices: readonly PlannerNotice[]; toolTrace: readonly ToolTrace[]}>;

function freeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
const orderText = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;
function orderCandidates(left: PlannerCandidate, right: PlannerCandidate) {
  const total = compareMoney(left.merchandiseSubtotal, right.merchandiseSubtotal);
  return (total.ok ? total.value : 0) || orderText(left.productId, right.productId) || orderText(left.variantId, right.variantId);
}

/** Pure deterministic selection over read-only evidence. Each candidate is a
 * separate one-line alternative; no returned proposal is approval to mutate.
 */
export async function runPlanner(input: unknown, deps: PlannerDependencies): Promise<PlannerResult> {
  let previous = 0;
  let clockInvalid = false;
  function readClock() {
    try {
      const value = deps.now();
      if (clockInvalid || !Number.isSafeInteger(value) || value < previous) throw new Error();
      previous = value;
      return value;
    } catch {clockInvalid = true; throw new Error();}
  }
  const tools = createReadOnlyTools({...deps, now: readClock});
  const failure = (error: PlannerError): PlannerResult => freeze({ok: false, error, toolTrace: tools.stats.trace});
  let intent: PlannerIntent;
  try {
    const parsed = IntentSchema.safeParse(input);
    if (!parsed.success) return failure('invalid_intent');
    intent = parsed.data;
  } catch {return failure('invalid_intent');}
  let start: number;
  try {start = readClock();} catch {return failure('invalid_configuration');}
  const wallStart = performance.now();
  let stopped = false;
  const expired = (now: number) => stopped || now - start >= PLANNER_DEADLINE_MS || performance.now() - wallStart >= PLANNER_DEADLINE_MS;
  async function plan(): Promise<PlannerResult> {
    const response = await tools.dispatch('search', {query: intent.query, limit: 20, context: deps.context});
    if (!response.ok) return failure(response.error === 'deadline_exceeded' || response.error === 'invalid_configuration' ? response.error : 'tool_failed');
    const snapshot = response.value;
    const candidates: PlannerCandidate[] = [];
    const exclusions: PlannerExclusion[] = [];
    const notices: PlannerNotice[] = [];
    if (!snapshot.observation.productsComplete) notices.push('incomplete_search');
    if (snapshot.observation.products.some(product => !product.variantsComplete)) notices.push('incomplete_variants');
    for (const product of snapshot.observation.products) {
      if (product.variants.length === 0) exclusions.push({productId: product.id, variantId: null, code: 'no_variants'});
      const material = product.specifications.find(specification => specification.key === 'material')?.fact;
      const eligible: PlannerCandidate[] = [];
      for (const variant of product.variants) {
        if (expired(readClock())) return failure('deadline_exceeded');
        const exclude = (code: ExclusionCode) => exclusions.push({productId: product.id, variantId: variant.id, code});
        if (intent.material !== undefined) {
          if (material?.status !== 'known') {exclude('material_unknown'); continue;}
          if (material.value.trim().toLowerCase() !== intent.material.toLowerCase()) {exclude('material_mismatch'); continue;}
        }
        if (variant.price.status !== 'known') {exclude('unknown_price'); continue;}
        if (variant.availableForSale.status !== 'known') {exclude('unknown_availability'); continue;}
        if (!variant.availableForSale.value) {exclude('unavailable'); continue;}
        if (variant.quantityRule.status !== 'known') {exclude('unknown_quantity_rule'); continue;}
        const facts = [variant.price, variant.availableForSale, variant.quantityRule, variant.quantityAvailable, variant.currentlyNotInStock];
        const rationaleEvidenceIds = facts.flatMap(fact => fact.status === 'known' ? [fact.evidenceId] : []);
        if (material?.status === 'known') rationaleEvidenceIds.push(material.evidenceId);
        const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([snapshot.fingerprint, variant.id, intent.quantity, intent.currency])));
        const id = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
        const checked = await validateCartProposal({
          schemaVersion: 1, proposalId: `pc-${id}`, action: 'add_lines',
          lines: [{variantId: variant.id, quantity: intent.quantity}], rationaleEvidenceIds,
          currency: intent.currency, priceSnapshotHash: snapshot.fingerprint,
          expiresAt: snapshot.observation.fetchedAt + PLANNER_FRESHNESS_MS,
        }, snapshot, {now: readClock(), maxAgeMs: PLANNER_FRESHNESS_MS});
        if (!checked.ok) {exclude(checked.error); continue;}
        if (intent.maxTotal !== undefined) {
          const compared = compareMoney(checked.merchandiseSubtotal, intent.maxTotal);
          if (!compared.ok || compared.value > 0) {exclude('over_budget'); continue;}
        }
        const reasons: {code: 'price' | 'availability' | 'material'; evidenceId: string}[] = [];
        if (variant.price.status === 'known') reasons.push({code: 'price', evidenceId: variant.price.evidenceId});
        if (variant.availableForSale.status === 'known') reasons.push({code: 'availability', evidenceId: variant.availableForSale.evidenceId});
        if (material?.status === 'known') reasons.push({code: 'material', evidenceId: material.evidenceId});
        eligible.push({productId: product.id, variantId: variant.id, proposal: checked.value, merchandiseSubtotal: checked.merchandiseSubtotal, notices: checked.notices, reasons});
      }
      eligible.sort(orderCandidates);
      if (eligible[0]) candidates.push(eligible[0]);
      for (const candidate of eligible.slice(1)) exclusions.push({productId: candidate.productId, variantId: candidate.variantId, code: 'alternative_variant'});
    }
    candidates.sort(orderCandidates);
    for (const candidate of candidates.slice(3)) exclusions.push({productId: candidate.productId, variantId: candidate.variantId, code: 'candidate_limit'});
    const finalNow = readClock();
    if (expired(finalNow)) return failure('deadline_exceeded');
    // Earlier candidates can expire while later ones are evaluated. Recheck the
    // shared immutable evidence and every selected proposal at one final clock.
    if (finalNow - snapshot.observation.fetchedAt >= PLANNER_FRESHNESS_MS || candidates.slice(0, 3).some(candidate => candidate.proposal.expiresAt <= finalNow)) return failure('tool_failed');
    return freeze({ok: true, intent, snapshot, candidates: candidates.slice(0, 3), exclusions, notices, toolTrace: tools.stats.trace});
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([plan(), new Promise<PlannerResult>(resolve => {
      timer = setTimeout(() => {stopped = true; resolve(failure('deadline_exceeded'));}, PLANNER_DEADLINE_MS);
    })]);
  } catch {return failure(clockInvalid ? 'invalid_configuration' : 'tool_failed');}
  finally {clearTimeout(timer);}
}
