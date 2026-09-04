# Initial development backlog

This list is the M1 implementation queue. PC-01 is in integration verification;
PC-02 through PC-08 remain planned. Consult [execution state](state.md) for acceptance.
Only these eight bounded work items are initially opened on GitHub. M2/M3 remain
in the [roadmap](../roadmap.md) until their prerequisites are accepted. WIP limit: 2.

GitHub mapping: [PC-01 / #1](https://github.com/zemeng2015/proof-cart/issues/1),
[PC-02 / #2](https://github.com/zemeng2015/proof-cart/issues/2),
[PC-03 / #3](https://github.com/zemeng2015/proof-cart/issues/3),
[PC-04 / #4](https://github.com/zemeng2015/proof-cart/issues/4),
[PC-05 / #5](https://github.com/zemeng2015/proof-cart/issues/5),
[PC-06 / #6](https://github.com/zemeng2015/proof-cart/issues/6),
[PC-07 / #7](https://github.com/zemeng2015/proof-cart/issues/7),
[PC-08 / #8](https://github.com/zemeng2015/proof-cart/issues/8).

| ID | Priority | Work item | Depends on | Acceptance evidence |
| --- | --- | --- | --- | --- |
| PC-01 | P0 | Scaffold Hydrogen, React Router, strict TypeScript, and real CI | M0 | Pin verified official baseline; fresh-clone setup; build, lint, typecheck, unit and fixture smoke commands work without credentials |
| PC-02 | P0 | Define typed catalog port, money, variants, and evidence | PC-01 | Runtime-validated domain mapping; exact money representation; unknown facts explicit; port contract tests |
| PC-03 | P0 | Implement deterministic fixture catalog | PC-02 | Search/detail fixtures with known, missing, unavailable, and adversarial data; reproducible IDs/timestamps; adapter contract tests |
| PC-04 | P1 | Add typed Shopify Storefront adapter and GraphQL codegen | PC-02 | Official version pinned; generated types; mocked success/error/timeout mapping; opt-in dev-store setup; fixture default works without secrets |
| PC-05 | P0 | Build accessible search, detail, and compare routes | PC-03 | Responsive loaders/actions/fetchers; at most three candidates; keyboard flow; pending/error/empty/unknown states; RTL and E2E smoke |
| PC-06 | P0 | Validate intent and implement read-only deterministic planning | PC-03 | Bounded schema-valid intent/tool output/proposal; no mutation capability; deterministic ranking with evidence; fixed evals begin |
| PC-07 | P0 | Connect recommendation evidence and drawer | PC-05, PC-06 | Every factual display links to evidence; missing facts unknown; accessible focus handling; provenance and unsupported-claim checks |
| PC-08 | P1 | Verify the M1 fixture demo and document v0.0.1 readiness | PC-04, PC-07 | Reproducible full recommendation flow; raw accessibility/eval/E2E output; measured setup time; honest dev-store verification status and release checklist |

PC-04 and PC-05/06 may proceed independently once PC-02/03 contracts are accepted.
Do not run more than two active work items. Public release readiness does not
require a live LLM, UCP, Shopify Function, animation polish, or hosted deployment.

PC-04 can be implemented against official contracts without credentials. A real
dev-store demonstration still requires a supplied environment; a fixture or mock
test must never be reported as that live verification.

Before M2 implementation, resolve atomic confirmation consumption, idempotent cart
execution, session storage, and stale-state concurrency with executable contracts.
