# Execution state

Updated: 2026-09-10

## Long-term objective

Deliver Proof Cart v0.1.0 against the [charter](../charter.md) and
[roadmap](../roadmap.md), including raw verification evidence and an English demo.
The long-running development goal is active. Repository creation is only M0.

## Current checkpoint

- Mode: Long-Goal Orchestration; bounded implementation followed by independent review.
- M0: accepted and published.
- M1 / PC-01: fixture SSR scaffold accepted and merged through
  [PR #9](https://github.com/zemeng2015/proof-cart/pull/9); local and Linux CI checks passed.
- PC-02: exact money, strict product/variant schemas, bound evidence snapshots,
  the read-only catalog boundary, and data-only CartProposal validation are
  accepted and merged. All 124 unit/component tests, typecheck,
  and lint pass locally; per-file branch thresholds of 85% pass (95.21% aggregate).
  Independent review, local integration, and Linux CI passed in
  [PR #10](https://github.com/zemeng2015/proof-cart/pull/10). See the [verification record](acceptance-pc02.md)
  and [domain contract](../domain-contract.md).
- PC-03: accepted through [PR #11](https://github.com/zemeng2015/proof-cart/pull/11),
  with independent review and passing Linux CI. See the [verification record](acceptance-pc03.md).
- PC-04: typed Storefront catalog and offline code generation implemented on
  `codex/pc04-storefront`; independent review and local checks pass (191 tests,
  97.48% aggregate branches). See the [verification record](acceptance-pc04.md).
- PC-05 through PC-08 and M2/M3: not implemented; no release is claimed.
- Repository: https://github.com/zemeng2015/proof-cart (public; verified).
- Default/integration branch: `main`; later feature branches use `codex/`.

## Ownership and integration

- Main agent: scope, root policies, README, CI, backlog, repository operations, final acceptance.
- PC-01 builder: isolated `codex/pc01-scaffold` worktree; application/configuration,
  scoped tests, application CI, and development notes.
- Research: read-only official framework and catalog-contract investigation.
- Independent reviewer: actual scaffold, safety boundary, and evidence review.
- Integration order: builder checks → independent review → main verification →
  scoped commit/PR and Linux CI → accepted checkpoint → PC-02 contracts.

## Accepted evidence

An exclusive project directory and fresh Git repository were established after
detecting a shared-workspace collision during setup. No unrelated project files
were imported; the shared originals were preserved outside this repository.

- Initial published revision: `6c07b3475dfbf91044ae23ec0a84707d3bcd075e`.
- Independent review: PASS on all applicable M0 gates; 26 initial public files,
  44 relative Markdown links/anchors, and eight issue payloads inspected.
- `git diff --cached --check`: PASS before initial commit.
- [Initial GitHub repository hygiene run](https://github.com/zemeng2015/proof-cart/actions/runs/33926565932): success.
- Four GitHub milestones and [eight M1 issues](https://github.com/zemeng2015/proof-cart/issues) created; priority/area labels and private vulnerability reporting configured.
- [Acceptance record](acceptance-m0.md) preserves the scope and limits of these checks.

M0 evidence above concerns repository setup only. The [PC-01 acceptance record](acceptance-pc01.md)
records independent review, 29 unit/component tests, 3 real-process runtime cases,
6 Chromium scenarios, desktop/phone visual checks, a 125.8-second warm-cache
fresh public-clone demo, and passing Linux CI. No live-store or release acceptance exists.

## Next bounded work

[PC-05](https://github.com/zemeng2015/proof-cart/issues/5): after PC-04 remote
checks and merge, connect the fixture catalog to accessible search, detail, and
comparison routes. Any action or accepted request body first requires correcting
the local runtime transport. Live Storefront verification remains unresolved.

Latest checks are retained under `.local/proposal-*.log` and `coverage/`:
124 tests across nine files, typecheck, lint, and coverage pass. Pinned additions
Zod 4.5.4 and coverage-v8 5.0.0 were audited with zero reported vulnerabilities
(`.local/pc02-audit.json`). CI runs coverage and retains its reports; both Linux
application runs for source revision `b81add2` passed. Final build, three runtime
cases, and six foundation browser cases also passed. These are contract and
foundation checks, not full-flow browser/release evidence.

## Open decisions and dependencies

- Framework/runtime versions and security compatibility overrides are documented
  in [local development](../development.md); verify API versions during PC-04.
- The local Mini Oxygen request bridge must be replaced or corrected before any
  action or accepted request body is introduced:
  its installed implementation does not forward chunked bodies. Read-only rejection
  tests cannot establish correct request-body forwarding.
- Name remains provisional; basic public collision checks are not trademark clearance.
- Choose server session and atomic one-time consumption/idempotency storage before M2.
- Shopify credentials and an authorized development store are needed for live evidence.
- Optional LLM, UCP, Functions, and deployment are deferred.
- The fixture path must remain credential-free; never bypass confirmation to unblock progress.

## Completion rule

Mark the long goal complete only when the full v0.1 acceptance evidence exists.
Record environmental dependencies separately from successful fixture tests. Do
not mark a sprint or release complete based only on a builder report or CI status.
