# PC-02 domain contract verification

Status: independent implementation review and local integration checks passed;
remote CI and merge pending. This is not M1 or v0.1 release acceptance.

## Implemented scope

- Exact bounded decimal money and explicit supported currencies.
- Strict immutable product/variant schemas, source/context identity, and unknown facts.
- Evidence ledger with exact field/value/subject binding, freshness, and deterministic digest.
- Bounded read-only catalog port with opaque errors and request/result matching.
- Data-only CartProposal with quantity, price, availability, currency, evidence,
  expiry, and exact merchandise-subtotal validation.
- Pinned Zod 4.5.4 and coverage-v8 5.0.0 dependencies; per-file 85% branch gate.

No provider requests, UI catalog integration, planner, approval, mutation, checkout
handoff, or live-store behavior is implemented by this increment. See the
[domain contract](../domain-contract.md) for stock/quantity and provenance policies.

## Review and local evidence

Independent reviewer inspected actual implementation and tests, first requesting
foreign-rationale and reused-claim negative tests. Both were added; the recheck
returned PASS with no remaining actionable findings in this scope. The main agent
ran the integration checks below after that rework. Builder handoffs had produced
no artifacts; their ownership was withdrawn before main-agent implementation.

Environment: Windows, Node 24.20.0, npm 11.19.0; repository package-manager target
remains npm 11.11.0, used by Linux CI. Verification date: 2026-09-10.

| Command | Actual result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run test:coverage` | 124 tests, nine files passed |
| `npm run build` | SSR worker and browser build passed |
| `npm run test:runtime` | Three real-process foundation cases passed |
| `npm run test:e2e` | Six Chromium foundation cases passed |
| `npm audit --json` | Zero reported vulnerabilities |
| `git diff --check` | Passed; also independently checked by reviewer |

Branch coverage: aggregate 219/230 (95.21%); proposal 100%, evidence 94.54%, money
98.30%, port 86.11%, schemas 92.85%. Type-only domain declarations are excluded.
Reports include uncovered branches; no suppression is used to claim full coverage.
This scope excludes the future planner and state machine.

Raw local evidence: `.local/proposal-{typecheck,lint,coverage}.log`,
`.local/pc02-{build,runtime,browser}.log`, `.local/pc02-audit.json`, and `coverage/`.
CI runs the same coverage command and retains its reports with browser artifacts.
The runtime/browser results are foundation regression checks, not the charter's
six complete shopping-flow paths. The request-body transport limitation from
PC-01 remains unresolved and must be fixed before implementing an action.
