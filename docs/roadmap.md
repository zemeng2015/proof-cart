# Proof Cart roadmap

Status: planned milestones. Only evidence accepted in the
[execution state](execution/state.md) establishes completion. Proof Cart proceeds
independently; no other project is a prerequisite.

## Milestones and dependency order

| Milestone | Outcome and exit evidence | Dependencies |
| --- | --- | --- |
| M0 — Foundation | Public-safe repository, MIT/contributor/security files, charter, invariants, architecture, threat model, two ADRs, scoped backlog, and documentation checks. No implemented product behavior is implied. | None. |
| M1 — Storefront and evidence (`v0.0.1`) | Verified/pinned Hydrogen + React Router + strict TypeScript scaffold; real CI commands; fixture catalog and typed Storefront boundary; Product/Variant/Money mapping; accessible search/detail/compare; deterministic planner, evidence ledger/drawer, and at most three sourced recommendations. Missing fields show `unknown`; untrusted descriptions cannot expand tool permissions. Tag only after the slice runs and its checks are recorded. | M0; framework/API baseline verified at scaffold time. |
| M2 — Cart boundary | Side-effect-free proposal; server-enforced state machine; first confirmation; trusted cart execution; token TTL/session/fingerprint/action binding, one-use consumption, and idempotency; revalidation and diff; second confirmation and fresh HTTPS merchant-allowlisted handoff. | M1 and an explicit atomicity/concurrency design. Live Storefront checks additionally require an authorized development store. |
| M3 — Release proof (`v0.1.0`) | All charter acceptance gates evaluated, raw output retained, release docs and failure matrix, clean-clone rehearsal, English demo, fixture and authorized live evidence, and an honest release tag. | M2; unresolved live/environment requirements cannot be represented as passed. |

M1 intentionally includes evidence and deterministic planning before cart work.
Storefront adapter implementation and contracts can proceed using recorded,
public-safe fixtures, but fixture checks do not establish live API behavior.
UCP preview entitlement, optional LLM access, and preview deployment are not
milestone prerequisites.

## Initial sprint: establish M1 from M0

Take issues sized to approximately 0.5–2 development days and keep at most two
issues in progress. A sprint is a bounded sequence, not a promised calendar date.

1. Verify official Hydrogen, React Router, Node/package-manager, and Storefront
   API compatibility; record and pin the chosen baseline. Scaffold strict
   TypeScript, route error handling, real build/typecheck/test commands, and CI.
   Exit: fixture app starts from documented commands and real checks pass.
2. Define `CommerceCatalogPort`, typed Product/Variant/Money mapping, and fixture
   configuration. Add the Storefront adapter boundary and code generation.
   Exit: deterministic contract checks distinguish missing facts, API errors,
   and unavailable products without silently fabricating values.
3. Build keyboard-accessible search, detail, and comparison for at most three
   candidates. Exit: routes handle loading, empty, error, and unavailable states;
   evidence IDs survive domain mapping.
4. Validate shopping intent and a bounded read-only tool registry; implement the
   deterministic planner and evidence drawer. Exit: a fixed need yields sourced
   recommendations, unsupported claims show `unknown`, and injected descriptions
   cannot request a write tool.
5. Rehearse the clean-clone fixture flow, record actual checks and limitations,
   and accept M1 before tagging `v0.0.1`.

Only independent tasks with explicit file ownership may be delegated. Builders
report changed files and actual checks; an independent reviewer inspects the
artifacts before the main agent accepts them. Use `codex/` feature branches after
bootstrap, and update [execution state](execution/state.md) after accepted work.

## Subsequent bounded work

M2 issues should separate proposal/state transitions, token and idempotency
primitives, trusted mutation execution, stale-state/diff handling, and checkout
handoff. Establish token concurrency and uncertain-provider-result behavior before
enabling writes. Every cart, security, or planner change lists affected invariant
IDs and negative-path evidence.

M3 covers at least these failure paths: expiry, tampering, replay, cross-session
approval, wrong action, double-click and concurrent tabs, out-of-stock/price/
variant/currency/line changes, Storefront timeout, partial errors, and unsafe
checkout URL. Then run adversarial, Playwright, accessibility, performance, secret
leakage, and clean-clone checks against the full
[charter acceptance matrix](charter.md#v01-release-acceptance).

The original four-week product sequence remains a planning reference: storefront,
then evidence/planning, then cart/handoff, then hardening/release. Estimate actual
capacity after M1; do not sacrifice evidence or approval guarantees to meet an
unverified deadline.

## Stop rules and scope reduction

If evidence-backed recommendations remain unreliable after the evidence slice,
remove optional model work and defer UCP integration. Do not add an agent
framework to mask unreliable facts or state transitions.

Reduce optional scope in this order: Shopify Function/Checkout extension,
UCP/Catalog MCP, live LLM, elaborate animations, and live deployment. Do not cut
credential-free reproducibility, evidence/unknown policy, two buyer confirmations,
stale approval invalidation, negative tests, English documentation, honest results,
or the release demo. A release may remain blocked by missing required evidence;
document the dependency instead of changing the metric or inventing a result.
