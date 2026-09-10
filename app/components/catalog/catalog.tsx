import {Form, Link, useNavigation} from 'react-router';
import type {ReactNode} from 'react';
import type {Fact, Product} from '../../features/catalog/domain';
import type {CatalogSnapshot} from '../../features/catalog/evidence';

export function selectionUrl(path: string, selected: readonly string[], query?: string) {
  const params = new URLSearchParams();
  selected.forEach(id => params.append('productId', id));
  if (query) params.set('q', query);
  return `${path}${params.size ? `?${params}` : ''}`;
}
export function SearchForm({query = '', selected = []}: {query?: string; selected?: readonly string[]}) {
  const navigation = useNavigation();
  return <Form action="/catalog" method="get" className="search-form" role="search">
    {selected.map(id => <input key={id} type="hidden" name="productId" value={id} />)}
    <label htmlFor="catalog-query">Find something considered</label>
    <div className="search-input-row"><input key={query} id="catalog-query" name="q" type="search" defaultValue={query} maxLength={256} placeholder="Try cup, bottle, or bag" /><button className="button-link" type="submit">Search</button></div>
    <p role="status" className="quiet-note">{navigation.state !== 'idle' ? 'Loading product facts…' : 'Synthetic products for exploration. Nothing here can be purchased.'}</p>
  </Form>;
}
export function FactView<T>({label, fact, snapshot, format}: {label: string; fact: Fact<T>; snapshot: CatalogSnapshot; format: (value: T) => ReactNode}) {
  const evidence = fact.status === 'known' ? snapshot.evidence.find(record => record.id === fact.evidenceId) : undefined;
  return <div className="fact"><dt>{label}</dt><dd>{fact.status === 'known' && evidence ? <><span>{format(fact.value)}</span><details className="evidence"><summary>Evidence for {label.toLowerCase()}</summary><dl><div><dt>Source</dt><dd>{evidence.source.kind === 'fixture' ? `Synthetic fixture · ${evidence.source.dataset} · ${evidence.source.version}` : evidence.source.merchant}</dd></div><div><dt>Retrieved</dt><dd><time dateTime={new Date(evidence.fetchedAt).toISOString()}>{new Date(evidence.fetchedAt).toISOString()}</time></dd></div><div><dt>Field</dt><dd>{evidence.fieldPath}</dd></div><div><dt>Subject</dt><dd>{evidence.subject.id}</dd></div><div><dt>Evidence ID</dt><dd>{evidence.id}</dd></div></dl></details></> : <span className="unknown">Unknown · {fact.status === 'unknown' ? fact.reason.replace('_', ' ') : 'evidence unavailable'}</span>}</dd></div>;
}
export function ProductFacts({product, snapshot}: {product: Product; snapshot: CatalogSnapshot}) {
  return <><dl className="product-facts">{product.specifications.map(spec => <FactView key={spec.key} label={spec.label} fact={spec.fact} snapshot={snapshot} format={value => value} />)}</dl>
    {product.variants.map(variant => <section className="variant" key={variant.id} aria-label={`${variant.title} variant`}><h3>{variant.title}</h3><dl className="product-facts">
      <FactView label="Price" fact={variant.price} snapshot={snapshot} format={value => `${value.currencyCode} ${value.amount}`} />
      <FactView label="Availability" fact={variant.availableForSale} snapshot={snapshot} format={value => value ? 'Available for sale' : 'Unavailable'} />
      <FactView label="Inventory" fact={variant.quantityAvailable} snapshot={snapshot} format={value => `${value} units reported`} />
      <FactView label="Backorder" fact={variant.currentlyNotInStock} snapshot={snapshot} format={value => value ? 'Marked as backordered' : 'Not marked as backordered'} />
      <FactView label="Quantity rule" fact={variant.quantityRule} snapshot={snapshot} format={value => `Minimum ${value.minimum} · increments of ${value.increment} · maximum ${value.maximum === null ? 'not specified' : value.maximum}`} />
    </dl></section>)}{!product.variantsComplete && <p>More variants may exist. Only the retrieved variants are shown.</p>}</>;
}
export function ProductCard({product, snapshot, selected}: {product: Product; snapshot: CatalogSnapshot; selected: readonly string[]}) {
  const included = selected.includes(product.id);
  return <article className="product-card"><p className="eyebrow">Synthetic catalog</p><h2><Link to={selectionUrl(`/products/${encodeURIComponent(product.id)}`, selected)}>{product.title}</Link></h2><ProductFacts product={product} snapshot={snapshot} />
    {included ? <p className="selection-note">Selected for comparison</p> : selected.length >= 3 ? <p className="selection-note">Three products selected. Remove one to add another.</p> : <Link className="secondary-button" to={selectionUrl('/compare', [...selected, product.id])}>Compare {product.title}</Link>}
  </article>;
}
