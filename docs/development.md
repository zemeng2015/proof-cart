# Local development

Proof Cart currently implements a fixture-only Hydrogen/React Router SSR shell.
It has a home page, an error boundary, and a direct-route 404. Catalog search,
evidence, recommendations, cart actions, and checkout are still future work.

## Start the credential-free preview

Use Node `24.20.0` from `.nvmrc` and npm `11.11.0` from `packageManager`.
The supported engine range also includes Node `24.14.1`, used by the initial
local development environment. CI selects `.nvmrc` and explicitly installs the
pinned npm version; neither runtime nor dependency installation requires a store.

```sh
git clone https://github.com/zemeng2015/proof-cart.git
cd proof-cart
npm run setup
npm run demo:fixture
```

Open `http://127.0.0.1:4173`. `setup` executes `npm ci --no-audit` against the committed
lockfile. `demo:fixture` selects fixture mode, builds both browser and worker
bundles, and starts the official Mini Oxygen Vite preview runtime. It accepts
Vite preview options, for example `npm run demo:fixture -- --port 4180`.
Stop with Ctrl+C. Installation needs the npm registry; the running application
uses only local assets and makes no commerce API requests.

For development with hot reload, run `npm run dev`. To inspect an existing
production build, run `npm run preview`. These bind loopback on port 4173 and
fail if the port is occupied. Pass `-- --port 4180` to change the port.

No `.env` file or credentials are needed. Vite forwards only `PROOF_CART_MODE`
to the worker. An absent mode selects `fixture`; an unsupported mode produces
an opaque HTTP 503, without echoing the supplied value. `demo:fixture` always
explicitly selects fixture mode. `dev` and `preview` respect the process mode.
Storefront mode is not implemented in this increment.

## Verification

```sh
npm ci --no-audit
npm run typecheck
npm run lint
npm test
npm run build
npm run test:runtime
npx playwright install chromium
npm run test:e2e
npm audit
```

On Linux, `npx playwright install --with-deps chromium` also installs the system
libraries needed by Chromium. Where the default browser-cache directory is
unusable, set `PLAYWRIGHT_BROWSERS_PATH` to an accessible local directory for
both installation and test commands; this does not require changing a global
cache. Browser tests start a fresh production preview and require port 4173 to
be free. They do not reuse an arbitrary running server.

The advisory scan is explicit instead of running inside setup, so its network
latency does not slow the fixture setup path. CI runs `npm audit` separately.
Runtime tests need free loopback ports 4186–4189 and 4191; they start owned workers,
verify startup, propagate test cancellation to requests, and clean up the owned
process tree. They refuse occupied ports. In both development and production
preview they exercise normal keep-alive clients with Content-Length and explicit
chunked requests: 20 sequential and 10 concurrent rejected writes, followed by
GET/HEAD. They check status, response body, and absence of URL/body/environment
secret markers from the real process logs.

Unit/component checks cover mode rejection, public loader serialization,
read-only request policy, CSP, rendered copy, and safe errors. Browser checks
exercise SSR, hydration, local-only requests, actual 404 and 405 responses,
HEAD, keyboard anchors, and the mobile layout. Browser failure traces,
screenshots, JSON output, and an HTML report are retained locally in ignored
`test-results/` and `playwright-report/`; CI uploads these on every run. Runtime
logs are separate from Playwright's output directory so browser startup cannot
clear them.

These checks establish only the foundation behavior they exercise. They do not
establish catalog evidence coverage, mutation safety, release-level keyboard
coverage, live Storefront behavior, or the v0.1 performance/accessibility targets.

## Framework lineage and dependency policy

