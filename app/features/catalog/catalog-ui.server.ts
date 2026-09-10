import {createFixtureCatalog} from './fixture-adapter';
import {FIXTURE_CONTEXT} from './fixture-data';
import type {CatalogSnapshot} from './evidence';
import type {CommerceCatalogPort} from './port';
import {ProductIdSchema} from './schemas';

export type CatalogView = {ok: true; snapshots: CatalogSnapshot[]} | {ok: false; message: string; status: number};
const invalid = (): CatalogView => ({ok: false, message: 'Choose up to three different products to compare.', status: 400});
export function parseSelection(values: readonly unknown[]): string[] | null {
  if (values.length > 3 || new Set(values).size !== values.length || values.some(value => !ProductIdSchema.safeParse(value).success)) return null;
  return values as string[];
}
export function fixtureCatalog() {return createFixtureCatalog({now: Date.now});}
export async function readProducts(values: readonly unknown[], catalog: CommerceCatalogPort = fixtureCatalog()): Promise<CatalogView> {
  const ids = parseSelection(values);
  if (!ids) return invalid();
  try {
    const results = await Promise.all(ids.map(productId => catalog.getProduct({productId, context: FIXTURE_CONTEXT})));
    const failed = results.find(result => !result.ok);
    if (failed && !failed.ok) return {ok: false, message: failed.error === 'not_found' ? 'A selected product could not be found. Start a new search.' : 'Product facts could not be loaded. Please try again.', status: failed.error === 'not_found' ? 404 : 503};
    return {ok: true, snapshots: results.flatMap(result => result.ok ? [result.value] : [])};
  } catch {return {ok: false, message: 'Product facts could not be loaded. Please try again.', status: 503};}
}
export async function searchCatalog(query: string, catalog: CommerceCatalogPort = fixtureCatalog()): Promise<CatalogView> {
  if (query.length > 256) return {ok: false, message: 'Use a search of 256 characters or fewer.', status: 400};
  if (!query.trim()) return {ok: true, snapshots: []};
  try {
    const result = await catalog.search({query, limit: 20, context: FIXTURE_CONTEXT});
    return result.ok ? {ok: true, snapshots: [result.value]} : {ok: false, message: 'Search is unavailable. Please try again.', status: 503};
  } catch {return {ok: false, message: 'Search is unavailable. Please try again.', status: 503};}
}
export async function compareSubmission(form: FormData, catalog: CommerceCatalogPort = fixtureCatalog()): Promise<CatalogView & {selection?: string[]}> {
  if ([...form.keys()].some(key => key !== 'productId' && key !== 'remove')) return invalid();
  const ids = parseSelection(form.getAll('productId'));
  const remove = form.getAll('remove');
  if (!ids || remove.length > 1 || (remove.length === 1 && (typeof remove[0] !== 'string' || !ids.includes(remove[0])))) return invalid();
  const selection = ids.filter(id => id !== remove[0]);
  return {...await readProducts(selection, catalog), selection};
}
