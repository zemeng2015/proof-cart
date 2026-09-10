# PC-01 integration evidence

Date: 2026-09-04. Scope: the credential-free, read-only foundation shell in
[issue #1](https://github.com/zemeng2015/proof-cart/issues/1).
This is not M1 completion or v0.1 release acceptance.

## Local verification

The main agent independently copied the publishable source to a separate QA
directory, installed dependencies without copying `node_modules`, inspected the
implementation, and repeated the final checks after the transport correction.
Final commands used Windows, Node 24.20.0, npm 11.11.0, and Chromium from
Playwright 1.58.2. Initial isolated installation used npm 11.19.0 and took
63.2 seconds with an existing package cache; this is not a cold-cache benchmark
or a complete clean-clone-to-demo measurement.

| Check | Observed result |
| --- | --- |
| Strict type checking | PASS |
| ESLint | PASS, zero warnings |
| Vitest / Testing Library | PASS, 29 tests in 4 files |
| Production build | PASS, browser assets and Oxygen fetch worker |
| Real-process runtime checks | PASS, 3 cases |
| Chromium browser checks | PASS, 6 cases, no retries needed locally |
| Visual inspection | PASS at 1440px desktop and 360px phone widths; phone document width 360px |
| Dependency review | Exact pins/lock and disclosed exceptions inspected; builder audit reported 0 advisories |
| Fresh public clone to demo | PASS, 125.8 seconds, existing npm cache, no dependency directory copied |

Runtime cases exercise opaque unsupported-mode 503 responses and both dev and
production-preview processes. Each normal-mode process receives 20 sequential
and 10 concurrent rejected requests with length or explicit chunked framing,
followed by successful route/error reads and HEAD. Clients retain normal
keep-alive behavior. Logs exclude synthetic environment, URL, query, and body
markers; tests verify ownership, cancellation, cleanup, and released ports.

Browser cases verify SSR/public serialization/CSP, actual hydration via navigation
without a second document load, absence of browser errors and third-party
requests, empty browser storage, direct 404 recovery, keyboard anchors, phone
layout, HEAD status, and unsupported-method 405 responses.

Raw local outputs remain in ignored `.local/pc01-evidence/` in the builder
worktree and the independent QA directory's `.local/final-*.log`. Browser JSON,
traces, screenshots, and runtime logs remain in ignored `test-results/` and
`playwright-report/`. GitHub CI retains runtime/browser artifacts for seven days.
No private local paths or original personal planning files are published.

## Review and limits

Independent implementation/test review passed against the actual source and raw
results. The separate publication review found no private data, abnormal lockfile
URLs, or broken relative Markdown links across the 65-file candidate. Main-owned
status documents distinguish implemented foundation behavior from future features.

The dependency compatibility exceptions, direct React Router handler, explicit
fixture CSP, logging changes, and local transport workaround are described in
[development](../development.md) and the [builder record](pc01-builder.md).

The local bridge intentionally discards chunked bodies for methods the worker
unconditionally rejects. These tests establish reliable rejection only. Before
**any action or accepted request body**, remove that workaround and verify complete,
bounded forwarding in both dev and preview. No production Oxygen transport,
live Storefront, catalog provenance, cart authorization, Lighthouse, or release
metric is established here. Framework deprecation/future-flag notices remain.

## Integration status

The clean-clone rehearsal fetched public branch commit
`fdceabd5e18d6e60142261a6a5da406bf3a2fc56`, ran `npm run setup`, built and
started the fixture demo, and verified its actual HTTP 200 page. It used Node
24.20.0/npm 11.11.0, with no `.env` or Shopify credential configured. Raw setup,
demo, and measured-result files remain under ignored `.local/clean-clone-evidence/`.
The full 125.8 seconds includes cloning, installation, build, and server readiness;
it is a warm-cache foundation measurement, not the later full-storefront benchmark.

The first [Linux application run](https://github.com/zemeng2015/proof-cart/actions/runs/33929199557)
passed installation, audit, typecheck, lint, unit tests, and build. Its runtime
harness could not recognize the colored Vite startup URL: ANSI codes split the
port from the hostname. The raw failure and worker logs are preserved. The
The readiness matcher now strips terminal control codes only for matching while
retaining raw evidence. On 2026-09-10, the actual runtime suite with `CI=true`
and `FORCE_COLOR=1` passed all 3 cases (26.94 seconds, exit 0).

GitHub CI and final integration are pending; issue #1 stays open until those
checks pass. Local implementation and independent review passed for the bounded
foundation scope.
