import type {CatalogContext, Product} from './domain';
import {createEvidenceSnapshot, type EvidenceRecord} from './evidence';
import {FIXTURE_CONTEXT, FIXTURE_PRODUCTS, FIXTURE_SOURCE} from './fixture-data';
import {createCatalogPort, type CatalogAdapter, type CatalogResult, type CommerceCatalogPort} from './port';

const compareText = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;
const sortedProducts = [...FIXTURE_PRODUCTS].sort((left, right) =>
  compareText(left.title, right.title) || compareText(left.id, right.id));
const providerError = () => ({ok: false as const, error: 'provider_error' as const});
const notFound = () => ({ok: false as const, error: 'not_found' as const});
function supported(context: CatalogContext): boolean {
  return context.market === FIXTURE_CONTEXT.market && context.country === FIXTURE_CONTEXT.country && context.language === FIXTURE_CONTEXT.language;
}

class FixtureCatalogAdapter implements CatalogAdapter {
  constructor(private readonly now: () => number, private readonly maxAgeMs: number) {}

  private async snapshot(products: readonly Product[], productsComplete: boolean): Promise<CatalogResult> {
    const fetchedAt = this.now();
    if (!Number.isSafeInteger(fetchedAt) || fetchedAt < 0 || !Number.isSafeInteger(this.maxAgeMs) || this.maxAgeMs < 0) return providerError();
    const provenance = {source: FIXTURE_SOURCE, context: FIXTURE_CONTEXT, fetchedAt};
    const evidence: EvidenceRecord[] = [];
    for (const product of products) {
      for (const specification of product.specifications) {
        if (specification.fact.status === 'known') evidence.push({
          ...provenance, id: specification.fact.evidenceId,
          subject: {kind: 'product', id: product.id},
          fieldPath: `specifications.${specification.key}`, value: specification.fact.value,
        });
      }
      for (const variant of product.variants) {
        for (const fieldPath of ['price', 'availableForSale', 'currentlyNotInStock', 'quantityAvailable', 'quantityRule'] as const) {
          const fact = variant[fieldPath];
          if (fact.status === 'known') evidence.push({
            ...provenance, id: fact.evidenceId, subject: {kind: 'variant', id: variant.id},
            fieldPath, value: fact.value,
          });
        }
      }
    }
    const snapshot = await createEvidenceSnapshot({
      observation: {...provenance, products, productsComplete}, evidence,
    }, {now: fetchedAt, maxAgeMs: this.maxAgeMs});
    return snapshot.ok ? snapshot : providerError();
  }

  async search(input: Parameters<CommerceCatalogPort['search']>[0]): Promise<CatalogResult> {
    if (!supported(input.context)) return providerError();
    const tokens = input.query.toLowerCase().split(/\s+/);
    const matches = sortedProducts.filter(product => {
      const searchable = [product.title, ...product.specifications.flatMap(specification =>
        specification.fact.status === 'known' ? [specification.fact.value] : [])].join(' ').toLowerCase();
      return tokens.every(token => searchable.includes(token));
    });
    return this.snapshot(matches.slice(0, input.limit), matches.length <= input.limit);
  }

  async getProduct(input: Parameters<CommerceCatalogPort['getProduct']>[0]): Promise<CatalogResult> {
    if (!supported(input.context)) return providerError();
    const product = sortedProducts.find(product => product.id === input.productId);
    return product ? this.snapshot([product], true) : notFound();
  }

  async getVariants(input: Parameters<CommerceCatalogPort['getVariants']>[0]): Promise<CatalogResult> {
    if (!supported(input.context)) return providerError();
    const wanted = new Set(input.variantIds);
    const products = sortedProducts.flatMap(product => {
      const variants = product.variants.filter(variant => wanted.has(variant.id));
      return variants.length ? [{...product, variants, variantsComplete: variants.length === product.variants.length}] : [];
    });
    if (products.reduce((count, product) => count + product.variants.length, 0) !== wanted.size) return notFound();
    return this.snapshot(products, true);
  }
}

/** Trusted configuration only. No credentials, transports, or write capabilities. */
export function createFixtureCatalog(options: {now: () => number; maxAgeMs?: number}): CommerceCatalogPort {
  const {now, maxAgeMs = 60_000} = options;
  return createCatalogPort(new FixtureCatalogAdapter(now, maxAgeMs), FIXTURE_SOURCE,
    () => ({now: now(), maxAgeMs}));
}
