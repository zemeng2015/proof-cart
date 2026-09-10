// @vitest-environment node
import {describe, expect, it, vi} from 'vitest';
import {createStorefrontCatalog} from '../../../app/features/catalog/storefront-transport.server';

const context = {market: 'retail', country: 'US', language: 'EN'};
const config = {merchant: 'demo.myshopify.com', privateToken: 'SYNTHETIC_PRIVATE_TOKEN', context, requestMode: 'background'};
const headers = {'Content-Type': 'application/json', 'X-Shopify-API-Version': '2026-04'};
const extensions = {context: {country: 'US', language: 'EN'}};
const empty = {data: {search: {nodes: [], pageInfo: {hasNextPage: false}}}, extensions};
function setup(response: Response | (() => Promise<Response>) = new Response(JSON.stringify(empty), {headers}), options: unknown = config) {
  const fetch = vi.fn<typeof globalThis.fetch>(typeof response === 'function' ? response : async () => response);
  const created = createStorefrontCatalog(options, {fetch, now: () => 1000});
  if (!created.ok) throw new Error('Invalid test configuration');
  return {fetch, port: created.value};
}
const product = {
  id: 'gid://shopify/Product/1', title: 'Cup', description: 'Synthetic cup', onlineStoreUrl: null, material: null,
  variants: {nodes: [{id: 'gid://shopify/ProductVariant/2', title: 'Blue', product: {id: 'gid://shopify/Product/1'}, price: {amount: '19.999', currencyCode: 'USD'}, availableForSale: true, currentlyNotInStock: false, quantityAvailable: null, quantityRule: {minimum: 1, maximum: null, increment: 1}}], pageInfo: {hasNextPage: false}},
};

