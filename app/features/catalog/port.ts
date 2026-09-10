import {z} from 'zod';
import type {CatalogContext, CatalogSource} from './domain';
import {validateEvidenceSnapshot, type CatalogSnapshot, type FreshnessPolicy} from './evidence';
import {CatalogContextSchema, ProductIdSchema, SourceSchema, VariantIdSchema} from './schemas';

const context = {context: CatalogContextSchema};
export const SearchInputSchema = z.strictObject({...context, query: z.string().max(256).trim().min(1), limit: z.int().min(1).max(20)}).readonly();
export const ProductInputSchema = z.strictObject({...context, productId: ProductIdSchema}).readonly();
export const VariantsInputSchema = z.strictObject({...context, variantIds: z.array(VariantIdSchema).min(1).max(20).refine(ids => new Set(ids).size === ids.length).readonly()}).readonly();
export type CatalogError = 'invalid_input' | 'not_found' | 'timeout' | 'provider_error' | 'invalid_response';
export type CatalogResult = Readonly<{ok: true; value: CatalogSnapshot}> | Readonly<{ok: false; error: CatalogError}>;
export interface CommerceCatalogPort {
  search(input: z.infer<typeof SearchInputSchema>): Promise<CatalogResult>;
  getProduct(input: z.infer<typeof ProductInputSchema>): Promise<CatalogResult>;
  getVariants(input: z.infer<typeof VariantsInputSchema>): Promise<CatalogResult>;
}
/** Adapter responses remain untrusted until the boundary validates them. */
export interface CatalogAdapter {
  search(input: z.infer<typeof SearchInputSchema>): Promise<unknown>;
  getProduct(input: z.infer<typeof ProductInputSchema>): Promise<unknown>;
  getVariants(input: z.infer<typeof VariantsInputSchema>): Promise<unknown>;
}
const ResponseSchema = z.discriminatedUnion('ok', [
  z.strictObject({ok: z.literal(true), value: z.unknown()}),
  z.strictObject({ok: z.literal(false), error: z.enum(['not_found', 'timeout', 'provider_error', 'invalid_response'])}),
]);
const failure = (error: CatalogError): CatalogResult => Object.freeze({ok: false, error});
const sameContext = (left: CatalogContext, right: CatalogContext) => left.market === right.market && left.country === right.country && left.language === right.language;
function sameSource(left: CatalogSource, right: CatalogSource) {
  return left.kind === 'fixture' && right.kind === 'fixture'
    ? left.dataset === right.dataset && left.version === right.version
    : left.kind === 'storefront' && right.kind === 'storefront' && left.merchant === right.merchant && left.apiVersion === right.apiVersion;
}

/** The source and clock are trusted server configuration, never tool arguments.
 * Adapters own transport deadlines and map them to timeout. This boundary never
 * copies provider exceptions or errors into a public result.
 */
export function createCatalogPort(adapter: CatalogAdapter, source: CatalogSource, freshness: () => FreshnessPolicy): CommerceCatalogPort {
  const expectedSource = SourceSchema.parse(source);
  async function invoke<T extends {context: CatalogContext}>(schema: z.ZodType<T>, input: unknown, call: (parsed: T) => Promise<unknown>, matches: (snapshot: CatalogSnapshot, parsed: T) => boolean, allowNotFound: boolean): Promise<CatalogResult> {
    let parsed: T;
    try {
      const result = schema.safeParse(input);
      if (!result.success) return failure('invalid_input');
      parsed = result.data;
    } catch {return failure('invalid_input');}
    try {
      const response = ResponseSchema.safeParse(await call(parsed));
      if (!response.success) return failure('invalid_response');
      if (!response.data.ok) return failure(response.data.error === 'not_found' && !allowNotFound ? 'invalid_response' : response.data.error);
      const snapshot = await validateEvidenceSnapshot(response.data.value, freshness());
      if (!snapshot.ok) return failure('invalid_response');
      const observed = snapshot.value.observation;
      if (!sameSource(observed.source, expectedSource) || !sameContext(observed.context, parsed.context) || !matches(snapshot.value, parsed)) return failure('invalid_response');
      return Object.freeze({ok: true, value: snapshot.value});
    } catch {return failure('provider_error');}
  }
  return Object.freeze({
    search: (input: z.infer<typeof SearchInputSchema>) => invoke(SearchInputSchema, input, parsed => adapter.search(parsed), (snapshot, parsed) => snapshot.observation.products.length <= parsed.limit, false),
    getProduct: (input: z.infer<typeof ProductInputSchema>) => invoke(ProductInputSchema, input, parsed => adapter.getProduct(parsed), (snapshot, parsed) => snapshot.observation.products.length === 1 && snapshot.observation.products[0]?.id === parsed.productId, true),
    getVariants: (input: z.infer<typeof VariantsInputSchema>) => invoke(VariantsInputSchema, input, parsed => adapter.getVariants(parsed), (snapshot, parsed) => {
      if (snapshot.observation.products.some(product => product.variants.length === 0)) return false;
      const ids = snapshot.observation.products.flatMap(product => product.variants.map(variant => variant.id));
      return ids.length === parsed.variantIds.length && ids.every(id => parsed.variantIds.includes(id));
    }, true),
  });
}
