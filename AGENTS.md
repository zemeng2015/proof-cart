# Proof Cart contributor and agent instructions

This repository is dedicated to Proof Cart. Read `docs/charter.md`,
`docs/roadmap.md`, and `docs/execution/state.md` before development.

## Product boundary

- Agent recommends. Buyer decides. Shopify completes checkout.
- Use credential-free fixtures by default and official commerce APIs for live integration.
- Keep evidence for displayed price, availability, specifications, and recommendation reasons. Missing facts are unknown.
- The planner has read-only tools and emits a validated proposal. It cannot mutate a cart.
- Enforce approval, session binding, expiry, replay protection, and idempotency on the server.
- Require a first confirmation for cart mutation and a second after revalidation for checkout handoff. Changed state invalidates approval.
- Keep cart secrets and private tokens server-side. Never log them or put them in client persistence.
- A buyer must explicitly open a fresh, HTTPS, merchant-allowlisted checkout URL.
- Do not implement payment, order completion, automatic redirects, scraping, browser RPA, or seller operations.
- Keep other projects, personal planning, credentials, and private source documents out of this repository.

## Delivery

- Use small scoped changes and `codex/` feature branches after the initial bootstrap.
- Keep work in progress at two issues or fewer. Delegate only independent, bounded tasks with explicit file ownership.
- Builders report actual changed files and checks; an independent reviewer inspects artifacts before the main agent accepts them.
- Use current official documentation when choosing framework/API versions. Record and pin the verified baseline at scaffold time.
- Prefer strict TypeScript, React Router server state, typed provider ports, and deterministic planning. Do not introduce a database, agent framework, or extra provider without a demonstrated need.
- Every security/cart/planner change names affected invariants and includes negative-path verification.
- Do not equate a planning document or passing repository hygiene check with implemented product behavior.
- Preserve raw test/evaluation output; never manufacture metrics, demos, releases, or live-store verification.
- Update `docs/execution/state.md` with accepted evidence, unresolved dependencies, and the next bounded task.

## Current verification

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`,
`npm run test:runtime`, and `npm run test:e2e` for applicable application changes.
Install Chromium first; see `docs/development.md` for prerequisites and ports.
Use `npm audit` for dependency changes and `git diff --check` for tracked hygiene.
Retain raw evidence and distinguish the foundation tests from full release gates.

Hydrogen's Vite plugin, preset, Oxygen runtime, and nonce provider are retained,
but `server.ts` uses React Router's handler directly so no Storefront client or
forwarding proxy exists in fixture mode. Preserve the explicit public loader
allowlist and environment boundary. Reevaluate the documented dependency overrides
with actual worker tests whenever the framework graph changes.

The local fixture transport deliberately discards chunked bodies for methods the
worker unconditionally rejects. Before adding any action or accepting any request
body, remove that workaround and verify complete, bounded body forwarding in both
dev and preview. Reliable 405 rejection does not prove request-body transport.

Creating this public repository and its initial issues is authorized. Do not publish private data. Deployment and live-store work need the applicable environment and authorization; never infer permission to make purchases or contact third parties.
