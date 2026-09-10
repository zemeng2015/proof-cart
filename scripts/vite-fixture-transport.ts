import type {Plugin} from 'vite';
import {createRequestBodyBridge} from './request-body-bridge.ts';

export function fixtureTransport(): Plugin {
  return {
    name: 'proof-cart:fixture-transport',
    enforce: 'pre',
    configureServer: {
      order: 'pre',
      handler(server) {server.middlewares.use(createRequestBodyBridge(server.middlewares));},
    },
    configurePreviewServer: {
      order: 'pre',
      handler(server) {server.middlewares.use(createRequestBodyBridge(server.middlewares));},
    },
  };
}
