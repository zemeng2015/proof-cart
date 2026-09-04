# Execution state

Updated: 2026-09-04

## Long-term objective

Deliver Proof Cart v0.1.0 against the [charter](../charter.md) and
[roadmap](../roadmap.md), including raw verification evidence and an English demo.
The long-running development goal is active. Repository creation is only M0.

## Current checkpoint

- Mode: Long-Goal Orchestration; bounded implementation followed by independent review.
- M0: accepted and published.
- M1 / PC-01: fixture SSR scaffold implemented, undergoing independent integration
  verification. Local transport regressions are being resolved before acceptance.
- PC-02 through PC-08 and M2/M3: not implemented; no release is claimed.
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

M0 evidence above concerns repository setup only. PC-01 evidence will be recorded
separately after integration; no live-store or release acceptance exists.

## Next bounded work

[PC-01](https://github.com/zemeng2015/proof-cart/issues/1): finish the local simulator
transport regression checks, independent review, and CI acceptance. Then dispatch
[PC-02](https://github.com/zemeng2015/proof-cart/issues/2) for validated domain,
money, evidence, and read-only catalog-port contracts before adapter parallelism.

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
