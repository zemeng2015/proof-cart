import * as build from 'virtual:react-router/server-build';
import {createRequestHandler} from 'react-router';
import {ConfigurationError, createLoadContext, type RuntimeEnvironment} from './app/lib/config.server';
import {rejectUnsupportedMethod} from './app/lib/request-policy.server';

export default {
  async fetch(request: Request, env: RuntimeEnvironment): Promise<Response> {
    const rejected = rejectUnsupportedMethod(request);
    if (rejected) return rejected;

    try {
      const context = createLoadContext(env);
      // Hydrogen's convenience handler requires a Storefront client and enables
      // Storefront/MCP proxy routes. This fixture boundary intentionally uses its
      // underlying React Router handler, without creating any commerce client.
      const handleRequest = createRequestHandler(build, import.meta.env.DEV ? 'development' : 'production');
      return await handleRequest(request, context);
    } catch (error: unknown) {
      const status = error instanceof ConfigurationError ? 503 : 500;
      // Do not log exception payloads, URLs, env, or query parameters.
      console.error(status === 503 ? 'Fixture configuration rejected.' : 'Request failed.');
      return new Response(request.method === 'HEAD' ? null : 'The preview is temporarily unavailable.', {
        status,
        headers: {'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store'},
      });
    }
  },
};
