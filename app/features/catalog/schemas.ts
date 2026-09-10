import {z} from 'zod';
import {parseMoney} from './money';

const token = z.string().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/);
export const EvidenceIdSchema = token;
export const ProductIdSchema = z.string().max(160).regex(/^(?:fixture:product:[a-z0-9][a-z0-9-]*|gid:\/\/shopify\/Product\/[1-9][0-9]*)$/);
export const VariantIdSchema = z.string().max(160).regex(/^(?:fixture:variant:[a-z0-9][a-z0-9-]*|gid:\/\/shopify\/ProductVariant\/[1-9][0-9]*)$/);
export const MoneySchema = z.unknown().transform((input, context) => {
  const result = parseMoney(input);
  if (result.ok) return result.value;
  context.addIssue({code: 'custom', message: result.error});
  return z.NEVER;
});

const UnknownSchema = z.strictObject({
  status: z.literal('unknown'),
  reason: z.enum(['missing', 'not_requested', 'restricted', 'invalid']),
}).readonly();

export function factSchema<T extends z.ZodType>(value: T) {
  return z.discriminatedUnion('status', [
    z.strictObject({status: z.literal('known'), value, evidenceId: EvidenceIdSchema}).readonly(),
    UnknownSchema,
  ]);
}

export const QuantityRuleSchema = z.strictObject({
  minimum: z.int().min(1).max(2147483647),
  maximum: z.int().min(1).max(2147483647).nullable(),
  increment: z.int().min(1).max(2147483647),
}).refine(rule => rule.minimum % rule.increment === 0 && (rule.maximum === null ||
  (rule.maximum >= rule.minimum && rule.maximum % rule.increment === 0)), {message: 'invalid_quantity_rule'}).readonly();

export const SourceSchema = z.discriminatedUnion('kind', [
  z.strictObject({kind: z.literal('fixture'), dataset: token, version: token}).readonly(),
  z.strictObject({
    kind: z.literal('storefront'),
    merchant: z.string().max(253).regex(/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/),
    apiVersion: z.string().regex(/^20[0-9]{2}-(?:01|04|07|10)$/),
  }).readonly(),
]);

export const CatalogContextSchema = z.strictObject({
  market: token,
  country: z.string().regex(/^[A-Z]{2}$/),
  language: z.string().min(2).max(16).regex(/^[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8})?$/),
}).readonly();

export const CanonicalUrlSchema = z.string().max(2048).refine(value => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && !url.search && !url.hash;
  } catch {return false;}
}, {message: 'invalid_canonical_url'});

export const VariantSchema = z.strictObject({
  id: VariantIdSchema,
  productId: ProductIdSchema,
  title: z.string().min(1).max(256),
  price: factSchema(MoneySchema),
  availableForSale: factSchema(z.boolean()),
  currentlyNotInStock: factSchema(z.boolean()),
  quantityAvailable: factSchema(z.int().min(0).max(2147483647)),
  quantityRule: factSchema(QuantityRuleSchema),
}).readonly();

const SpecificationSchema = z.strictObject({
  key: token,
  label: z.string().min(1).max(128),
  fact: factSchema(z.string().min(1).max(1024)),
}).readonly();

export const ProductSchema = z.strictObject({
  id: ProductIdSchema,
  title: z.string().min(1).max(256),
  description: z.string().max(8192),
  canonicalUrl: CanonicalUrlSchema.nullable(),
  specifications: z.array(SpecificationSchema).max(32).readonly(),
  variants: z.array(VariantSchema).max(20).readonly(),
  variantsComplete: z.boolean(),
}).superRefine((product, context) => {
  const variantIds = new Set<string>();
  for (const variant of product.variants) {
    if (variant.productId !== product.id || variantIds.has(variant.id)) context.addIssue({code: 'custom', message: 'invalid_variant_ownership'});
    variantIds.add(variant.id);
  }
  const keys = new Set<string>();
  for (const specification of product.specifications) {
    if (keys.has(specification.key)) context.addIssue({code: 'custom', message: 'duplicate_specification'});
    keys.add(specification.key);
  }
}).readonly();

// Structural input only: evidence existence, exact binding, hash, and freshness
// require the ledger validator. Never treat successful parsing as provenance.
export const CatalogObservationSchema = z.strictObject({
  source: SourceSchema,
  context: CatalogContextSchema,
  fetchedAt: z.int().min(0).max(Number.MAX_SAFE_INTEGER),
  products: z.array(ProductSchema).max(20).readonly(),
  productsComplete: z.boolean(),
}).superRefine((observation, context) => {
  const products = new Set<string>();
  const variants = new Set<string>();
  for (const product of observation.products) {
    const isFixture = observation.source.kind === 'fixture';
    if (product.id.startsWith('fixture:') !== isFixture || products.has(product.id)) context.addIssue({code: 'custom', message: 'invalid_product_identity'});
    products.add(product.id);
    for (const variant of product.variants) {
      if (variant.id.startsWith('fixture:') !== isFixture || variants.has(variant.id)) context.addIssue({code: 'custom', message: 'invalid_variant_identity'});
      variants.add(variant.id);
    }
  }
}).readonly();

export function parseCatalogObservation(input: unknown) {
  try {
    const result = CatalogObservationSchema.safeParse(input);
    return result.success ? {ok: true as const, value: result.data} : {ok: false as const, error: 'invalid_response' as const};
  } catch {return {ok: false as const, error: 'invalid_response' as const};}
}
