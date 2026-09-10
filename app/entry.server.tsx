import {ServerRouter, type EntryContext} from 'react-router';
import {renderToReadableStream} from 'react-dom/server';
import {createContentSecurityPolicy} from '@shopify/hydrogen';
import {createFixtureCsp} from './lib/csp.server';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
): Promise<Response> {
  const {nonce, NonceProvider} = createContentSecurityPolicy();
  const header = createFixtureCsp(nonce, import.meta.env.DEV);
  const body = await renderToReadableStream(
    <NonceProvider>
      <ServerRouter context={routerContext} url={request.url} nonce={nonce} />
    </NonceProvider>,
    {
      nonce,
      signal: request.signal,
      onError() {
        responseStatusCode = 500;
        console.error('Server rendering failed.');
      },
    },
  );
  // The small fixture shell has no deferred data. Finish rendering before headers
  // so a render failure retains its HTTP error status, including non-bot clients.
  await body.allReady;
  responseHeaders.set('Content-Type', 'text/html; charset=utf-8');
  responseHeaders.set('Content-Security-Policy', header);
  responseHeaders.set('Cache-Control', 'no-store');
  responseHeaders.set('Referrer-Policy', 'no-referrer');
  responseHeaders.set('X-Content-Type-Options', 'nosniff');
  return new Response(request.method === 'HEAD' ? null : body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}

export function handleError(): void {
  // React Router's default error logger includes arbitrary exception details.
  console.error('Route request failed.');
}
