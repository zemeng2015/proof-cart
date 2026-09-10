import {data, Link} from 'react-router';
import type {Route} from './+types/product';
import {parseSelection, readProducts} from '../features/catalog/catalog-ui.server';
import {ProductFacts, selectionUrl} from '../components/catalog/catalog';

export const meta: Route.MetaFunction = () => [{title: 'Product facts — Proof Cart'}];
export async function loader({request, params}: Route.LoaderArgs) {
  const selected = parseSelection(new URL(request.url).searchParams.getAll('productId'));
  const result = selected ? await readProducts([params.productId]) : {ok: false as const, status: 400, message: 'Choose up to three different products to compare.'};
  return data({selected: selected ?? [], result}, {status: result.ok ? 200 : result.status});
}
export default function ProductDetail({loaderData}: Route.ComponentProps) {
  const {selected, result} = loaderData;
  const snapshot = result.ok ? result.snapshots[0] : undefined;
  const product = snapshot?.observation.products[0];
  return <section className="catalog-page"><Link to={selectionUrl('/catalog', selected)}>← Back to search</Link>{!result.ok ? <div className="notice" role="alert"><h1>Product unavailable.</h1><p>{result.message}</p><Link to="/catalog">Start a new search</Link></div> : product && snapshot ? <><div className="catalog-heading"><p className="eyebrow">Synthetic product · facts & sources</p><h1>{product.title}</h1></div><div className="detail-grid"><div className="product-card"><ProductFacts product={product} snapshot={snapshot} /></div><aside className="description-panel"><h2>Catalog description</h2><p className="quiet-note">Supplied description. Claims here are not verified product facts.</p><p className="merchant-description">{product.description}</p><div className="selection-panel"><h2>Consider it side by side.</h2><p>Compare up to three products before making a choice.</p>{selected.includes(product.id) ? <p>This product is in your comparison.</p> : selected.length >= 3 ? <p>Three products selected. Remove one before adding another.</p> : <Link className="button-link" to={selectionUrl('/compare', [...selected, product.id])}>Compare {product.title}</Link>}<p><Link to={selectionUrl('/compare', selected)}>Your comparison ({selected.length}/3)</Link></p></div></aside></div></> : null}</section>;
}
