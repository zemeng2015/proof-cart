# Catalog domain and evidence contract

Status: PC-02 implementation in progress; independent acceptance is pending.
These primitives are not yet connected to a provider, planner, route, or cart.

## Money and unknown facts

Money uses a nonnegative decimal string with at most 30 integer and 18 fractional
digits. Parsing canonicalizes zeros without rounding; arithmetic uses internal
BigInt coefficients and returns JSON-safe strings. Overflow and mixed currencies
are errors. USD, CAD, EUR, and GBP are the explicit initial application subset,
not a claim to support Shopify's entire currency enum.

A fact is either `known` with a value and evidence ID, or `unknown` with a reason
(`missing`, `not_requested`, `restricted`, or `invalid`). Zero and false remain
known values. Selected-variant price, availability, backorder status, inventory
quantity, and quantity rules are separate facts. Product descriptions remain
plain untrusted text; parsing never extracts specifications or instructions from
them. Product and variant IDs distinguish fixture IDs and Shopify resource GIDs.
Snapshots enforce unique identities and variant ownership.

Zod 4.5.4 is a pinned runtime dependency for strict input validation. Parsed domain
objects and nested arrays are defensive copies and frozen. Unknown object fields
are rejected. This validation does not authenticate data supplied by a caller.

## Evidence snapshots

Each known price, availability, backorder, inventory, quantity-rule, or structured
specification fact requires exactly one ledger record. The record binds its ID to
the subject type and ID, field path, normalized value, source, market/country/
language context, and retrieval time. Missing, duplicate, foreign, substituted,
and unused records are rejected. Unknown facts do not acquire invented evidence.

A snapshot is one observation batch: all records share its retrieval timestamp.
Adapters must construct a new batch for a fresh fetch; restoring a cache must
preserve the original time. Callers inject the current clock and maximum age.
Future observations, unsafe clock values, and ages above the maximum are rejected;
the exact maximum-age boundary is valid.

The SHA-256 fingerprint covers the entire observation and evidence ledger. Object
keys and evidence IDs are sorted deterministically; product/variant array order
is retained. The fingerprint field itself is excluded. Binding every record
inside this single digest avoids self-referential per-record hashes. Validation
rechecks both relationships and the digest after JSON restoration. A digest
proves consistency, not authenticity or approval: a trusted server adapter must
supply the data, and a client cannot authorize an action by recomputing a digest.

Sources contain either fixture dataset/version or Storefront merchant/API version.
API-version syntax is only a format check; PC-04 must verify the supported official
version. Canonical product URLs require HTTPS without credentials, nondefault
ports, query strings, or fragments. This is not the checkout-host allowlist.

## Read-only provider boundary

`CommerceCatalogPort` exposes only `search`, `getProduct`, and `getVariants`.
Search accepts at most 256 raw query characters, then trims and rejects empty queries, with a limit of
1–20 products. Variant lookup accepts 1–20 unique variant IDs. There is no generic
execute method, mutation method, or provider credentials in the input.

The wrapper parses input before invoking the adapter, validates the complete
returned evidence snapshot after the adapter finishes, and checks its source
against trusted server configuration and its context against the request.
Product lookups must return the one requested product. Variant lookups must
return exactly the requested variants in their owning products, without unrelated empty product containers; adapters must
mark truncated variant collections incomplete. Search enforces the requested
product limit. An empty successful search remains distinct from a missing lookup.

Results expose only `invalid_input`, `not_found`, `timeout`, `provider_error`, and
`invalid_response`. Extra provider error fields are rejected and thrown errors
are replaced with an opaque code. Adapters own network deadlines and cancellation;
they must return the safe timeout code. The wrapper itself does not fetch, retry,
or establish a transport deadline. Source configuration is trusted setup input;
invalid configuration fails construction rather than creating a working port.

## Data-only CartProposal

The strict version-1 proposal contains an ID, `add_lines` action, one to three
distinct variant lines with integer quantities 1–10, currency, evidence IDs,
snapshot fingerprint, and expiry. Validation restores and checks the supplied
snapshot, requires the exact fingerprint, and prevents expiry from extending
beyond the observation's freshness horizon. Expiry at the current instant is
already expired. This is proposal validity, not an approval-token TTL.

Each selected variant needs known price, known true availability, and a known
quantity rule. Quantity must satisfy minimum, maximum, and increment divisibility.
Rule bounds must themselves be multiples of the increment. The
[official QuantityRule reference](https://shopify.dev/docs/api/storefront/2026-07/objects/QuantityRule)
defines divisibility; the application additionally rejects maximum below minimum.
Missing inventory is an explicit `inventory_unknown` notice. Known insufficient
inventory is rejected even when a backorder flag exists. Unknown backorder status
and known backorder status produce separate notices; neither implies stock.
These conservative proposal policies do not replace action-time revalidation.

All known selected-variant critical facts must appear in rationale evidence IDs.
Additional evidence can only concern a selected variant or a selected product's
structured specifications. Valid ledger records from unselected products or
sibling variants are rejected. The validator computes an exact merchandise
subtotal with overflow checks; it does not claim shipping, tax, discounts, or a
final checkout total. Its immutable output grants no cart mutation authority.

## Verification and remaining acceptance

`npm run test:coverage` records text, JSON, JSON summary, and LCOV results under
`coverage/`, using pinned `@vitest/coverage-v8` 5.0.0. Each implemented catalog/cart
source file has an enforced 85% branch threshold; type-only `domain.ts` is excluded.
The current tests cover 124 cases with 95.21% aggregate branch coverage. Future
planner/state-machine files and their acceptance requirements remain outstanding.

Independent acceptance, adapter contract fixtures, provider mapping, planner
behavior, UI evidence coverage, and full-flow tests remain separate gates.
Passing domain tests cannot establish cart authorization, live Shopify behavior,
or the complete shopping flow.
