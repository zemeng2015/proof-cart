import type {ReactNode} from 'react';
import {Link, Links, Meta, Outlet, Scripts, ScrollRestoration} from 'react-router';
import {useNonce} from '@shopify/hydrogen';
import type {Route} from './+types/root';
import {RouteError} from './components/route-error';
import {runtimeConfigContext} from './lib/config.server';
import {getPublicShell} from './lib/public-shell.server';
import stylesheet from './styles/app.css?url';

export const links: Route.LinksFunction = () => [
  {rel: 'stylesheet', href: stylesheet},
  {rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg'},
];

export function loader({context}: Route.LoaderArgs) {
  return getPublicShell(context.get(runtimeConfigContext));
}

export function Layout({children}: {children: ReactNode}) {
  const nonce = useNonce();
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <div className="site-shell">
          <header className="site-header">
            <Link className="brand" to="/" aria-label="Proof Cart home"><span className="brand-mark" aria-hidden="true">p.</span>Proof Cart</Link>
            <span className="preview-badge"><span aria-hidden="true">●</span> Fixture preview</span>
          </header>
          <main id="main-content" tabIndex={-1}>{children}</main>
          <footer className="site-footer"><p>Agent recommends. Buyer decides. Shopify completes checkout.</p><p>Independent reference project · Not affiliated with Shopify</p></footer>
        </div>
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({error}: Route.ErrorBoundaryProps) {
  return <RouteError error={error} />;
}
