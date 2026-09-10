# Proof Cart charter

Evidence-backed shopping recommendations with human-confirmed cart mutations.

> Agent recommends. Buyer decides. Shopify completes checkout.

Status: M1 in progress, with a runnable fixture foundation shell. The complete
shopping behavior and release acceptance targets below are not implemented. See
[execution state](execution/state.md) for accepted evidence and remaining work.

## Purpose and users

Proof Cart is an independent, unofficial reference storefront for developers and
merchants exploring buyer-controlled agentic commerce, shoppers who want reasons
and sources for recommendations, and contributors who need a reproducible example.
It is not affiliated with or endorsed by Shopify.

The intended stack is Hydrogen, React Router, React, and strict TypeScript. A
read-only planner turns shopping needs into a validated `CartProposal`. A trusted
server may change a cart only after buyer confirmation. The application stops at
an explicit handoff to Shopify-hosted Checkout; it never completes a purchase.

## Intended flow

1. Enter a natural-language or structured shopping need.
2. Search a read-only catalog and normalize product facts with evidence records.
3. Review at most three candidates, their comparison, and evidence-backed reasons.
4. Review a schema-valid proposal; creating it has no cart side effects.
5. Explicitly confirm the proposed cart action. The trusted server validates the
   approval and executes an idempotent Storefront cart mutation.
6. Revalidate variant, price, inventory, currency, cart lines, and totals. Any
   change invalidates the old approval and presents a diff for renewed review.
7. After a second explicit confirmation against the revalidated state, obtain and
   validate a fresh checkout URL. The buyer explicitly opens Shopify Checkout.

## Safety invariants

These stable identifiers are used in issues, implementation, and verification.

| ID | Required behavior |
| --- | --- |
| INV-01 | Every displayed price, availability, specification, and recommendation reason resolves to an `evidenceId`. Facts without sources are shown as `unknown`. |
| INV-02 | Catalog data and product descriptions are untrusted data, never system instructions or tool instructions. |
| INV-03 | The planner has only read-only catalog tools and may emit only a schema-valid `CartProposal`; it has no cart mutation capability. |
| INV-04 | Cart mutations without explicit buyer confirmation equal zero. |
| INV-05 | A confirmation token binds the session, proposal/cart fingerprint, amount, currency, action, and a short TTL. It is consumed at most once. |
| INV-06 | Changes to price, inventory, variant, currency, or cart lines invalidate the previous confirmation and show a diff; totals are also revalidated before handoff. |
| INV-07 | Cart secrets remain in the HttpOnly/server-side session boundary. They never enter application URLs, logs, or client persistence. Prefer an opaque HttpOnly session cookie with the cart secret held server-side. |
| INV-08 | The checkout URL is freshly obtained and validated against an allowlist of HTTPS merchant hosts before the buyer can explicitly open it. |
| INV-09 | The application stores no email, address, or payment information and has no automatic order-placement or payment-completion code path. |

## v0.1 scope

- A responsive, keyboard-accessible search, product-detail, and comparison UI;
  React Router SSR, loaders, actions, fetchers, and error boundaries.
- `CommerceCatalogPort`, a credential-free fixture adapter, and a Shopify
  Storefront API adapter with GraphQL code generation and typed domain mapping.
- Validated shopping intent, tool output, and `CartProposal`; a deterministic
  planner by default and no more than one optional model provider.
- An evidence ledger and evidence drawer, including source, retrieval time, and
  provenance for every claim; comparison of at most three candidates.
- A server-enforced cart state machine, trusted cart executor, two explicit
  confirmations, revalidation and change diffs, expiry/replay/tamper checks,
  idempotency, and a fresh checkout handoff.
- Vitest and Testing Library checks, MSW/fixture contract checks, Playwright E2E,
  adversarial evaluations, accessibility and performance verification, and CI.
- English-first documentation, at least two ADRs, a threat model, MIT licensing,
  contributor and security files, a recorded demo, and a verified `v0.1.0` release.

The scaffold must verify and pin the current stable, compatible framework and API
baseline against official documentation. No version is selected by this charter.
An optional model is not required for Done. Stable Storefront API support is
required; preview program access is not a release dependency.

## Non-goals and later options

Excluded from v0.1: payment collection, order completion, `complete_checkout`,
automatic redirects or purchases; universal or multi-merchant carts; buyer
accounts, order tracking, returns, merchant administration; scraping, browser
RPA, seller workflows; multi-agent product architecture, vector databases, RAG
platforms, fine-tuning, Java microservices, Kafka, and a database platform.
Models must not invent product facts. No production-scale or official-Shopify
claims are permitted without evidence and authorization.

Later options are UCP/Storefront Catalog MCP adapters, Oxygen previews, one small
Shopify Function for cart policy, and broader localization/multi-currency UX.
Do not introduce Redux, XState, LangChain, a database, or another provider unless
observed requirements justify it. This repository stays independent from other
projects and contains no private source documents, personal planning, or reused
seller permissions/data.

## v0.1 release acceptance

All rows are targets, not reported results. Scripts or CI must retain raw output,
with the tested environment and fixture/live limitations. Passing a documentation
check does not establish any product behavior.

| Behavior and safety | Required result |
| --- | --- |
| End-to-end demonstration | Query → recommendation → proposal → two confirmations → Shopify Checkout in at most 5 minutes; stop before payment or order completion. |
| Fact provenance | 100% coverage for displayed prices, availability, specifications, and recommendation reasons; missing facts shown as `unknown`. |
| Critical hallucinations | Zero unsupported price or inventory facts. |
| Unconfirmed mutations | Zero. |
| Stale approval rejection | 100% invalidation after relevant cart state changes. |
| Tamper, replay, and double-click | Invalid tokens execute zero actions; duplicate valid submissions produce at most one logical action. |
| Prompt injection and tool abuse | 100% of the recorded adversarial cases blocked. |
| Payment or order-creation paths | Zero within the application. |
| Secret handling | No private tokens or cart secrets exposed in browser bundles, browser-visible network traffic, application URLs, client persistence, or logs. |

| Tests and experience | Required result |
| --- | --- |
| Core branch coverage | At least 85% for policy, state machine, and provenance. |
| Fixed shopping-intent evaluations | At least 20. |
| Adversarial cases | At least 12. |
| Playwright happy/failure paths | At least 6. |
| Lighthouse Accessibility | At least 95. |
| Fixture-preview Performance | Target at least 85; report actual result and any shortfall explicitly. |
| Keyboard use | Complete flow without a pointer; modal focus restores correctly. |
| Clean clone to fixture demo | At most 10 minutes. |

Release artifacts include fixture and authorized Storefront-mode verification, a
decision trace (intent → evidence → proposal → cart diff), a failure/evaluation
matrix, known limitations, raw results, a 90–120 second English demo, a 60–90 second
README GIF, and the `v0.1.0` tag. Commands `npm run setup`, `npm test`,
`npm run demo:fixture`, and `npm run test:e2e` currently exercise the foundation
shell; extend them with each feature. A live-store dependency must be recorded
as unresolved until tested with an authorized environment.

Before package distribution or a release, check the working name `proof-cart`
against GitHub/npm naming and basic trademark conflicts. Public repository
creation alone is not a claim that those release checks are complete.

See the [roadmap](roadmap.md), [architecture](architecture.md), and
[threat model](threat-model.md) for delivery and verification detail.
