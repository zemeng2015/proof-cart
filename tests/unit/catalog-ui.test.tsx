import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createMemoryRouter, RouterProvider} from 'react-router';
import {describe, expect, it, vi} from 'vitest';
import {compareSubmission, parseSelection, readProducts, searchCatalog} from '../../app/features/catalog/catalog-ui.server';
import {createFixtureCatalog} from '../../app/features/catalog/fixture-adapter';
import {FIXTURE_CONTEXT} from '../../app/features/catalog/fixture-data';
import type {CommerceCatalogPort} from '../../app/features/catalog/port';
import {FactView, ProductCard, ProductFacts, SearchForm, selectionUrl} from '../../app/components/catalog/catalog';

const id = (name: string) => `fixture:product:${name}`;
const catalog = createFixtureCatalog({now: () => 1000});
async function snapshot(name = 'ceramic-cup') {
  const result = await catalog.getProduct({context: FIXTURE_CONTEXT, productId: id(name)});
  if (!result.ok) throw new Error('Expected fixture');
  return result.value;
}
function failing(error: 'not_found' | 'timeout' | 'provider_error' = 'provider_error'): CommerceCatalogPort {
  return {search: vi.fn().mockResolvedValue({ok: false, error}), getProduct: vi.fn().mockResolvedValue({ok: false, error}), getVariants: vi.fn().mockResolvedValue({ok: false, error})};
}
function router(element: React.ReactNode) {return render(<RouterProvider router={createMemoryRouter([{path: '*', element}])} />);}
describe('catalog UI read services', () => {
  it('accepts empty through three unique IDs and rejects malformed, duplicate, file and over-limit selection', () => {
    expect(parseSelection([])).toEqual([]);
    expect(parseSelection([id('a'), id('b'), id('c')])).toHaveLength(3);
    for (const values of [[id('a'), id('a')], [id('a'), id('b'), id('c'), id('d')], ['SECRET <script>'], [new File(['x'], 'x')]]) expect(parseSelection(values)).toBeNull();
  });
  it('does not call the catalog for empty or invalid search', async () => {
    const port = failing();
    expect(await searchCatalog('   ', port)).toEqual({ok: true, snapshots: []});
    expect(await searchCatalog('x'.repeat(257), port)).toMatchObject({ok: false, status: 400});
    expect(port.search).not.toHaveBeenCalled();
  });
  it('returns genuine search results and empty results', async () => {
    expect(await searchCatalog('cup', catalog)).toMatchObject({ok: true, snapshots: [{observation: {products: [{id: id('ceramic-cup')}]}}]});
    expect(await searchCatalog('no-match-xyz', catalog)).toMatchObject({ok: true, snapshots: [{observation: {products: []}}]});
    expect((await searchCatalog('cup')).ok).toBe(true);
  });
  it('keeps failures opaque for searches and product reads, including thrown exceptions', async () => {
    expect(await searchCatalog('cup', failing('timeout'))).toMatchObject({ok: false, status: 503});
    expect(await readProducts([id('x')], failing('not_found'))).toMatchObject({ok: false, status: 404});
    expect(await readProducts([id('x')], failing())).toMatchObject({ok: false, status: 503});
    const port = failing();
    vi.mocked(port.search).mockRejectedValue(new Error('SECRET'));
    vi.mocked(port.getProduct).mockRejectedValue(new Error('SECRET'));
    for (const result of [await searchCatalog('cup', port), await readProducts([id('x')], port)]) {
      expect(result).toMatchObject({ok: false, status: 503});
      expect(JSON.stringify(result)).not.toContain('SECRET');
    }
  });
  it('retains requested product order and rejects invalid selection before reads', async () => {
    const result = await readProducts([id('canvas-bag'), id('ceramic-cup')], catalog);
    expect(result.ok && result.snapshots.map(value => value.observation.products[0]?.id)).toEqual([id('canvas-bag'), id('ceramic-cup')]);
    const port = failing();
    expect(await readProducts(['invalid'], port)).toMatchObject({ok: false, status: 400});
    expect(port.getProduct).not.toHaveBeenCalled();
  });
  it('validates removal and refreshes only remaining products', async () => {
    const form = new FormData();
    form.append('productId', id('ceramic-cup')); form.append('productId', id('canvas-bag')); form.append('remove', id('ceramic-cup'));
    expect(await compareSubmission(form, catalog)).toMatchObject({ok: true, selection: [id('canvas-bag')]});
    form.delete('remove');
    expect(await compareSubmission(form, catalog)).toMatchObject({ok: true, selection: [id('ceramic-cup'), id('canvas-bag')]});
    expect(await compareSubmission(new FormData())).toMatchObject({ok: true, selection: []});
  });
  it('rejects unknown fields, foreign removals, duplicate removes, files and duplicate products', async () => {
    const forms = [new URLSearchParams('extra=secret'), new URLSearchParams({remove: id('x')}), new URLSearchParams([['remove', id('a')], ['remove', id('a')]]), new URLSearchParams([['productId', id('a')], ['productId', id('a')]])];
    for (const params of forms) {
      const form = new FormData(); params.forEach((value, key) => form.append(key, value));
      expect(await compareSubmission(form, catalog)).toMatchObject({ok: false, status: 400});
    }
    const form = new FormData(); form.append('remove', new File(['x'], 'x'));
    expect(await compareSubmission(form, catalog)).toMatchObject({ok: false, status: 400});
  });
});
describe('fact components', () => {
  it('preserves fractional price exactly and exposes source, time, field and evidence ID with keyboard', async () => {
    const value = await snapshot(); const product = value.observation.products[0]!;
    render(<ProductFacts product={product} snapshot={value} />);
    const blue = within(screen.getByRole('region', {name: 'Blue variant'}));
    expect(blue.getByText('USD 19.999')).toBeVisible();
    const disclosure = blue.getByText('Evidence for price');
    disclosure.focus(); await userEvent.keyboard('{Enter}');
    // jsdom does not implement keyboard activation of details; disclosure content is verified through its native semantic container.
    expect(disclosure.closest('details')).toHaveTextContent('proof-cart-demo:v1:variant:cup-blue:price');
    expect(disclosure.closest('details')).toHaveTextContent('1970-01-01T00:00:01.000Z');
  });
  it('shows unknown facts and fails closed when known fact has no matching evidence', async () => {
    const value = await snapshot('price-unknown');
    render(<ProductFacts product={value.observation.products[0]!} snapshot={value} />);
    expect(screen.getAllByText('Unknown · missing').length).toBeGreaterThan(1);
    expect(screen.queryByText(/^USD/)).not.toBeInTheDocument();
    render(<dl><FactView label="Unsupported" fact={{status: 'known', evidenceId: 'absent', value: 'FORGED'}} snapshot={value} format={text => text} /></dl>);
    expect(screen.getByText('Unknown · evidence unavailable')).toBeVisible();
    expect(screen.queryByText('FORGED')).not.toBeInTheDocument();
  });
  it('links products and enforces the comparison cap without hiding existing selection', async () => {
    const value = await snapshot(); const product = value.observation.products[0]!;
    const first = router(<ProductCard product={product} snapshot={value} selected={[]} />);
    expect(screen.getByRole('link', {name: 'Compare Ceramic Cup'})).toHaveAttribute('href', selectionUrl('/compare', [product.id]));
    first.unmount();
    const second = router(<ProductCard product={product} snapshot={value} selected={[product.id]} />);
    expect(screen.getByText('Selected for comparison')).toBeVisible(); second.unmount();
    router(<ProductCard product={product} snapshot={value} selected={[id('a'), id('b'), id('c')]} />);
    expect(screen.getByText(/Three products selected/)).toBeVisible();
    expect(screen.queryByRole('link', {name: 'Compare Ceramic Cup'})).not.toBeInTheDocument();
  });
  it('renders a labeled search and preserves comparison query parameters', () => {
    router(<SearchForm selected={[id('a')]} query="cup" />);
    expect(screen.getByRole('searchbox', {name: 'Find something considered'})).toHaveValue('cup');
    expect(selectionUrl('/catalog', [id('a')], 'cup')).toBe('/catalog?productId=fixture%3Aproduct%3Aa&q=cup');
    expect(selectionUrl('/catalog', [])).toBe('/catalog');
  });
});
