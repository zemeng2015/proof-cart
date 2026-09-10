import {oxygen} from '@shopify/mini-oxygen/vite';
import {defineConfig} from 'vite';
import {fixtureTransport} from '../../scripts/vite-fixture-transport.ts';

export default defineConfig({
  plugins: [fixtureTransport(), oxygen({
    entry: './tests/runtime/body-worker.mjs',
    previewEntry: './tests/runtime/body-worker.mjs',
    env: {},
    logRequestLine: () => {},
  })],
  envPrefix: [],
  // Preview needs an existing assets directory; this harness never builds or
  // publishes the test worker into the application's output directory.
  build: {outDir: 'tests/runtime'},
  server: {host: '127.0.0.1', strictPort: true, cors: false},
  preview: {host: '127.0.0.1', strictPort: true, cors: false},
});
