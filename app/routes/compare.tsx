import {data, Link, redirect, useFetcher} from 'react-router';
import {useEffect, useRef} from 'react';
import type {Route} from './+types/compare';
import {compareSubmission, readProducts} from '../features/catalog/catalog-ui.server';
import {ProductFacts, selectionUrl} from '../components/catalog/catalog';

export const meta: Route.MetaFunction = () => [{title: 'Compare products — Proof Cart'}];
export async function loader({request}: Route.LoaderArgs) {
  const result = await readProducts(new URL(request.url).searchParams.getAll('productId'));
  return data(result, {status: result.ok ? 200 : result.status});
}
export async function action({request}: Route.ActionArgs) {
  let form: FormData;
  try {form = await request.formData();} catch {return data({message: 'The comparison could not be updated. Please try again.'}, {status: 400});}
  const result = await compareSubmission(form);
  if (!result.ok) return data({message: result.message}, {status: result.status});
  return redirect(selectionUrl('/compare', result.selection ?? []));
}
export default function Compare({loaderData}: Route.ComponentProps) {
  const fetcher = useFetcher<typeof action>();
  const status = useRef<HTMLParagraphElement>(null);
  const wasPending = useRef(false);
  useEffect(() => {
    if (fetcher.state !== 'idle') wasPending.current = true;
    else if (wasPending.current) {status.current?.focus(); wasPending.current = false;}
  }, [fetcher.state]);
  const selected = loaderData.ok ? loaderData.snapshots.flatMap(snapshot => snapshot.observation.products.map(product => product.id)) : [];
  return <section className="catalog-page"><div className="catalog-heading"><p className="eyebrow">A clear view, side by side</p><h1>Your comparison.</h1><p>Every known fact has a source. Missing information stays unknown.</p><Link to={selectionUrl('/catalog', selected)}>← Find another product ({selected.length}/3 selected)</Link></div>
    <p role="status" ref={status} tabIndex={-1}>{fetcher.state !== 'idle' ? 'Updating your comparison…' : `${selected.length} of 3 products selected`}</p>{fetcher.data && <p role="alert" className="notice">{fetcher.data.message}</p>}
    {!loaderData.ok ? <div role="alert" className="notice"><p>{loaderData.message}</p><Link to="/catalog">Start a new search</Link></div> : selected.length === 0 ? <div className="empty-state"><h2>Give your choices some perspective.</h2><p>Search for a product, open its facts, and add it here.</p><Link className="button-link" to="/catalog">Find products</Link></div> : <fetcher.Form method="post" action="/compare" aria-label="Your comparison" aria-busy={fetcher.state !== 'idle'}>{selected.map(id => <input type="hidden" name="productId" value={id} key={id} />)}<div className="compare-grid">{loaderData.snapshots.map(snapshot => snapshot.observation.products.map(product => <article className="product-card" key={product.id}><h2><Link to={selectionUrl(`/products/${encodeURIComponent(product.id)}`, selected)}>{product.title}</Link></h2><button className="remove-button" type="submit" name="remove" value={product.id} disabled={fetcher.state !== 'idle'}>Remove {product.title}</button><ProductFacts product={product} snapshot={snapshot} /></article>))}</div></fetcher.Form>}
    <p className="quiet-note">Synthetic fixture preview. Cart actions and checkout are not available.</p>
  </section>;
}
