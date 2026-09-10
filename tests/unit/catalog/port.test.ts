// @vitest-environment node
import {describe, expect, it, vi} from 'vitest';
import {createCatalogPort, type CatalogAdapter} from '../../../app/features/catalog/port';
import {createEvidenceSnapshot} from '../../../app/features/catalog/evidence';

const source = {kind: 'fixture' as const, dataset: 'catalog', version: 'v1'};
const context = {market: 'retail', country: 'US', language: 'EN'};
const policy = {now: 1100, maxAgeMs: 100};
async function response(options: {country?: string; dataset?: string; products?: boolean} = {}) {
  const unknown = {status: 'unknown', reason: 'not_requested'};
  return createEvidenceSnapshot({observation: {
    source: {...source, dataset: options.dataset ?? source.dataset},
    context: {...context, country: options.country ?? context.country}, fetchedAt: 1000, productsComplete: true,
    products: options.products ? [{id: 'fixture:product:cup', title: 'Cup', description: '', canonicalUrl: null, specifications: [], variantsComplete: false,
      variants: [{id: 'fixture:variant:blue', productId: 'fixture:product:cup', title: 'Blue', price: unknown, availableForSale: unknown, currentlyNotInStock: unknown, quantityAvailable: unknown, quantityRule: unknown}]}] : [],
  }, evidence: []}, policy);
}
function harness(output: unknown) {
  const call = vi.fn(async () => output);
  const adapter: CatalogAdapter = {search: call, getProduct: call, getVariants: call};
  return {call, port: createCatalogPort(adapter, source, () => policy)};
}

describe('read-only catalog boundary', () => {
  it('preserves successful empty search and exposes only three read methods', async () => {
    const {port, call} = harness(await response());
    expect(await port.search({context, query: ' cup ', limit: 20})).toMatchObject({ok: true, value: {observation: {products: []}}});
    expect(call).toHaveBeenCalledWith({context, query: 'cup', limit: 20});
    expect(Object.keys(port).sort()).toEqual(['getProduct', 'getVariants', 'search']);
    expect(Object.isFrozen(port)).toBe(true);
  });
  it.each([{query: '', limit: 1}, {query: 'x'.repeat(257), limit: 1}, {query: ' '.repeat(256) + 'x', limit: 1}, {query: 'cup', limit: 21}, {query: 'cup', limit: 1, mutation: 'cartCreate'}])('rejects invalid search before adapter invocation: %j', async input => {
    const {port, call} = harness(await response());
    expect(await port.search({...input, context})).toEqual({ok: false, error: 'invalid_input'});
    expect(call).not.toHaveBeenCalled();
  });
  it('rejects duplicate, excessive, or wrong-resource variant requests', async () => {
    const {port, call} = harness(await response());
    for (const variantIds of [['fixture:variant:blue', 'fixture:variant:blue'], Array.from({length: 21}, (_, i) => `fixture:variant:v${i}`), ['fixture:product:cup']]) {
      expect(await port.getVariants({context, variantIds})).toEqual({ok: false, error: 'invalid_input'});
    }
    expect(call).not.toHaveBeenCalled();
  });
  it.each([{country: 'CA'}, {dataset: 'other'}])('rejects valid evidence from a foreign context/source %j', async options => {
    const {port} = harness(await response(options));
    expect(await port.search({context, query: 'cup', limit: 1})).toEqual({ok: false, error: 'invalid_response'});
  });
  it('binds product and variant results to the requested identities and preserves unknowns', async () => {
    const {port} = harness(await response({products: true}));
    expect(await port.getProduct({context, productId: 'fixture:product:cup'})).toMatchObject({ok: true});
    expect(await port.getProduct({context, productId: 'fixture:product:other'})).toEqual({ok: false, error: 'invalid_response'});
    expect(await port.getVariants({context, variantIds: ['fixture:variant:other']})).toEqual({ok: false, error: 'invalid_response'});
    expect(await port.getVariants({context, variantIds: ['fixture:variant:blue']})).toMatchObject({ok: true, value: {observation: {products: [{variantsComplete: false, variants: [{price: {status: 'unknown'}}]}]}}});
  });
  it('does not convert missing lookups into empty successes or search errors into empty results', async () => {
    const {port} = harness({ok: false, error: 'not_found'});
    expect(await port.getProduct({context, productId: 'fixture:product:cup'})).toEqual({ok: false, error: 'not_found'});
    expect(await port.search({context, query: 'cup', limit: 1})).toEqual({ok: false, error: 'invalid_response'});
    const empty = harness(await response()).port;
    expect(await empty.getProduct({context, productId: 'fixture:product:cup'})).toEqual({ok: false, error: 'invalid_response'});
  });
  it('rejects unrelated empty product containers in a variant lookup', async () => {
    const original = await response({products: true});
    if (!original.ok) throw new Error('Invalid fixture');
    const product = original.value.observation.products[0]!;
    const expanded = await createEvidenceSnapshot({
      observation: {...original.value.observation, products: [product, {...product, id: 'fixture:product:unrelated', variants: []}]},
      evidence: original.value.evidence,
    }, policy);
    const {port} = harness(expanded);
    expect(await port.getVariants({context, variantIds: ['fixture:variant:blue']})).toEqual({ok: false, error: 'invalid_response'});
    expect(await port.search({context, query: 'cup', limit: 1})).toEqual({ok: false, error: 'invalid_response'});
  });
  it.each(['timeout', 'provider_error', 'invalid_response'])('preserves safe %s errors', async error => {
    const {port} = harness({ok: false, error});
    expect(await port.search({context, query: 'cup', limit: 1})).toEqual({ok: false, error});
  });
  it('redacts thrown provider details and rejects extra response fields', async () => {
    const {port, call} = harness({ok: false, error: 'provider_error', accessToken: 'private'});
    expect(await port.search({context, query: 'cup', limit: 1})).toEqual({ok: false, error: 'invalid_response'});
    call.mockRejectedValueOnce(new Error('private token and request body'));
    expect(await port.search({context, query: 'cup', limit: 1})).toEqual({ok: false, error: 'provider_error'});
  });
  it('validates freshness after the adapter completes', async () => {
    const output = await response();
    let now = 1100;
    const call = async () => {now = 1101; return output;};
    const port = createCatalogPort({search: call, getProduct: call, getVariants: call}, source, () => ({now, maxAgeMs: 100}));
    expect(await port.search({context, query: 'cup', limit: 1})).toEqual({ok: false, error: 'invalid_response'});
  });
});