The starting reference is Shopify's official
[Hydrogen skeleton at commit 2a2738b](https://github.com/Shopify/hydrogen/tree/2a2738ba20487ccc07006815fe40e93b24cb5f08/templates/skeleton).
The implementation retains its Hydrogen Vite plugin, React Router Hydrogen
preset, Mini Oxygen worker runtime, nonce provider, and React streaming
SSR/client hydration entrypoints. The UI and fixture boundary are original to
this project. No remote demo catalog, storefront redirect, account client,
analytics provider, session, or cart executor is instantiated.

The fixture server calls React Router's request handler directly. Hydrogen
2026.4.5's convenience handler requires a Storefront instance and enables
Storefront/MCP forwarding; creating a fake commerce client just to satisfy that
handler would weaken this fixture-only boundary. The actual Hydrogen/Oxygen
build and SSR tools remain in use.

Verified against official package metadata on 2026-09-04:

| Component | Pinned baseline | Rationale |
| --- | --- | --- |
| Hydrogen | 2026.4.5 | Stable package with React Router peer range `~7.16.0`. |
| React Router and its dev tools | 7.18.3 | Explicit security compatibility exception to Hydrogen's declared `~7.16.0` peer range; see below. |
| React and React DOM | 18.3.1 | Match the official skeleton workspace catalog and Hydrogen's supported React range without an invalid resize-observer peer graph. |
| Vite | 8.2.2 | Supported by Hydrogen and Mini Oxygen. |
| Mini Oxygen | 4.2.2 | Official Vite dev/preview support without Shopify CLI account or telemetry setup. |
| TypeScript | 5.9.3 | Strict compiler; unchecked indexed access and exact optional properties enabled. |
| Vitest / Testing Library | 5.0.0 / 16.3.3 | Real unit and component tests; jsdom 27.4.0 supports the local Node baseline. |
| Playwright | 1.58.2 | Downloadable stable browser-test baseline; registry-advertised 1.63.0 had a missing dependency tarball during setup. |
| ESLint / TypeScript ESLint | 9.39.5 / 8.69.0 | Compatible with JSX accessibility plugin 6.10.2, which has not declared ESLint 10 support. ESLint 9 is deprecated upstream; reevaluate the lint stack before release. |

Sources: [Hydrogen metadata](https://registry.npmjs.org/@shopify/hydrogen/2026.4.5),
[Mini Oxygen metadata](https://registry.npmjs.org/@shopify/mini-oxygen/4.2.2),
[official Mini Oxygen Vite implementation](https://github.com/Shopify/hydrogen/blob/2a2738ba20487ccc07006815fe40e93b24cb5f08/packages/mini-oxygen/src/vite/plugin.ts),
and [Node release index](https://nodejs.org/dist/index.json).

Every direct dependency is exact-pinned and the transitive graph is locked.
The initial unmodified React Router 7.16.0 graph had a framework-mode
[denial-of-service advisory](https://github.com/advisories/GHSA-chx6-hx7r-mcp5).
The manifest overrides Hydrogen's router/dev peers to the explicitly selected
7.18.3 security patch baseline. This is a compatibility exception, not a
claim that Shopify officially supports a wider peer range.

Additional security overrides keep Mini Oxygen 4.2.2 while selecting its
`undici` 7.29.1 and `body-parser` 1.20.6, and Miniflare's `undici` 6.28.1,
`ws` 8.21.3, and Youch's `cookie` 0.7.2. `qs` is pinned to 6.16.0. Miniflare's
Undici 5-to-6 override crosses a major version and therefore requires the actual
dev/preview worker checks; static dependency resolution is insufficient.
Reevaluate and remove overrides as upstream packages adopt compatible fixes.

Update related framework packages together in a scoped change, recheck official
peer ranges, regenerate the lockfile, and run all checks above. Do not force
an incompatible major upgrade to suppress package-manager warnings. Record
security findings and limitations honestly; no dependency-security acceptance
is claimed solely from installing a lockfile. No GraphQL operations exist yet,
so Storefront API versioning and GraphQL code generation belong to the adapter
increment.

## Request and data boundary

GET and HEAD enter the application router. POST is accepted only for `/compare`
and `/compare.data`: the worker requires an exact same-origin Origin header,
urlencoded UTF-8 content, and a complete body of at most 64 KiB within five
seconds. Other methods/routes retain HTTP 405. The comparison action only
validates product selection and refreshes catalog facts; it grants no cart
permission and persists no state. Public loaders never spread environment values,
context, tokens, or exceptions. Framework errors and Mini Oxygen request logging
remain fixed/disabled to keep supplied URL, body, and environment values out.

Mini Oxygen 4.2.2's Node-to-web conversion only forwards bodies with a
Content-Length header. `scripts/request-body-bridge.ts` now buffers complete
Content-Length or chunked requests within 64 KiB/five seconds, then re-enters the
Connect middleware stack with a fresh readable carrying the exact decoded bytes
and normalized Content-Length. It rejects incomplete, oversized, slow, and
GET/HEAD bodies before worker dispatch. Body-bearing local responses close their
connections to avoid the documented Miniflare reuse reset; there are no retries.
The deployed worker has independent limits in `app/lib/form-request.server.ts`.

The separate test-only Oxygen worker verifies byte counts and SHA-256 hashes
through both dev and preview: Unicode/multichunk bodies, both framing modes,
concurrent requests, persistent clients, limits, aborts, timeouts, and recovery.
It is not built into the application. Application runtime checks also submit a
real comparison removal with both framing modes and reject cross-origin and
unsupported-content-type forms. Vite CORS middleware remains disabled so OPTIONS
reaches the worker's method policy.

Hydrogen provides a random script nonce and the React nonce context. Its default
CSP merges merchant/CDN hosts, so the fixture constructs a separate self-only
production policy using that nonce. Development alone permits loopback WebSocket
connections and inline styles for Vite's hot reload. Production allows neither
remote connect destinations nor inline styles. This is a browser policy; future
server adapters must enforce their own outbound boundaries.
