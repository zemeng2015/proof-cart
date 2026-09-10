import {parse} from 'graphql';
import {expect, it} from 'vitest';
import {STOREFRONT_PRODUCT, STOREFRONT_SEARCH, STOREFRONT_VARIANTS} from '../../../app/features/catalog/storefront-queries';

it('keeps the catalog operation registry read-only with exactly one named query per document', () => {
  for (const query of [STOREFRONT_SEARCH, STOREFRONT_PRODUCT, STOREFRONT_VARIANTS]) {
    const operations = parse(query).definitions.filter(node => node.kind === 'OperationDefinition');
    expect(operations).toHaveLength(1);
    expect(operations[0]!.operation).toBe('query');
    expect(operations[0]!.name?.value).toMatch(/^Pc/);
  }
});
