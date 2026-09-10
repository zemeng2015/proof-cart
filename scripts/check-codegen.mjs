import {readFile} from 'node:fs/promises';
import {generate} from '@graphql-codegen/cli';
import config from '../codegen.ts';

const target = new URL('../app/features/catalog/storefront.generated.d.ts', import.meta.url);
const before = await readFile(target, 'utf8');
await generate(config, true);
const after = await readFile(target, 'utf8');
if (before !== after) {
  throw new Error('Storefront generated types changed. Run npm run codegen and commit the regenerated file.');
}
console.log('Storefront generated types match the pinned local schema and queries.');
