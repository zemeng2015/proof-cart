import type {CodegenConfig} from '@graphql-codegen/cli';
import {getSchema, pluckConfig, preset} from '@shopify/hydrogen-codegen';

export default {
  overwrite: true,
  pluckConfig,
  generates: {
    './app/features/catalog/storefront.generated.d.ts': {
      preset,
      schema: getSchema('storefront'),
      documents: ['./app/features/catalog/storefront-queries.ts'],
    },
  },
} satisfies Omit<CodegenConfig, 'pluckConfig'> & {pluckConfig: typeof pluckConfig};
