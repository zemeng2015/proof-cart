import {data, Link} from 'react-router';
import type {Route} from './+types/catalog';
import {parseSelection, searchCatalog} from '../features/catalog/catalog-ui.server';
import {ProductCard, SearchForm, selectionUrl} from '../components/catalog/catalog';

export const meta: Route.MetaFunction = () => [{title: 'Search the catalog — Proof Cart'}];
export async function loader({request}: Route.LoaderArgs) {
  const params = new URL(request.url).searchParams;
  const selected = parseSelection(params.getAll('productId'));
  const query = params.get('q') ?? '';
  if (!selected || params.getAll('q').length > 1) return data({query: '', selected: [], result: {ok: false as const, message: 'Choose up to three different products and use a single search.', status: 400}}, {status: 400});
  const result = await searchCatalog(query);
  return data({query: query.length <= 256 ? query : '', selected, result}, {status: result.ok ? 200 : result.status});
}
export default function Catalog({loaderData}: Route.ComponentProps) {
  const {query, selected, result} = loaderData;
  const products = result.ok ? result.snapshots.flatMap(snapshot => snapshot.observation.products.map(product => ({product, snapshot}))) : [];
  return <section className="catalog-page"><div className="catalog-heading"><p className="eyebrow">Evidence-led discovery</p><h1>Find your next good choice.</h1><p>Review the facts. Keep up to three products side by side.</p><Link to={selectionUrl('/compare', selected)}>Your comparison ({selected.length}/3)</Link></div><SearchForm query={query} selected={selected} />
    {!result.ok ? <div className="notice" role="alert"><p>{result.message}</p><Link to="/catalog">Start a new search</Link></div> : !query.trim() ? <div className="empty-state"><h2>A little direction goes a long way.</h2><p>Enter a product name or try one of these searches.</p><nav className="search-suggestions" aria-label="Suggested searches">{['cup', 'bottle', 'bag', 'cotton'].map(term => <Link key={term} to={selectionUrl('/catalog', selected, term)}>{term}</Link>)}</nav></div> : <><p role="status">{products.length ? `${products.length} products found` : 'No products found. Try another search.'}</p><div className="product-grid">{products.map(({product, snapshot}) => <ProductCard key={product.id} product={product} snapshot={snapshot} selected={selected} />)}</div>{result.snapshots.some(snapshot => !snapshot.observation.productsComplete) && <p>More results may exist. Refine your search to narrow the selection.</p>}</>}
  </section>;
}
