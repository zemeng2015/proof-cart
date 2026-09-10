# Storefront catalog adapter

PC-04 supplies a server-only read adapter and generated query types. No live shop
has been accessed or verified. Catalog routes are not wired yet: the runnable
application remains the fixture foundation shell. Import this factory only from
server code when implementing those routes; never serialize its configuration.

## Version and code generation

Requests explicitly target Storefront API `2026-04`, matching the schema and base
types bundled with pinned Hydrogen `2026.4.5`. This is a supported stable version,
not the latest `2026-07`; Shopify's [version schedule](https://shopify.dev/docs/api/usage/versioning)
lists support through April 16, 2027. Recheck support before a release. A response
must identify exactly `2026-04` in `X-Shopify-API-Version`; silent version fallback
is rejected.

`npm run codegen` uses `@shopify/hydrogen-codegen` 0.3.3, GraphQL Code Generator
CLI 7.4.1, and GraphQL 16.13.1 against the installed local schema, with no shop or
network introspection. `npm run codegen:check` regenerates and compares the tracked
declarations byte-for-byte. CI fails on drift. Generated variables type-check
transport inputs; parsed mapper outputs are checked against generated result
types. Runtime schemas still validate the untrusted response.

The Shopify preset exposes custom template-pluck hooks not present in the CLI's
narrow public `pluckConfig` type; the configuration retains the preset's hook
type while checking all other CLI fields. The generated declaration file is
excluded from lint and runtime coverage because it contains types only.

A scoped override pins lodash 4.18.1 within the Hydrogen codegen dependency tree
to fix advisories in its older transitive pin. Code generation and dependency
audit must pass whenever updating this override or the generation packages.

## Opt-in authorized development-store setup

Default fixture tests and code generation need no environment file or credentials.
For separately authorized server integration, supply these values through the
server environment or secret manager; do not commit a populated `.env`:

```text
PRIVATE_STOREFRONT_SHOP=your-development-store.myshopify.com
PRIVATE_STOREFRONT_API_TOKEN=<private Storefront token>
```

These names are integration inputs, not an automatic switch for the current shell.
The existing `PROOF_CART_MODE=fixture` application configuration remains unchanged
until route integration. The caller constructs the adapter explicitly:

```ts
import {createStorefrontCatalog} from '../features/catalog/storefront-transport.server';

const result = createStorefrontCatalog({
  merchant: env.PRIVATE_STOREFRONT_SHOP,
  privateToken: env.PRIVATE_STOREFRONT_API_TOKEN,
  context: {market: 'retail', country: 'US', language: 'EN'},
  requestMode: 'buyer',
  buyerIp: trustedPlatformClientIp,
}, {fetch, now: Date.now});
if (!result.ok) throw new Error('Catalog configuration unavailable');
const catalog = result.value;
```

Missing/invalid configuration returns only `invalid_configuration` and issues no
request. The merchant must be one lowercase `*.myshopify.com` host, not a supplied
URL. Buyer mode requires a trusted platform-provided IPv4/IPv6 address; never use
an arbitrary request header as that authority. Background mode is explicit for
requests unrelated to buyer traffic. Private tokens use the official
[`Shopify-Storefront-Private-Token` header](https://shopify.dev/docs/api/storefront/2026-04#authentication),
with the buyer-IP header for buyer traffic. No credentials or IP are returned in
catalog observations or errors.

Use an authorized Headless development channel with product-listing and inventory
read access. Publish synthetic products to that channel. For the optional
material specification, expose product metafield `proof_cart.material` to
Storefront access as `single_line_text_field` or `multi_line_text_field`.
Missing/unsupported material remains unknown; descriptions never supply facts.

## Bounds and failure behavior

- Three fixed named queries: search (products only), product ID, and variant IDs.
  Every product query retrieves at most 20 variants; pagination remains explicit.
- Initial supported contexts are retail markets for US/CA/GB/DE/FR with EN/DE/FR.
  Each factory instance binds one context. The provider's actual
  [`extensions.context`](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/in-context)
  must match; missing or fallback country/language is rejected, not relabeled.
- HTTPS only, redirects rejected, no retries, `no-store`; at most 2 MiB of response
  bytes. Default deadline 5 seconds (configurable 1–15,000 ms) covers fetch and
  streaming response consumption. Late responses are canceled after timeout.
- GraphQL partial errors are rejected with an opaque code, even if some data is
  present. Malformed JSON, incorrect version/context, oversized responses, invalid
  domain facts, or mismatched resources fail closed. No provider error text logs.
- Null inventory is unknown/missing; negative inventory is unknown/invalid.
  Nullable product lookup or any missing variant returns `not_found`. Variant
  lookup cannot prove the total sibling count, so its grouped products always
  have `variantsComplete: false`.

The mocked tests establish mapping, boundary, and error behavior only. Live
permissions, actual query cost, shop localization, and real catalog responses
remain unverified until authorized development-store access is supplied. There is
no approval, cart mutation, payment, or checkout capability in this adapter.
