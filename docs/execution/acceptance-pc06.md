# PC-06 planner verification

Implemented a deterministic read-only planning service with strict structured
intent, bounded catalog tools, exact subtotal ranking, up to three distinct
product alternatives, and one independently validated CartProposal per candidate.
Reasons reference actual evidence; unsupported facts remain unknown or exclude a
candidate when required by a hard constraint. See [planner contract](../planner.md).

The service is not connected to a UI route in this increment. No buyer approval,
cart execution, checkout, LLM, or live-store request is implemented by the planner.
Affected invariants: INV-01, INV-02, INV-03, INV-04, INV-07, and INV-09.

## Checks and raw evidence

Main-agent checks on Windows, Node 24.20.0, npm 11.19.0:

| Check | Actual result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run test:coverage` | 306 tests in 18 files passed |
| Aggregate branches | 501/516 (97.09%); every per-file 85% gate passed |
| Planner branches | 74/79 (93.67%) |
| Tool boundary branches | 42/42 (100%) |
| Fixed evaluations included in suite | 26/26 intent, 18/18 adversarial passed |
| `npm run build` | SSR worker and browser bundle built |
| `npm run test:runtime` | Five existing runtime regression cases passed |
| `npm run test:e2e` | 13 existing catalog/foundation Chromium cases passed |

Logs are retained under `.local/pc06-*.log` and `coverage/`. The evaluation builder
also ran `npm run test:eval`; the integrated suite reran those cases and wrote
`test-results/evals/planner.json`. This artifact records each expected/observed
outcome, pass/fail, elapsed time, and synthetic environment. CI retains it with
runtime/browser/coverage artifacts. Remote current-head checks gate integration.
There are no dependency additions or upgrades; `test:eval` is a new script and
coverage now includes the planner directory.
The runtime/browser checks are regression evidence for the existing catalog;
they do not exercise a planner UI, which is not implemented yet.

## Independent evaluation and review

An evaluation builder separate from the planner builder authored literal expected
variants and exact amounts. Cases exercise quantity subtotal budgets, fractional
precision, known zero versus unknown price, unavailable/insufficient/unknown stock,
quantity rules, material constraints, currency, ranking ties, and distinct-product
limits. Every emitted proposal is revalidated and each reason is independently
checked against its evidence subject, field, value, and proposal rationale.

The 18 adversarial cases exercise unsupported intent keys and authority, hostile
description/search text, forbidden tools, wrong source/context, stale/tampered
snapshots, wrong variant responses, and attempt-budget exhaustion. Mutation spies
remain uncalled; these cases establish behavior of the tested read-only boundary,
not safety of a future cart executor.

Independent review initially found late invalid clock readings and expiry while
processing candidates. Shared monotonic clock validation and a final snapshot/
proposal expiry check resolve both. Regression tests first validate real candidates,
then introduce NaN, infinity, fractional/backward time, cross the expiry boundary,
or exceed the full planning deadline. Re-review passed. Tool traces are bounded,
and validated input copies avoid reading changing accessors a second time.

UI recommendation/proposal presentation and the evidence drawer belong to PC-07.
Full shopping-flow browser paths, live-mode evidence, Lighthouse, clean-clone
release rehearsal, English demo/README GIF, and v0.1.0 remain outstanding.
