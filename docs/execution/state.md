# Execution state

Updated: 2026-09-04

## Long-term objective

Deliver Proof Cart v0.1.0 against the [charter](../charter.md) and
[roadmap](../roadmap.md), including raw verification evidence and an English demo.
The long-running development goal is active. Repository creation is only M0.

## Current checkpoint

- Mode: Long-Goal Orchestration; bounded implementation followed by independent review.
- M0: accepted and published; no application code exists.
- M1/M2/M3: not started; no release or product test result is claimed.
- Repository: https://github.com/zemeng2015/proof-cart (public; verified).
- Default/integration branch: `main`; later feature branches use `codex/`.

## Ownership and integration

- Main agent: scope, root policies, README, CI, backlog, repository operations, final acceptance.
- Documentation builder: six files listed in [its contract](contracts/bootstrap-docs.md).
- Research task: read-only name and official scaffold baseline investigation.
- Independent reviewer: read-only actual foundation artifact review before initial publication.
- Integration order: product docs → root links and policies → independent review → verified initial commit/push → issue/milestone verification.

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

No runtime, UI, live-store, safety, or release acceptance evidence exists yet.

## Next bounded work

[PC-01](https://github.com/zemeng2015/proof-cart/issues/1): verify and pin the official Hydrogen/React Router baseline, scaffold the
smallest fixture-capable application, and add real install/build/typecheck/lint/test
commands and CI. Complete PC-02 contracts before adapter and feature parallelism.

## Open decisions and dependencies

- Verify framework/runtime/API versions at PC-01/PC-04 implementation time.
- Name remains provisional; basic public collision checks are not trademark clearance.
- Choose server session and atomic one-time consumption/idempotency storage before M2.
- Shopify credentials and an authorized development store are needed for live evidence.
- Optional LLM, UCP, Functions, and deployment are deferred.
- The fixture path must remain credential-free; never bypass confirmation to unblock progress.

## Completion rule

Mark the long goal complete only when the full v0.1 acceptance evidence exists.
Record environmental dependencies separately from successful fixture tests. Do
not mark a sprint or release complete based only on a builder report or CI status.
