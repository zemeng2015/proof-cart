import type {z} from 'zod';
import type {CatalogContextSchema, CatalogObservationSchema, ProductSchema, QuantityRuleSchema, SourceSchema, VariantSchema} from './schemas';

export type {CurrencyCode, Money} from './money';
export type CatalogSource = z.infer<typeof SourceSchema>;
export type CatalogContext = z.infer<typeof CatalogContextSchema>;
export type CatalogObservation = z.infer<typeof CatalogObservationSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type Variant = z.infer<typeof VariantSchema>;
export type QuantityRule = z.infer<typeof QuantityRuleSchema>;
export type Fact<T> = Readonly<{status: 'known'; value: T; evidenceId: string}> |
  Readonly<{status: 'unknown'; reason: 'missing' | 'not_requested' | 'restricted' | 'invalid'}>;