describe('server-only Storefront transport', () => {
  it('sends a fixed read query to the pinned HTTPS merchant with variables and private headers', async () => {
    const {fetch, port} = setup();
    expect(await port.search({context, query: 'cup', limit: 3})).toMatchObject({ok: true});
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('https://demo.myshopify.com/api/2026-04/graphql.json');
    expect(init).toMatchObject({method: 'POST', redirect: 'error', cache: 'no-store', headers: {'Shopify-Storefront-Private-Token': config.privateToken}});
    const body = JSON.parse(String(init?.body));
    expect(body.query).toContain('query PcSearch');
    expect(body.variables).toEqual({country: 'US', language: 'EN', query: 'cup', first: 3});
    expect(JSON.stringify(port)).not.toContain(config.privateToken);
  });
  it('maps real selected product and variant response shapes with evidence', async () => {
    const detail = setup(new Response(JSON.stringify({data: {product}, extensions}), {headers}));
    const result = await detail.port.getProduct({context, productId: product.id});
    expect(result).toMatchObject({ok: true, value: {observation: {products: [{variants: [{price: {status: 'known', value: {amount: '19.999'}}}]}]}}});
    const {variants, ...info} = product;
    const nodes = setup(new Response(JSON.stringify({data: {nodes: [{...variants.nodes[0], __typename: 'ProductVariant', product: info}]}, extensions}), {headers}));
    expect(await nodes.port.getVariants({context, variantIds: ['gid://shopify/ProductVariant/2']})).toMatchObject({ok: true});
    expect(JSON.parse(String(nodes.fetch.mock.calls[0]![1]?.body)).query).toContain('query PcVariants');
  });
  it('requires trusted buyer IP in buyer mode and only includes it in the request header', async () => {
    const invalid = createStorefrontCatalog({...config, requestMode: 'buyer'}, {fetch: vi.fn(), now: () => 1000});
    expect(invalid).toEqual({ok: false, error: 'invalid_configuration'});
    const {fetch, port} = setup(undefined, {...config, requestMode: 'buyer', buyerIp: '192.0.2.1'});
    const result = await port.search({context, query: 'cup', limit: 1});
    expect(fetch.mock.calls[0]![1]?.headers).toMatchObject({'Shopify-Storefront-Buyer-IP': '192.0.2.1'});
    expect(JSON.stringify(result)).not.toContain('192.0.2.1');
  });
  it.each([{merchant: 'evil.example'}, {privateToken: ''}, {privateToken: 'bad\r\nheader'}, {timeoutMs: 0}, {checkoutUrl: 'https://example.com'}])('rejects unsafe or missing configuration %j', change => {
    const fetch = vi.fn();
    expect(createStorefrontCatalog({...config, ...change}, {fetch, now: () => 1000})).toEqual({ok: false, error: 'invalid_configuration'});
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects unsupported input and mismatched context without fetching', async () => {
    const {fetch, port} = setup();
    expect(await port.search({context, query: '', limit: 1})).toEqual({ok: false, error: 'invalid_input'});
    expect(await port.search({context: {...context, country: 'CA'}, query: 'cup', limit: 1})).toEqual({ok: false, error: 'provider_error'});
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([['2026-07', 'application/json'], ['', 'application/json'], ['2026-04', 'text/html']])('rejects wrong API version/content type %s %s', async (version, type) => {
    const {port} = setup(new Response(JSON.stringify(empty), {headers: {'X-Shopify-API-Version': version, 'Content-Type': type}}));
    expect(await port.search({context, query: 'cup', limit: 1})).toEqual({ok: false, error: 'invalid_response'});
  });
  it('rejects partial GraphQL errors without leaking messages or accepting partial products', async () => {
    const {port} = setup(new Response(JSON.stringify({...empty, errors: [{message: config.privateToken}]}), {headers}));
    expect(await port.search({context, query: 'cup', limit: 1})).toEqual({ok: false, error: 'provider_error'});
  });
  it.each([429, 500, 504])('maps HTTP %s to an opaque error', async status => {
    const {port} = setup(new Response(config.privateToken, {status}));
    expect(await port.search({context, query: 'cup', limit: 1})).toEqual({ok: false, error: status === 504 ? 'timeout' : 'provider_error'});
  });
  it('rejects malformed JSON and oversized response bodies', async () => {
    for (const body of ['{malformed', ' '.repeat(2 * 1024 * 1024 + 1)]) {
      const {port} = setup(new Response(body, {headers}));
      expect(await port.search({context, query: 'cup', limit: 1})).toEqual({ok: false, error: 'invalid_response'});
    }
  });
  it('bounds both stalled fetch and stalled body streams, aborting the underlying request', async () => {
    const stalled = setup(() => new Promise(() => {}), {...config, timeoutMs: 5});
    expect(await stalled.port.search({context, query: 'cup', limit: 1})).toEqual({ok: false, error: 'timeout'});
    expect(stalled.fetch.mock.calls[0]![1]?.signal?.aborted).toBe(true);
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({cancel});
    const {port} = setup(new Response(body, {headers}), {...config, timeoutMs: 5});
    expect(await port.search({context, query: 'cup', limit: 1})).toEqual({ok: false, error: 'timeout'});
    expect(cancel).toHaveBeenCalled();
  });
  it('redacts thrown network exceptions', async () => {
    const {port} = setup(async () => {throw new Error(config.privateToken);});
    expect(await port.search({context, query: 'cup', limit: 1})).toEqual({ok: false, error: 'provider_error'});
  });
  it.each([undefined, {}, {context: {country: 'CA', language: 'EN'}}, {context: {country: 'US', language: 'FR'}}, {context: {country: 1, language: 'EN'}}])('rejects missing, malformed, or mismatched effective context %j', async effective => {
    const {port} = setup(new Response(JSON.stringify({...empty, extensions: effective}), {headers}));
    expect(await port.search({context, query: 'cup', limit: 1})).toEqual({ok: false, error: 'invalid_response'});
  });
  it('cancels a response body arriving after an abort-ignoring fetch timed out', async () => {
    let deliver!: (response: Response) => void;
    const deferred = new Promise<Response>(resolve => {deliver = resolve;});
    const {port} = setup(() => deferred, {...config, timeoutMs: 5});
    expect(await port.search({context, query: 'cup', limit: 1})).toEqual({ok: false, error: 'timeout'});
    const cancel = vi.fn();
    deliver(new Response(new ReadableStream<Uint8Array>({cancel}), {headers}));
    await vi.waitFor(() => expect(cancel).toHaveBeenCalledTimes(1));
  });
});
