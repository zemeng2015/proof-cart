// @vitest-environment node
import {afterEach, describe, expect, it, vi} from 'vitest';
import type {Product, Variant} from '../../app/features/catalog/domain';
import {createEvidenceSnapshot, type CatalogSnapshot, type EvidenceRecord} from '../../app/features/catalog/evidence';
import {createFixtureCatalog} from '../../app/features/catalog/fixture-adapter';
import {FIXTURE_CONTEXT, FIXTURE_PRODUCTS, FIXTURE_SOURCE} from '../../app/features/catalog/fixture-data';
import type {CommerceCatalogPort} from '../../app/features/catalog/port';
import {validateCartProposal} from '../../app/features/cart/proposal';
import * as proposalModule from '../../app/features/cart/proposal';
import {runPlanner, type PlannerDependencies} from '../../app/features/planner/planner';

const NOW = 100_000;
const intent = {query: 'cup', currency: 'USD'};
const cup = FIXTURE_PRODUCTS[0]!;
const unknown = {status: 'unknown', reason: 'missing'} as const;
const changed = (patch: Partial<Variant>): Product => ({...cup, variants: [{...cup.variants[0]!, ...patch}]});
async function snapshot(products: readonly Product[], complete = true, fetchedAt = NOW): Promise<CatalogSnapshot> {
  const provenance = {source: FIXTURE_SOURCE, context: FIXTURE_CONTEXT, fetchedAt};
  const evidence: EvidenceRecord[] = [];
  for (const product of products) {
    for (const specification of product.specifications) {
      if (specification.fact.status === 'known') evidence.push({...provenance, id: specification.fact.evidenceId, subject: {kind: 'product', id: product.id}, fieldPath: `specifications.${specification.key}`, value: specification.fact.value});
    }
    for (const variant of product.variants) {
      for (const fieldPath of ['price', 'availableForSale', 'quantityRule', 'quantityAvailable', 'currentlyNotInStock'] as const) {
        const fact = variant[fieldPath];
        if (fact.status === 'known') evidence.push({...provenance, id: fact.evidenceId, subject: {kind: 'variant', id: variant.id}, fieldPath, value: fact.value});
      }
    }
  }
  const result = await createEvidenceSnapshot({observation: {...provenance, products, productsComplete: complete}, evidence}, {now: NOW, maxAgeMs: 60_000});
  if (!result.ok) throw new Error(`Bad test snapshot: ${result.error}`);
  return result.value;
}
function deps(value?: CatalogSnapshot): PlannerDependencies {
  const catalog = createFixtureCatalog({now: () => NOW});
  return {catalog: value ? {...catalog, search: async () => ({ok: true, value})} : catalog, source: FIXTURE_SOURCE, context: FIXTURE_CONTEXT, now: () => NOW};
}
afterEach(() => {vi.useRealTimers(); vi.restoreAllMocks();});

