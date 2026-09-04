# Foundation research baseline

Checked 2026-09-04. These are research observations, not an installed or tested
application baseline. Recheck at implementation time and commit a lockfile.

## Working name

The repository uses `proof-cart` as a working name. Existing projects include
[loopassembly/proofcart](https://github.com/loopassembly/proofcart), an agentic
checkout toolkit, and [ddahlin/ProofCart](https://github.com/ddahlin/ProofCart), an
e-commerce test oracle. The similarly named commercial
[CartProof](https://cartproof.app/) operates in Shopify storefront QA.

The exact npm registry endpoints for [proof-cart](https://registry.npmjs.org/proof-cart)
and [proofcart](https://registry.npmjs.org/proofcart) returned 404 at the check.
This neither reserves the names nor establishes trademark clearance. Revisit the
name before package publication or broader product promotion.

## Candidate framework baseline for PC-01

- Stable [Hydrogen package metadata](https://registry.npmjs.org/@shopify/hydrogen)
  reported `2026.4.5`, with React Router peer range `~7.16.0`.
- [Hydrogen generator metadata](https://registry.npmjs.org/@shopify/create-hydrogen)
  reported `5.0.39`.
- The [released skeleton manifest](https://github.com/Shopify/hydrogen/blob/2a2738ba20487ccc07006815fe40e93b24cb5f08/templates/skeleton/package.json)
  uses React Router `7.16.0`, Shopify CLI `3.93.2`, and Node `^22 || ^24`.
- [Node's release index](https://nodejs.org/dist/index.json) reported Node
  `24.20.0` LTS with npm `11.19.0`, a candidate reproducible runtime.
- Start from the [official Hydrogen setup documentation](https://shopify.dev/docs/storefronts/headless/hydrogen/getting-started).
  Do not independently install React Router's newest major or assume the
  generator's remote Mock.shop example is the required local fixture adapter.

No dependency has been installed and no compatibility build has run in M0.
