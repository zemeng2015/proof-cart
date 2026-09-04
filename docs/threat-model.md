# Threat model

Status: planned controls and verification. None of these controls is implemented or
verified at bootstrap. See [execution state](execution/state.md) for actual evidence
and [charter](charter.md#safety-invariants) for invariant definitions.

## Assets and boundaries

Protect the integrity and provenance of displayed facts, buyer intent and approval,
cart contents and amounts, session binding, one-use confirmation and action records,
private API credentials, cart secrets, and checkout destinations. Avoid collecting
email, address, or payment information altogether.

The browser is untrusted for authoritative state and approval enforcement. Catalog
content, model output, and API responses require validation. The planner is a
read-only component with no cart or checkout capability. Only the trusted server
may validate approvals and execute cart mutations. Shopify-hosted Checkout is an
external boundary where this application's purchase flow ends.

Attackers may control descriptions, search inputs, proposal requests, confirmation
payloads, browser state, or timing. Benign double-clicks, multiple tabs, changing
inventory, and provider failures can violate the same invariants as malicious
requests and must be tested. Host compromise and Shopify's internal payment
processing are outside this reference app's demonstrated guarantees.

## Threats, planned controls, and negative evidence

| Threat | Planned control | Required negative-path verification | Invariants |
| --- | --- | --- | --- |
| Fabricated or detached claims | Evidence references survive normalization and rendering; unsupported fields are `unknown`; reasons cite facts and derivation. | Missing price/specification, stale observation, fabricated evidence ID, and unsupported model reason cannot appear as verified facts. | INV-01 |
| Description/prompt injection | Treat descriptions as data; bounded allowlisted read-only tools; schema validation. | Instructions embedded in product text cannot alter system rules, obtain secrets, execute a write, or invent a tool. | INV-02, INV-03 |
| Forged planner output | Validate intent, tools, quantities, variants, proposal shape, and evidence linkage server-side. | Malformed outputs, extra write commands, invalid quantities, unknown variants, and exhausted tool budgets fail closed. | INV-01, INV-03 |
| Unconfirmed or cross-site cart mutation | Trusted executor requires valid explicit approval; session/origin/CSRF validation on state-changing routes. | Direct POST, forged client state, absent token, and cross-origin/session requests execute zero mutations. | INV-04, INV-05 |
| Token tampering or misuse | Bind session, action, fingerprint, amount, currency, short TTL, and one-use server record. | Tampered, expired, wrong-session, wrong-action, altered amount/currency/fingerprint tokens reject without effects. | INV-05 |
| Replay, double-click, concurrent tabs | Atomic token consumption/action reservation; stable idempotency and result reconciliation. | Concurrent valid duplicate requests yield at most one logical action; spent tokens cannot authorize another action, including after restart if supported. | INV-04, INV-05 |
| Stale approval / time-of-check race | Revalidate trusted state at approval consumption; invalidate and show diff; serialize conflicting local actions. | Change price, stock, variant, currency, quantities, lines, or total after review and after handoff preparation; every old approval rejects. | INV-05, INV-06 |
| Provider timeout or partial failure | Explicit uncertain/failed state and reconciliation before retry; validate provider results. | Simulate timeout before and after remote success, partial errors, and unavailable cart; no duplicate logical effect or false success. | INV-04, INV-05, INV-06 |
| Secret exfiltration | Server-only secrets; opaque HttpOnly session; safe loader serialization and redacted telemetry. | Inspect bundles, HTML, browser network, URL/history, client persistence, and normal/error logs for seeded secret markers. | INV-07 |
| Open redirect or stale checkout destination | Fresh server retrieval; exact HTTPS merchant-host allowlist; explicit buyer navigation. | Reject HTTP, deceptive hostname, unapproved host/port, credentials in URL, malformed URL, client-supplied URL, and expired handoff. | INV-08 |
| Accidental purchase or sensitive-data collection | No payment/order creation endpoints, checkout completion tools, automatic redirects, or buyer-profile persistence. | Route/tool inventory and E2E prove app stops at handoff; verify no email/address/payment fields or writes. | INV-09 |

## Freshness and concurrency decisions required in M2

Define the source of authoritative time, short confirmation TTLs, canonical
fingerprint content, token lifecycle, and handoff freshness window. Expiry must be
checked by the server. A token cannot be extended by changing client timestamps.
Price/availability snapshots carry retrieval times; a checkout link is not a
reservation of inventory or a guarantee that Shopify will never recalculate totals.

Choose atomic consumption semantics for the actual deployment topology. Signing a
token does not prevent reuse; process-local memory does not survive restarts or
coordinate multiple instances. Track concurrent requests and unknown provider
outcomes without automatically reusing approval to create a second effect. Review
Storefront's current concurrency behavior before claiming any remote atomicity.

Inspect privacy-sensitive fields in API errors and telemetry as well as success
paths. Do not store real secrets as test fixtures. Use conspicuous synthetic markers
for leakage checks. Run fixture cases without credentials by default; authorized
development-store tests must avoid collecting personal information or completing
orders.

## Evidence and limits

At least 12 adversarial cases, at least 6 Playwright happy/failure paths, and at
least 20 fixed shopping intents are release requirements, alongside the other
[charter acceptance thresholds](charter.md#v01-release-acceptance). The matrix above
describes categories; it is not a report that tests exist or that counts were met.
Record precise scenarios, raw output, runtime/API version, and fixture/live mode.
The required 100% blocking and invalidation rates describe the recorded suite,
not proof against every possible attack or production condition.

An independent review must examine the implementation and negative-path artifacts.
Any unresolved token storage, remote concurrency, live API, or environment dependency
remains explicit in execution state and release limitations. Never report a
repository hygiene check as evidence of these runtime guarantees.
