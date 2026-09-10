import {fileURLToPath} from 'node:url';
import {reactRouter} from '@react-router/dev/vite';
import {hydrogen} from '@shopify/hydrogen/vite';
import {oxygen} from '@shopify/mini-oxygen/vite';
import {defineConfig} from 'vite';
import {fixtureTransport} from './scripts/vite-fixture-transport.ts';

export default defineConfig({
  plugins: [
    fixtureTransport(),
    hydrogen(),
    oxygen({
      env: {PROOF_CART_MODE: process.env.PROOF_CART_MODE ?? 'fixture'},
      // A non-null callback is required; null falls through to Oxygen's logger.
      logRequestLine: () => {},
    }),
    reactRouter(),
  ],
  // No process/.env values are exposed as import.meta.env client bindings.
  envPrefix: [],
  resolve: {
    alias: {'~': fileURLToPath(new URL('./app', import.meta.url))},
    tsconfigPaths: true,
  },
  build: {assetsInlineLimit: 0},
  ssr: {optimizeDeps: {include: ['react-router > set-cookie-parser', 'react-router > cookie', 'react-router']}},
  server: {host: '127.0.0.1', port: 4173, strictPort: true, cors: false},
  preview: {host: '127.0.0.1', port: 4173, strictPort: true, cors: false},
});