describe('deterministic read-only planner', () => {
  it('returns one sourced alternative per product, exact totals, stable IDs and deep immutable output', async () => {
    const configuration = deps(await snapshot(FIXTURE_PRODUCTS));
    const result = await runPlanner({...intent, quantity: 2}, configuration);
    expect(result).toEqual(await runPlanner({...intent, quantity: 2}, configuration));
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error();
    expect(result.candidates.map(candidate => candidate.productId)).toEqual(['fixture:product:free-guide', 'fixture:product:canvas-bag', 'fixture:product:ceramic-cup']);
    expect(result.candidates.map(candidate => candidate.merchandiseSubtotal.amount)).toEqual(['0', '28', '39.998']);
    expect(result.candidates[2]!.variantId).toBe('fixture:variant:cup-blue');
    expect(result.toolTrace).toEqual([{call: 1, tool: 'search', outcome: 'ok'}]);
    expect(result.exclusions.some(exclusion => exclusion.code === 'alternative_variant')).toBe(true);
    expect(result.exclusions.some(exclusion => exclusion.code === 'candidate_limit')).toBe(true);
    for (const candidate of result.candidates) {
      expect(candidate.proposal.lines).toHaveLength(1);
      expect(candidate.proposal.expiresAt).toBe(NOW + 60_000);
      expect((await validateCartProposal(candidate.proposal, result.snapshot, {now: NOW, maxAgeMs: 60_000})).ok).toBe(true);
      for (const reason of candidate.reasons) expect(result.snapshot.evidence.some(record => record.id === reason.evidenceId)).toBe(true);
    }
    expect(Object.isFrozen(result.snapshot.observation.products[0]!.variants[0]!.price)).toBe(true);
    expect(Object.isFrozen(result.candidates[0]!.reasons[0])).toBe(true);
    expect(Object.isFrozen(result.intent)).toBe(true);
  });
  it('uses exact totals for the inclusive budget and known material for hard constraints', async () => {
    const configuration = deps();
    const accepted = await runPlanner({...intent, quantity: 3, material: ' GLAZED CERAMIC ', maxTotal: {amount: '59.997', currencyCode: 'USD'}}, configuration);
    expect(accepted).toMatchObject({ok: true, intent: {material: 'GLAZED CERAMIC'}, candidates: [{merchandiseSubtotal: {amount: '59.997'}}]});
    const rejected = await runPlanner({...intent, quantity: 3, maxTotal: {amount: '59.996999999999999999', currencyCode: 'USD'}}, configuration);
    expect(rejected).toMatchObject({ok: true, candidates: [], exclusions: [{code: 'over_budget'}, {code: 'over_budget'}]});
    expect(await runPlanner({...intent, material: 'ceramic'}, configuration)).toMatchObject({ok: true, candidates: [], exclusions: [{code: 'material_mismatch'}, {code: 'material_mismatch'}]});
    expect(await runPlanner({query: 'guide', currency: 'USD', material: 'paper'}, configuration)).toMatchObject({ok: true, candidates: [], exclusions: [{code: 'material_unknown'}]});
  });
  it.each([
    [changed({price: unknown}), 'unknown_price'],
    [changed({availableForSale: unknown}), 'unknown_availability'],
    [changed({quantityRule: unknown}), 'unknown_quantity_rule'],
    [FIXTURE_PRODUCTS[5]!, 'unavailable'],
    [FIXTURE_PRODUCTS[6]!, 'quantity_rule_violation'],
  ])('shows explicit exclusion for a critical missing or unusable fact (%s)', async (product, code) => {
    expect(await runPlanner(intent, deps(await snapshot([product])))).toMatchObject({ok: true, candidates: [], exclusions: [{code}]});
  });
  it('rejects insufficient stock, currency mismatch and amount overflow while preserving unknown stock notices', async () => {
    const zeroStock = changed({quantityAvailable: {status: 'known', value: 0, evidenceId: 'stock-zero'}});
    expect(await runPlanner(intent, deps(await snapshot([zeroStock])))).toMatchObject({ok: true, candidates: [], exclusions: [{code: 'insufficient_inventory'}]});
    expect(await runPlanner({...intent, currency: 'CAD'}, deps())).toMatchObject({ok: true, candidates: [], exclusions: [{code: 'currency_mismatch'}, {code: 'currency_mismatch'}]});
    const overflow = changed({price: {status: 'known', value: {amount: '999999999999999999999999999999', currencyCode: 'USD'}, evidenceId: 'huge-price'}});
    expect(await runPlanner({...intent, quantity: 2}, deps(await snapshot([overflow])))).toMatchObject({ok: true, candidates: [], exclusions: [{code: 'amount_overflow'}]});
    const result = await runPlanner({query: 'bag', currency: 'USD'}, deps());
    expect(result).toMatchObject({ok: true, candidates: [{notices: [{code: 'inventory_unknown'}, {code: 'backorder_status_unknown'}]}]});
  });
  it('reports incomplete result scopes and empty variant sets without fabricating candidates', async () => {
    expect(await runPlanner(intent, deps(await snapshot([{...cup, variants: [], variantsComplete: false}], false)))).toMatchObject({
      ok: true, candidates: [], exclusions: [{variantId: null, code: 'no_variants'}], notices: ['incomplete_search', 'incomplete_variants'],
    });
    expect(await runPlanner({query: 'does-not-exist', currency: 'USD'}, deps())).toMatchObject({ok: true, candidates: [], exclusions: [], notices: []});
  });
  it('ignores description instructions and respects exact evidence prices', async () => {
    const result = await runPlanner({query: 'injection', currency: 'USD'}, deps());
    expect(result).toMatchObject({ok: true, candidates: [{merchandiseSubtotal: {amount: '24'}}], toolTrace: [{tool: 'search'}]});
  });
  it.each([null, {}, {...intent, extra: 'buy'}, {...intent, currency: 'JPY'}, {...intent, quantity: 0}, {...intent, quantity: 11}, {...intent, quantity: 1.5}, {...intent, query: ' '.repeat(257)}, {...intent, material: ''}, {...intent, maxTotal: {amount: '-1', currencyCode: 'USD'}}, {...intent, maxTotal: {amount: '1', currencyCode: 'CAD'}}])('rejects invalid structured intent without invoking tools', async input => {
    expect(await runPlanner(input, deps())).toEqual({ok: false, error: 'invalid_intent', toolTrace: []});
  });
  it('contains throwing intent getters and broken configuration clocks', async () => {
    expect(await runPlanner({get query() {throw new Error('SECRET');}}, deps())).toEqual({ok: false, error: 'invalid_intent', toolTrace: []});
    expect(await runPlanner(intent, {...deps(), now: () => NaN})).toEqual({ok: false, error: 'invalid_configuration', toolTrace: []});
    expect(await runPlanner(intent, {...deps(), now: () => {throw new Error('SECRET');}})).toEqual({ok: false, error: 'invalid_configuration', toolTrace: []});
  });
  it('makes provider failure opaque and rejects malformed snapshots', async () => {
    const configuration = deps();
    for (const search of [async () => {throw new Error('SECRET');}, async () => ({ok: true, value: {fingerprint: 'forged'}})]) {
      const result = await runPlanner(intent, {...configuration, catalog: {...configuration.catalog, search} as unknown as CommerceCatalogPort});
      expect(result).toMatchObject({ok: false, error: 'tool_failed'});
      expect(JSON.stringify(result)).not.toContain('SECRET');
    }
  });
  it('returns within the shared wall deadline for an uncooperative provider', async () => {
    vi.useFakeTimers();
    const configuration = deps();
    const pending = runPlanner(intent, {...configuration, catalog: {...configuration.catalog, search: () => new Promise(() => {})}});
    await vi.advanceTimersByTimeAsync(5_000);
    expect(await pending).toMatchObject({ok: false, error: 'deadline_exceeded'});
    expect(vi.getTimerCount()).toBe(0);
  });
  it('cannot return a stale proposal at the freshness boundary', async () => {
    const value = await snapshot([cup], true, NOW - 60_000);
    expect(await runPlanner(intent, deps(value))).toMatchObject({ok: false, error: 'tool_failed'});
  });
  it.each([NaN, Infinity, NOW + 0.5, NOW - 1])('rejects an invalid final clock after a candidate passed validation (%s)', async invalid => {
    let time = NOW;
    const configuration = deps(await snapshot([changed({})]));
    const original = proposalModule.validateCartProposal;
    vi.spyOn(proposalModule, 'validateCartProposal').mockImplementation(async (...args) => {
      const result = await original(...args);
      expect(result.ok).toBe(true);
      time = invalid;
      return result;
    });
    expect(await runPlanner(intent, {...configuration, now: () => time})).toMatchObject({ok: false, error: 'invalid_configuration'});
  });
  it('rejects clock reversal during later candidate processing even if after the starting time', async () => {
    let time = NOW;
    const configuration = deps(await snapshot([cup]));
    const original = proposalModule.validateCartProposal;
    vi.spyOn(proposalModule, 'validateCartProposal').mockImplementation(async (...args) => {
      const result = await original(...args);
      time = time === NOW ? NOW + 200 : NOW + 100;
      return result;
    });
    expect(await runPlanner(intent, {...configuration, now: () => time})).toMatchObject({ok: false, error: 'invalid_configuration'});
  });
  it('rechecks earlier candidates when later processing crosses their shared expiry', async () => {
    let time = NOW;
    const configuration = deps(await snapshot([cup], true, NOW - 59_900));
    const original = proposalModule.validateCartProposal;
    let validCandidates = 0;
    vi.spyOn(proposalModule, 'validateCartProposal').mockImplementation(async (...args) => {
      const result = await original(...args);
      if (result.ok && ++validCandidates === 2) time += 101;
      return result;
    });
    expect(await runPlanner(intent, {...configuration, now: () => time})).toMatchObject({ok: false, error: 'tool_failed'});
    expect(validCandidates).toBe(2);
  });
  it('enforces the overall deadline after candidate validation, not just during tool calls', async () => {
    let time = NOW;
    const configuration = deps(await snapshot([changed({})]));
    const original = proposalModule.validateCartProposal;
    vi.spyOn(proposalModule, 'validateCartProposal').mockImplementation(async (...args) => {
      const result = await original(...args);
      time += 5_000;
      return result;
    });
    expect(await runPlanner(intent, {...configuration, now: () => time})).toMatchObject({ok: false, error: 'deadline_exceeded'});
  });
});
