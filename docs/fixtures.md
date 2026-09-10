# Offline fixture catalog

`createFixtureCatalog({now, maxAgeMs?})` in
`app/features/catalog/fixture-adapter.ts` exposes the read-only
`CommerceCatalogPort`. The caller supplies a trusted millisecond clock. Its
default freshness limit is 60,000 milliseconds. This adapter adds no dependencies,
credentials, network transports, environment reads, cart capabilities, or routes.

The dataset is entirely synthetic: source kind `fixture`, dataset
`proof-cart-demo`, version `v1`. Only `{market: 'retail', country: 'US',
language: 'EN'}` is supported. Schema-valid alternative contexts return
`provider_error`; malformed inputs return the boundary's `invalid_input`. Prices
are fixed USD observations and are never relabeled for another country or market.
Canonical URLs are absent. No merchant or customer data is included.

| Product ID suffix | Variant ID suffixes | Scenario |
| --- | --- | --- |
| `ceramic-cup` | `cup-blue`, `cup-white` | Exact USD 19.999; both available; white inventory count unknown |
| `steel-bottle` | `bottle` | Known price, availability, inventory, and stainless steel material |
| `canvas-bag` | `bag` | Available, with unknown inventory count and backorder status |
| `free-guide` | `guide` | Known zero price; material and inventory count unknown |
| `price-unknown` | `price-unknown` | Price, availability, inventory count, and backorder status unknown |
| `sold-out` | `sold-out` | Explicitly unavailable with a known zero inventory count |
| `backorder` | `backorder` | Available despite zero inventory; explicit backorder; quantities 2–10 in increments of 2 |
| `injection` | `injection` | Untrusted imperative description; sourced USD 24 price and cotton material |

Product IDs start with `fixture:product:` and variant IDs with
`fixture:variant:`. All variants except the backorder example use quantity rules
minimum 1, no maximum, increment 1. Material specifications are explicit authored
facts; missing material is unknown. A description never supplies evidence or
changes the adapter's capabilities (INV-01, INV-02, INV-03).

Search lowercases the query and matches every whitespace-separated token as a
substring of the product title or known specification values. Descriptions are
not searched or interpreted. Results use deterministic title then ID ordering;
variant order is the static dataset order. The port enforces nonblank queries of
at most 256 characters and limits from 1 to 20. No matches is a successful empty
snapshot. `productsComplete` reports whether all matching products fit the limit.

Product lookup returns one complete product or `not_found`. Variant lookup
returns exactly the requested variants grouped by their owning product, or
`not_found` if any ID is absent. A grouped product's `variantsComplete` is false
when sibling variants were omitted. Lookup snapshots set `productsComplete` to
true because the complete requested result is present; this does not assert that
the snapshot contains the entire catalog.

Each successful operation captures the clock once for its new observation and
all evidence records. Stable evidence IDs bind dataset version, subject, and
field. The ledger contains exactly one record per returned known fact, with no
entries for unknown facts or omitted variants/products. The existing boundary
validates source, context, bindings, fingerprint, and freshness, rereading the
clock after snapshot creation. This second read does not restamp observations.
Invalid initial clock/TTL configuration yields `provider_error`; a clock that
becomes invalid, moves backward, or exceeds the TTL during boundary validation
yields `invalid_response`. Thrown clock errors are safely reduced to
`provider_error` without exposing exception text.

Identical clock, query, and context produce identical fingerprints; a changed
observation timestamp changes the fingerprint. Parsed results are immutable and
requests cannot mutate the static dataset. Fixture checks establish offline
contract behavior only, not live Storefront behavior or release acceptance.
