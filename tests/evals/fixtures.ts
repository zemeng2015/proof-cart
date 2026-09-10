import {createFixtureCatalog} from '../../app/features/catalog/fixture-adapter';
import {FIXTURE_CONTEXT, FIXTURE_PRODUCTS, FIXTURE_SOURCE} from '../../app/features/catalog/fixture-data';
import {createEvidenceSnapshot, type CatalogSnapshot} from '../../app/features/catalog/evidence';
import type {CommerceCatalogPort} from '../../app/features/catalog/port';

export const NOW = 1_000_000;
export const fixture = () => createFixtureCatalog({now: () => NOW});
export const dependencies = (catalog: CommerceCatalogPort = fixture()) => ({catalog, source: FIXTURE_SOURCE, context: FIXTURE_CONTEXT, now: () => NOW});
export async function productSnapshot(name = 'ceramic-cup') {
  const result = await fixture().getProduct({productId: `fixture:product:${name}`, context: FIXTURE_CONTEXT});
  if (!result.ok) throw new Error('Evaluation fixture could not be constructed');
  return result.value;
}
/** Test double deliberately bypasses CommerceCatalogPort's validator to test the planner boundary. */
export function returning(value: CatalogSnapshot): CommerceCatalogPort {
  return {search: async () => ({ok: true, value}), getProduct: async () => ({ok: true, value}), getVariants: async () => ({ok: true, value})};
}
export async function allProducts(): Promise<CommerceCatalogPort> {
  const catalog = fixture();
  const results = await Promise.all(FIXTURE_PRODUCTS.map(product => catalog.getProduct({productId: product.id, context: FIXTURE_CONTEXT})));
  const snapshots = results.map(result => {if (!result.ok) throw new Error('Evaluation fixture unavailable'); return result.value;});
  const base = snapshots[0]!;
  const result = await createEvidenceSnapshot({observation: {...base.observation, products: snapshots.flatMap(value => value.observation.products)}, evidence: snapshots.flatMap(value => value.evidence)}, {now: NOW, maxAgeMs: 60_000});
  if (!result.ok) throw new Error('Combined evaluation fixture invalid');
  return returning(result.value);
}
export async function changedSnapshot(change: 'source' | 'context' | 'stale'): Promise<CatalogSnapshot> {
  const base = await productSnapshot();
  const source = change === 'source' ? {...base.observation.source, dataset: 'foreign-evaluation'} : base.observation.source;
  const context = change === 'context' ? {...base.observation.context, country: 'CA'} : base.observation.context;
  const fetchedAt = change === 'stale' ? 0 : NOW;
  const result = await createEvidenceSnapshot({observation: {...base.observation, source, context, fetchedAt}, evidence: base.evidence.map(record => ({...record, source, context, fetchedAt}))}, {now: fetchedAt, maxAgeMs: 60_000});
  if (!result.ok) throw new Error('Changed evaluation fixture invalid');
  return result.value;
}
