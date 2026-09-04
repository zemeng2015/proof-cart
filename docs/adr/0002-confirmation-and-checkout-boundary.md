# ADR 0002: Two confirmations and a server-enforced checkout boundary

- Status: accepted design direction; implementation and verification pending.
- Scope: M2 cart execution, revalidation, and handoff.
- Invariants: INV-04, INV-05, INV-06, INV-07, INV-08, INV-09.

## Context

A proposal is not permission to act. Cart facts can change between review and
execution, and retries or concurrent clicks can repeat a write. A second decision
is needed before leaving the application for checkout. Client-only state, a signed
token without consumption tracking, and button disabling cannot enforce these
boundaries.

## Decision

Use a server-validated discriminated-union state machine. First confirmation
authorizes exactly the reviewed cart action. The trusted server checks session,
proposal/cart fingerprint, amount, currency, action, short TTL, and one-use state
before a cart mutation. Reserve and consume approval atomically with the logical
action record, and return the same known outcome for legitimate duplicate requests.
Tokens for different actions are not interchangeable.

Revalidate variant, availability, price, currency, cart lines, and totals before
preparing handoff. Show a diff and invalidate prior approval when anything relevant
changes. Require a second explicit confirmation against the revalidated state and
check freshness again when it is consumed. Changes requiring a different cart
action return to proposal review and first confirmation.

Obtain a fresh checkout URL from the trusted provider during the handoff action;
require parsed HTTPS and an exact merchant-host allowlist. Present a link the buyer
explicitly opens. Do not automatically redirect, collect payment details, create
orders, or complete purchases. Shopify owns checkout beyond that point.

Keep private tokens and cart secrets server-side, using an opaque Secure/HttpOnly
session cookie. Never expose cart secrets in application URLs, serialized browser
state, browser requests, client persistence, or logs. Treat checkout links as
sensitive transient output and avoid unnecessary persistence or logging.

## Deferred implementation decisions

M2 must select and document token/action storage, atomic consumption across the
supported topology, short TTL and handoff expiry values, canonical fingerprint
fields, retention, and uncertain-provider-result reconciliation. A process-local
fixture store cannot establish restart-safe or multi-instance guarantees. A timeout
after remote success must not cause a blind duplicate mutation. Current Storefront
concurrency semantics need explicit verification before claiming remote guarantees.

## Alternatives and consequences

Single broad approval is rejected because the buyer must review current cart state
before checkout. Planner-controlled writes and browser-only guards are rejected
because neither supplies trusted authorization. Automatic checkout navigation is
rejected because handoff must remain an explicit buyer action.

Two confirmations add interaction cost, and expiry or changed state can require
another review. Clear diffs, focused dialogs, keyboard support, and idempotent
responses should make that cost understandable. Revalidation narrows stale-state
races; it does not reserve stock or control Shopify's eventual checkout total.

## Verification required

Check absent, forged, expired, replayed, wrong-session, wrong-action, and stale
tokens; double-clicks and concurrent tabs; provider timeouts and partial failures;
price/stock/variant/currency/line/total changes; unsafe URLs; and secret leakage in
success and error paths. Required outcomes are zero unconfirmed mutations, 100%
stale approval invalidation in the recorded suite, at most one logical action for
valid duplicates, zero actions for invalid tokens, and zero payment/order completion
paths. At least six Playwright happy/failure paths and the full
[charter acceptance matrix](../charter.md#v01-release-acceptance) remain required.
No such product checks have run at bootstrap.

Related: [architecture](../architecture.md) and [threat model](../threat-model.md).
