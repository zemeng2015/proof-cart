import type {IncomingMessage, ServerResponse} from 'node:http';
import type {Plugin} from 'vite';

function configureFixtureConnection(request: IncomingMessage, _response: ServerResponse, next: () => void): void {
  const hasBody = Number(request.headers['content-length'] ?? 0) > 0 || request.headers['transfer-encoding'] !== undefined;
  if (hasBody) {
    // Mini Oxygen 4 / Miniflare 3 can reset a reused connection when the worker
    // rejects an incoming stream before consuming it. Configure only the local
    // bridge's body-bearing requests; never retry or buffer a rejected payload.
    request.headers.connection = 'close';
    delete request.headers['keep-alive'];
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      // The worker always rejects these methods. Mini Oxygen's current bridge
      // omits chunked bodies but forwards this hop-by-hop header to Undici,
      // which rejects it before the worker can return 405. Discard it only on
      // this reject-only path. Remove this workaround and prove complete body
      // forwarding before enabling any action or other accepted request body.
      delete request.headers['transfer-encoding'];
    }
  }
  next();
}

export function fixtureTransport(): Plugin {
  return {
    name: 'proof-cart:fixture-transport',
    enforce: 'pre',
    configureServer: {
      order: 'pre',
      handler(server) {server.middlewares.use(configureFixtureConnection);},
    },
    configurePreviewServer: {
      order: 'pre',
      handler(server) {server.middlewares.use(configureFixtureConnection);},
    },
  };
}
