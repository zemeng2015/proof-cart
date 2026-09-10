import {z} from 'zod';
import {validateEvidenceSnapshot, type FreshnessPolicy} from '../catalog/evidence';
import {addMoney, multiplyMoney, type Money} from '../catalog/money';
import {EvidenceIdSchema, VariantIdSchema} from '../catalog/schemas';

export const CartProposalSchema = z.strictObject({
  schemaVersion: z.literal(1),
  proposalId: z.string().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/),
  action: z.literal('add_lines'),
  lines: z.array(z.strictObject({variantId: VariantIdSchema, quantity: z.int().min(1).max(10)}).readonly())
    .min(1).max(3).refine(lines => new Set(lines.map(line => line.variantId)).size === lines.length).readonly(),
  rationaleEvidenceIds: z.array(EvidenceIdSchema).min(1).max(128)
    .refine(ids => new Set(ids).size === ids.length).readonly(),
  currency: z.enum(['USD', 'CAD', 'EUR', 'GBP']),
  priceSnapshotHash: z.string().regex(/^[a-f0-9]{64}$/),
  expiresAt: z.int().min(0).max(Number.MAX_SAFE_INTEGER),
}).readonly();

export type CartProposal = z.infer<typeof CartProposalSchema>;
export type ProposalError = 'invalid_proposal' | 'invalid_snapshot' | 'snapshot_mismatch' | 'expired_proposal' |
  'invalid_expiry' | 'variant_not_found' | 'unknown_price' | 'unknown_availability' | 'unavailable' |
  'currency_mismatch' | 'unknown_quantity_rule' | 'quantity_rule_violation' | 'insufficient_inventory' |
  'irrelevant_evidence' | 'missing_evidence' | 'amount_overflow';
type Notice = Readonly<{variantId: string; code: 'inventory_unknown' | 'backorder_status_unknown' | 'backorder'}>;
export type ProposalResult = Readonly<{ok: false; error: ProposalError}> |
  Readonly<{ok: true; value: CartProposal; merchandiseSubtotal: Money; notices: readonly Notice[]}>;
const failure = (error: ProposalError): ProposalResult => Object.freeze({ok: false, error});

/** Validates data only. A successful proposal is neither approval nor authority
 * to mutate a cart. Snapshot authenticity must come from a trusted server fetch.
 */
export async function validateCartProposal(input: unknown, snapshotInput: unknown, policy: FreshnessPolicy): Promise<ProposalResult> {
  try {
    const parsed = CartProposalSchema.safeParse(input);
    if (!parsed.success) return failure('invalid_proposal');
    const checked = await validateEvidenceSnapshot(snapshotInput, policy);
    if (!checked.ok) return failure('invalid_snapshot');
    const proposal = parsed.data;
    const snapshot = checked.value;
    if (proposal.priceSnapshotHash !== snapshot.fingerprint) return failure('snapshot_mismatch');
    if (proposal.expiresAt <= policy.now) return failure('expired_proposal');
    if (proposal.expiresAt - snapshot.observation.fetchedAt > policy.maxAgeMs) return failure('invalid_expiry');
    const selectedVariants = new Set(proposal.lines.map(line => line.variantId));
    const selectedProducts = new Set<string>();
    const requiredEvidence = new Set<string>();
    const notices: Notice[] = [];
    let subtotal: Money = Object.freeze({amount: '0', currencyCode: proposal.currency});
    for (const line of proposal.lines) {
      const product = snapshot.observation.products.find(item => item.variants.some(variant => variant.id === line.variantId));
      const variant = product?.variants.find(item => item.id === line.variantId);
      if (!product || !variant) return failure('variant_not_found');
      selectedProducts.add(product.id);
      if (variant.price.status !== 'known') return failure('unknown_price');
      if (variant.availableForSale.status !== 'known') return failure('unknown_availability');
      if (!variant.availableForSale.value) return failure('unavailable');
      if (variant.price.value.currencyCode !== proposal.currency) return failure('currency_mismatch');
      if (variant.quantityRule.status !== 'known') return failure('unknown_quantity_rule');
      const rule = variant.quantityRule.value;
      // Quantity must satisfy both the minimum and the provider's increment.
      if (line.quantity < rule.minimum || (rule.maximum !== null && line.quantity > rule.maximum) || line.quantity % rule.increment !== 0) return failure('quantity_rule_violation');
      // Unknown inventory is an explicit notice on a read-only proposal, never
      // proof of stock. Known insufficient inventory is conservatively rejected.
      if (variant.quantityAvailable.status === 'known') {
        if (line.quantity > variant.quantityAvailable.value) return failure('insufficient_inventory');
      } else notices.push(Object.freeze({variantId: variant.id, code: 'inventory_unknown'}));
      if (variant.currentlyNotInStock.status !== 'known') notices.push(Object.freeze({variantId: variant.id, code: 'backorder_status_unknown'}));
      else if (variant.currentlyNotInStock.value) notices.push(Object.freeze({variantId: variant.id, code: 'backorder'}));
      for (const fact of [variant.price, variant.availableForSale, variant.quantityRule, variant.quantityAvailable, variant.currentlyNotInStock]) {
        if (fact.status === 'known') requiredEvidence.add(fact.evidenceId);
      }
      const cost = multiplyMoney(variant.price.value, line.quantity);
      if (!cost.ok) return failure('amount_overflow');
      const total = addMoney(subtotal, cost.value);
      if (!total.ok) return failure('amount_overflow');
      subtotal = total.value;
    }
    const rationale = new Set(proposal.rationaleEvidenceIds);
    for (const id of requiredEvidence) if (!rationale.has(id)) return failure('missing_evidence');
    for (const id of rationale) {
      const record = snapshot.evidence.find(item => item.id === id);
      if (!record || (record.subject.kind === 'variant' ? !selectedVariants.has(record.subject.id) : !selectedProducts.has(record.subject.id))) return failure('irrelevant_evidence');
    }
    return Object.freeze({ok: true, value: proposal, merchandiseSubtotal: subtotal, notices: Object.freeze(notices)});
  } catch {return failure('invalid_proposal');}
}
