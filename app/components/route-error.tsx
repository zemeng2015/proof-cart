import {isRouteErrorResponse} from 'react-router';

export function RouteError({error}: {error: unknown}) {
  const isNotFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <section className="error-panel" aria-labelledby="error-title">
      <p className="eyebrow">{isNotFound ? '404 / Page not found' : 'Preview unavailable'}</p>
      <h1 id="error-title">{isNotFound ? 'This page isn’t here.' : 'Something interrupted the preview.'}</h1>
      <p>{isNotFound ? 'Check the address or return to the Proof Cart preview.' : 'Please return to the preview and try again.'}</p>
      <a className="button-link" href="/">Return to preview <span aria-hidden="true">↗</span></a>
    </section>
  );
}
