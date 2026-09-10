import {z} from 'zod';
import type {CatalogContext, CatalogSource, Fact, Product, Variant} from './domain';
import {createEvidenceSnapshot, type EvidenceRecord} from './evidence';
import type {CatalogResult} from './port';
import {CanonicalUrlSchema, MoneySchema, QuantityRuleSchema} from './schemas';
import type {PcSearchQuery, PcProductByIdQuery, PcVariantsQuery} from './storefront.generated';

const productId = z.string().max(160).regex(/^gid:\/\/shopify\/Product\/[1-9][0-9]*$/);
const variantId = z.string().max(160).regex(/^gid:\/\/shopify\/ProductVariant\/[1-9][0-9]*$/);
const title = z.string().min(1).max(256);
const pageInfo = z.strictObject({hasNextPage: z.boolean()});
const productInfo = z.strictObject({
  id: productId, title, description: z.string().max(8192),
  onlineStoreUrl: z.string().max(8192).nullable(),
  material: z.strictObject({type: z.string().min(1).max(128), value: z.string().max(65536)}).nullable(),
});
const variantFields = {
  id: variantId, title, product: z.strictObject({id: productId}),
  price: z.strictObject({amount: z.string(), currencyCode: z.string()}).transform((value, context) => {
    const result = MoneySchema.safeParse(value);
    if (result.success) return result.data;
    context.addIssue({code: 'custom', message: 'invalid_price'});
    return z.NEVER;
  }),
  availableForSale: z.boolean(), currentlyNotInStock: z.boolean(),
  quantityAvailable: z.int().min(-2147483648).max(2147483647).nullable(),
  quantityRule: QuantityRuleSchema,
};
const variantSchema = z.strictObject(variantFields);
const productSchema = productInfo.extend({
  variants: z.strictObject({nodes: z.array(variantSchema).max(20), pageInfo}),
});
const searchSchema = z.strictObject({search: z.strictObject({
  nodes: z.array(productSchema.extend({__typename: z.literal('Product')})).max(20), pageInfo,
})}) satisfies z.ZodType<PcSearchQuery>;
const lookupSchema = z.strictObject({product: productSchema.nullable()}) satisfies z.ZodType<PcProductByIdQuery>;
const nodesSchema = z.strictObject({nodes: z.array(z.strictObject({
  ...variantFields, __typename: z.literal('ProductVariant'), product: productInfo,
}).nullable()).max(20)}) satisfies z.ZodType<PcVariantsQuery>;
type Metadata = {source: Extract<CatalogSource, {kind: 'storefront'}>; context: CatalogContext; fetchedAt: number};
const invalid = (): CatalogResult => ({ok: false, error: 'invalid_response'});

/** Map only the selected, bounded Storefront wire shape. Descriptions stay data. */
export async function mapStorefrontResult(operation: 'search' | 'product' | 'variants', data: unknown, meta: Metadata): Promise<CatalogResult> {
  try {
    const evidence: EvidenceRecord[] = [];
    function known<T extends EvidenceRecord['value']>(kind: 'product' | 'variant', subjectId: string, fieldPath: string, value: T): Fact<T> {
      const id = `storefront:${kind}:${subjectId.slice(subjectId.lastIndexOf('/') + 1)}:${fieldPath}`;
      evidence.push({...meta, id, subject: {kind, id: subjectId}, fieldPath, value});
      return {status: 'known', value, evidenceId: id};
    }
    function mapVariant(raw: z.infer<typeof variantSchema>): Variant {
      return {
        id: raw.id, productId: raw.product.id, title: raw.title,
        price: known('variant', raw.id, 'price', raw.price),
        availableForSale: known('variant', raw.id, 'availableForSale', raw.availableForSale),
        currentlyNotInStock: known('variant', raw.id, 'currentlyNotInStock', raw.currentlyNotInStock),
        quantityAvailable: raw.quantityAvailable === null ? {status: 'unknown', reason: 'missing'} :
          raw.quantityAvailable < 0 ? {status: 'unknown', reason: 'invalid'} : known('variant', raw.id, 'quantityAvailable', raw.quantityAvailable),
        quantityRule: known('variant', raw.id, 'quantityRule', raw.quantityRule),
      };
    }
    function mapProduct(raw: z.infer<typeof productInfo>, variants: Variant[], variantsComplete: boolean): Product {
      const material = raw.material;
      const fact: Fact<string> = material === null ? {status: 'unknown', reason: 'missing'} :
        (material.type === 'single_line_text_field' || material.type === 'multi_line_text_field') && material.value.length > 0 && material.value.length <= 1024
          ? known('product', raw.id, 'specifications.material', material.value) : {status: 'unknown', reason: 'invalid'};
      const url = CanonicalUrlSchema.safeParse(raw.onlineStoreUrl);
      return {
        id: raw.id, title: raw.title, description: raw.description,
        canonicalUrl: url.success ? url.data : null,
        specifications: [{key: 'material', label: 'Material', fact}], variants, variantsComplete,
      };
    }
    let products: Product[];
    let productsComplete = true;
    if (operation === 'search') {
      const parsed = searchSchema.safeParse(data);
      if (!parsed.success) return invalid();
      productsComplete = !parsed.data.search.pageInfo.hasNextPage;
      products = parsed.data.search.nodes.map(raw => mapProduct(raw, raw.variants.nodes.map(mapVariant), !raw.variants.pageInfo.hasNextPage));
    } else if (operation === 'product') {
      const parsed = lookupSchema.safeParse(data);
      if (!parsed.success) return invalid();
      const raw = parsed.data.product;
      if (raw === null) return {ok: false, error: 'not_found'};
      products = [mapProduct(raw, raw.variants.nodes.map(mapVariant), !raw.variants.pageInfo.hasNextPage)];
    } else {
      const parsed = nodesSchema.safeParse(data);
      if (!parsed.success) return invalid();
      const groups = new Map<string, {info: z.infer<typeof productInfo>; variants: Variant[]}>();
      for (const raw of parsed.data.nodes) {
        if (raw === null) return {ok: false, error: 'not_found'};
        const existing = groups.get(raw.product.id);
        // Zod reconstructs the selected fields in schema order before comparison.
        if (existing && JSON.stringify(existing.info) !== JSON.stringify(raw.product)) return invalid();
        const group = existing ?? {info: raw.product, variants: []};
        group.variants.push(mapVariant(raw));
        groups.set(raw.product.id, group);
      }
      products = [...groups.values()].map(group => mapProduct(group.info, group.variants, false));
    }
    const snapshot = await createEvidenceSnapshot({observation: {...meta, products, productsComplete}, evidence}, {now: meta.fetchedAt, maxAgeMs: 0});
    return snapshot.ok ? snapshot : invalid();
  } catch {return invalid();}
}
