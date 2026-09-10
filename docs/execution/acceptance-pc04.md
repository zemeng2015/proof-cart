# PC-04 Storefront adapter verification

Implemented: three fixed read queries, offline generated query/variable types,
strict response mapping, evidence snapshots, and a server-only private-token
transport. API 2026-04 matches the pinned Hydrogen schema. See
[Storefront setup and limits](../storefront.md).

The independent review initially required effective response-context validation
and cancellation of late responses after timeout. Both fixes and their negative
tests were reviewed; the recheck returned PASS with no blocking findings.

Main-agent verification on Windows, Node 24.20.0, npm 11.19.0:

| Command | Actual result |
| --- | --- |
| `npm run codegen:check` | Regenerated declarations identical using local schema |
| `npm run typecheck` | Passed, including generated variable/result compatibility |
| `npm run lint` | Passed |
| `npm run test:coverage` | 191 tests passed, 13 files; every per-file branch gate passed |
| `npm run build` | SSR worker and browser bundle built |
| `npm run test:runtime` | Three foundation cases passed |
| `npm run test:e2e` | Six foundation Chromium cases passed |
| `npm audit --json` | Zero reported vulnerabilities after the scoped lodash fix |
| `git diff --check` | Passed |

Aggregate branch coverage: 349/358 (97.48%); mapper 100%; transport 95.34%.
Type-only generated declarations are excluded. Raw evidence is retained in
`.local/pc04-*.log`, `.local/codegen-check.log`, `.local/pc04-audit-fixed.json`, and
`coverage/`. Remote verification is recorded by the associated PR's checks and
retained CI artifacts; a failing remote run prevents integration.

Added dev dependencies: `@graphql-codegen/cli` 7.4.1,
`@shopify/hydrogen-codegen` 0.3.3, and `graphql` 16.13.1. A scoped override for
Hydrogen codegen uses lodash 4.18.1 instead of its vulnerable transitive version.
CI verifies offline generation drift before typechecking. No credentials or
shop access were used for installation, generation, or mocked tests.

The tests use synthetic response fixtures and injected fetch implementations.
They cover unknown values, wrong identities, malformed responses, partial errors,
context/version mismatch, deadlines and cancellation, oversized bodies, opaque
errors, and read-only operations. These do not verify live permissions, actual
query cost, or shop localization. Product routes, buyer approval, cart mutation,
and checkout remain outside this increment. The framework request-body transport
limitation still must be fixed before any action is accepted.
