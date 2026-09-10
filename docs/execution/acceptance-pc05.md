# PC-05 catalog UI verification

Implemented: fixture search, product detail, and comparison of up to three unique
products. URL parameters preserve selection; a fetcher form removes a selection,
re-reads the remaining facts, and redirects to the canonical comparison URL.
Every displayed known variant/specification fact includes a native evidence
disclosure. Exact decimal prices, unknown prices, zero prices, unavailable stock,
and unknown inventory remain distinct. Descriptions render as untrusted text.

The local body bridge now forwards complete Content-Length and chunked bodies
instead of discarding them. Both local transport and the comparison worker entry
have independent 64 KiB/five-second limits. The worker additionally checks exact
origin and urlencoded content type. This read-only action persists no state and
does not authorize commerce mutations (INV-01 through INV-04, INV-07, INV-09).

## Verification evidence

Windows, Node 24.20.0 and npm 11.19.0:

| Check | Actual result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run test:coverage` | 220 tests, 15 files passed; 385/395 branches (97.46%) |
| Per-file domain coverage | Every 85% gate passed; catalog UI service 97.29% |
| Worker form helper tests | 18 passing cases, included in the unit total |
| `npm run build` | SSR worker and browser bundle built |
| `npm run test:runtime` | Five real-process cases passed |
| `npm run test:e2e` | 13 Chromium cases passed: seven catalog, six foundation |

Raw local output is retained in `.local/pc05-*.log`, `coverage/`,
`test-results/runtime/`, `test-results/playwright/`, and `playwright-report/`.
CI retains the same runtime/browser/coverage artifacts; all current-head checks
must pass before integration. No dependency was added or upgraded in this slice.

The runtime cases verify both real Oxygen dev and preview: body SHA-256 and byte
counts for Unicode/multichunk uploads, Content-Length and chunked framing,
persistent clients, concurrent mixed-framing requests, size boundary, abort,
truncation, timeout, rejected-dispatch count, and recovery. Application runtime
cases also verify actual comparison-removal redirects and rejection of foreign
origins and unsupported content types in both modes. An initial harness run used
Fetch-blocked port 4190; moving it to 4191 produced passing clean runs.

Independent static review accepted the transport, worker boundary, and UI; the
main agent inspected the changes and actual test output. A suggested search that
matched no fixture title/material was corrected to `cotton` before final checks.

## Accessibility and visual findings

- Chromium keyboard checks exercise the skip link, catalog/detail navigation,
  heading focus, native evidence disclosure, and comparison-removal status focus.
- Exact-price evidence disclosure was opened in Chromium; source, field, and ID
  were visible. The component suite separately checks retrieval timestamps.
- Desktop and 360-pixel phone screenshots were inspected: readable text and
  controls, no clipping or overlap; phone comparison cards stack vertically and
  produce a long page. An automated scroll-width assertion detects overflow.
- Pending states use status announcements; errors use alerts. Provider errors
  are exercised through an injected catalog in service tests.
- No automated accessibility audit score, screen-reader certification, Lighthouse
  result, or full release-flow keyboard completion is claimed here.

The fixture UI is implemented; planner recommendations, cart confirmations,
revalidation, checkout handoff, live-shop evidence, and release gates remain open.
The 13 browser cases are not the six required complete v0.1 shopping flows.
