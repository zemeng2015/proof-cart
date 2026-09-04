# PC-01 builder record

Date: 2026-09-04. Status: builder checks passed; independent integration and
acceptance remain with the main agent. This is not M1 or v0.1 acceptance.

## Scope and interfaces

- Fixture-only SSR shell: `app/`, `server.ts`, local CSS and favicon.
- Hydrogen Vite plugin/preset, Mini Oxygen dev/preview workers, React Router
  request handling, strict TypeScript, real error routes and status codes.
- `npm run setup`, `dev`, `demo:fixture`, `build`, `preview`, `typecheck`, `lint`,
  `test`, `test:runtime`, and `test:e2e` are implemented. See
  [development documentation](../development.md).
- Exact dependency pins and lockfile; a read-only GitHub Actions application
  workflow, with raw runtime/browser evidence retention.
- No catalog, planner, cart, account, credential, payment, deployment, or live
  API functionality is claimed. No commit, push, or merge was made by the builder.

## Framework decisions

The official Hydrogen skeleton at
[`2a2738b`](https://github.com/Shopify/hydrogen/tree/2a2738ba20487ccc07006815fe40e93b24cb5f08/templates/skeleton)
is the reference. The build script follows the official
[two-phase Vite build](https://github.com/Shopify/hydrogen/blob/2a2738ba20487ccc07006815fe40e93b24cb5f08/packages/cli/src/commands/hydrogen/build.ts):
client output first, then the Oxygen worker entry.

The runtime uses React Router's underlying request handler because Hydrogen's
2026.4.5 convenience wrapper requires a Storefront instance and enables
Storefront/MCP forwarding. No dummy Storefront client or proxy was added.
Hydrogen's build, preset, Oxygen runtime, and nonce provider remain in use.

The initial dependency graph exposed advisories and an incompatible React 19
resize-observer peer. React 18.3.1 follows the official workspace catalog. The
final graph uses explicit, documented security overrides for React Router
7.18.3 and Mini Oxygen transitives. The initial failed audit is retained; the
current graph's audit reports zero findings. Undici's cross-major override was
also exercised by the real dev/preview transport checks; a clean audit alone
does not establish compatibility.

## Actual builder evidence

Raw output is retained under ignored `.local/pc01-evidence/`; browser and worker
artifacts are under ignored `test-results/` and `playwright-report/`.

| Command / observation | Result |
| --- | --- |
| Initial package installation | Failed because the registry-advertised Playwright 1.63.0 dependency tarball returned 404. Switched to downloadable 1.58.2; failed output preserved. |
| Final `npm ci --no-audit` | Passed: 507 installed packages, Node 24.20.0 / npm 11.19.0 on Windows; approximately 3 minutes including replacement of the previous dependency tree. |
| `npm ls --depth=0` | Passed with the final graph. |
| `npm audit --json` | Passed: 0 reported vulnerabilities at the time checked. |
| `npm run typecheck` | Passed with strict, unchecked-index, and exact-optional checks. |
| `npm run lint` | Passed with zero lint warnings. |
| `npm test` | Passed: 29 tests across 4 unit/component files. |
| `npm run build` | Passed: real browser assets and Oxygen fetch worker emitted. Final worker was approximately 195.52 kB before gzip. |
| `npm run test:runtime` | Passed: 3 real-process cases. Unsupported mode returns an opaque 503. Both dev and preview pass 20 sequential and 10 concurrent writes using normal keep-alive clients, Content-Length and explicit chunked framing, followed by GET/HEAD. Every write returns 405 with the correct Allow/body; supplied URL, body, and environment secret markers are absent from logs. |
| `npm run test:e2e` | Passed: all 6 foundation scenarios. SSR/public data/CSP, hydration with no second document navigation or browser errors, blocked third-party requests, keyboard anchors, 404 recovery, phone width, HEAD, and repeated unsupported methods are checked. |

## Review corrections incorporated

- Built an explicit production fixture CSP using Hydrogen's nonce instead of
  assuming the helper's directive arrays replace its Shopify/CDN defaults.
- Used a non-null no-op Oxygen request logger; `null` falls through to the
  upstream URL logger. Actual URL/query secret-marker tests pass.
- Made runtime tests refuse occupied ports, confirm their own child startup and
  liveness, propagate cancellation to network operations, terminate the owned
  process tree, and verify the port is released.
- Kept runtime logs outside Playwright's output directory, and retained both
  successful and failed evidence in CI.
- Verified actual client-side navigation without a second document request,
  not just an SSR marker that could pass without hydration.
- Reproduced intermittent rejected-body HTTP 500 responses in Mini Oxygen's
  Node HTTP bridge independently of the app. The first browser run had 5 passes
  and 1 failure; failed logs and diagnostic probes are retained rather than
  overwritten as successes. A newer same-major Miniflare probe did not fix it.
- Added a local dev/preview transport plugin that closes body-bearing
  connections without retrying or buffering. It removes Transfer-Encoding only
  for methods the worker unconditionally rejects, because the current bridge
  discards chunked bodies but otherwise forwards that invalid transport header.
  Vite CORS interception is disabled so OPTIONS also reaches the worker's 405.
  Tests use ordinary client keep-alive behavior, not a test-side header bypass.

## Remaining before PC-01 acceptance

Obtain independent review and main-agent integration acceptance. The final
application checks must be reproduced after integration. CI has been defined
but no GitHub execution is claimed by this builder record.

The local transport workaround intentionally discards chunked bodies for
rejected methods. It does not prove body forwarding. Before **any action or
other accepted request body** is enabled (including an M1 action), remove that
reject-only workaround and prove complete, bounded Content-Length and chunked
forwarding under persistent and concurrent requests. See the
[development boundary](../development.md#request-and-data-boundary).

ESLint 9's upstream deprecation, Vite `envFile` deprecation messages from the
framework integration, and React Router future-flag notices are recorded
limitations. They are not application test successes or failures. These six
foundation browser scenarios do not satisfy the later charter's full shopping,
two-confirmation, stale-state, and checkout paths.
