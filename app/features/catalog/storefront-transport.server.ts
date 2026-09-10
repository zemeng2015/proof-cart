import {z} from 'zod';
import type {CatalogContext} from './domain';
import {createCatalogPort, type CatalogAdapter, type CommerceCatalogPort} from './port';
import type {PcSearchQueryVariables, PcProductByIdQueryVariables, PcVariantsQueryVariables} from './storefront.generated';
import {mapStorefrontResult} from './storefront-mapper.server';
import {STOREFRONT_PRODUCT, STOREFRONT_SEARCH, STOREFRONT_VARIANTS} from './storefront-queries';

export const STOREFRONT_API_VERSION = '2026-04';
const ConfigSchema = z.strictObject({
  merchant: z.string().max(253).regex(/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/),
  privateToken: z.string().min(1).max(2048).regex(/^[!-~]+$/),
  context: z.strictObject({market: z.literal('retail'), country: z.enum(['US', 'CA', 'GB', 'DE', 'FR']), language: z.enum(['EN', 'DE', 'FR'])}),
  requestMode: z.enum(['buyer', 'background']),
  buyerIp: z.union([z.ipv4(), z.ipv6()]).optional(),
  timeoutMs: z.int().min(1).max(15_000).default(5000),
  maxAgeMs: z.int().min(0).max(300_000).default(60_000),
}).refine(value => value.requestMode !== 'buyer' || value.buyerIp !== undefined);
const EnvelopeSchema = z.strictObject({data: z.unknown().optional(), errors: z.array(z.unknown()).optional(), extensions: z.unknown().optional()});
const EffectiveContextSchema = z.object({context: z.object({country: z.string(), language: z.string()})});
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const error = (code: 'provider_error' | 'timeout' | 'invalid_response') => ({ok: false as const, error: code});
type Dependencies = {fetch: typeof globalThis.fetch; now: () => number};
type Construction = {ok: true; value: CommerceCatalogPort} | {ok: false; error: 'invalid_configuration'};

/** Server-only factory. Configuration and buyer IP must come from trusted server
 * inputs, never GraphQL tool arguments. The returned port does not expose them.
 */
export function createStorefrontCatalog(input: unknown, dependencies: Dependencies): Construction {
  try {
    const parsed = ConfigSchema.safeParse(input);
    if (!parsed.success) return {ok: false, error: 'invalid_configuration'};
    const config = parsed.data;
    const source = {kind: 'storefront' as const, merchant: config.merchant, apiVersion: STOREFRONT_API_VERSION};
    const sameContext = (context: CatalogContext) => context.market === config.context.market && context.country === config.context.country && context.language === config.context.language;
    async function execute(operation: 'search' | 'product' | 'variants', query: string, variables: Record<string, unknown>, context: CatalogContext) {
      if (!sameContext(context)) return error('provider_error');
      const controller = new AbortController();
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
      let timedOut = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const deadline = new Promise<ReturnType<typeof error>>(resolve => {
        timer = setTimeout(() => {
          timedOut = true;
          controller.abort();
          void reader?.cancel().catch(() => undefined);
          resolve(error('timeout'));
        }, config.timeoutMs);
      });
      const request = async () => {
        try {
          const headers: Record<string, string> = {'Content-Type': 'application/json', 'Shopify-Storefront-Private-Token': config.privateToken};
          if (config.requestMode === 'buyer' && config.buyerIp) headers['Shopify-Storefront-Buyer-IP'] = config.buyerIp;
          const response = await dependencies.fetch(`https://${config.merchant}/api/${STOREFRONT_API_VERSION}/graphql.json`, {
            method: 'POST', headers, redirect: 'error', cache: 'no-store', signal: controller.signal,
            body: JSON.stringify({query, variables}),
          });
          if (timedOut) {void response.body?.cancel().catch(() => undefined); return error('timeout');}
          if (!response.ok) {void response.body?.cancel().catch(() => undefined); return error(response.status === 408 || response.status === 504 ? 'timeout' : 'provider_error');}
          const contentType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
          if (response.headers.get('X-Shopify-API-Version') !== STOREFRONT_API_VERSION || !['application/json', 'application/graphql-response+json'].includes(contentType ?? '') || !response.body) {
            void response.body?.cancel().catch(() => undefined);
            return error('invalid_response');
          }
          reader = response.body.getReader();
          const chunks: Uint8Array[] = [];
          let size = 0;
          while (true) {
            const chunk = await reader.read();
            if (chunk.done) break;
            size += chunk.value.byteLength;
            if (size > MAX_RESPONSE_BYTES) {void reader.cancel().catch(() => undefined); return error('invalid_response');}
            chunks.push(chunk.value);
          }
          if (timedOut) return error('timeout');
          const bytes = new Uint8Array(size);
          let offset = 0;
          for (const chunk of chunks) {bytes.set(chunk, offset); offset += chunk.byteLength;}
          let json: unknown;
          try {json = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));}
          catch {return error('invalid_response');}
          const envelope = EnvelopeSchema.safeParse(json);
          if (!envelope.success) return error('invalid_response');
          if (envelope.data.errors?.length) return error('provider_error');
          const effective = EffectiveContextSchema.safeParse(envelope.data.extensions);
          if (!effective.success || effective.data.context.country !== context.country || effective.data.context.language !== context.language) return error('invalid_response');
          return await mapStorefrontResult(operation, envelope.data.data, {source, context, fetchedAt: dependencies.now()});
        } catch {return error(timedOut ? 'timeout' : 'provider_error');}
      };
      try {return await Promise.race([request(), deadline]);}
      finally {clearTimeout(timer);}
    }
    const contextual = () => ({country: config.context.country, language: config.context.language});
    const adapter: CatalogAdapter = {
      search: input => {
        const variables: PcSearchQueryVariables = {...contextual(), query: input.query, first: input.limit};
        return execute('search', STOREFRONT_SEARCH, variables, input.context);
      },
      getProduct: input => {
        const variables: PcProductByIdQueryVariables = {...contextual(), id: input.productId};
        return execute('product', STOREFRONT_PRODUCT, variables, input.context);
      },
      getVariants: input => {
        const variables: PcVariantsQueryVariables = {...contextual(), ids: [...input.variantIds]};
        return execute('variants', STOREFRONT_VARIANTS, variables, input.context);
      },
    };
    return {ok: true, value: createCatalogPort(adapter, source, () => ({now: dependencies.now(), maxAgeMs: config.maxAgeMs}))};
  } catch {return {ok: false, error: 'invalid_configuration'};}
}
