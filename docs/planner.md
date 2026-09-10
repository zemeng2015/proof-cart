# Deterministic shopping planner

The PC-06 planner is a server-side, read-only domain service. Its output is data,
not approval to change a cart. UI integration follows in the evidence/planning
slice; the existing catalog routes do not invoke it yet.

## Intent and alternatives

The structured intent accepts a search query, currency, quantity (one through ten,
default one), optional `maxTotal` money, and optional exact material constraint.
Unknown keys are rejected. `maxTotal` uses the intent's currency and limits the
merchandise subtotal for the requested quantity of each alternative. It excludes
tax, shipping, discounts, and any unobserved checkout charges.

Material matching ignores case and surrounding whitespace, but is otherwise
exact. A known value of `Cotton canvas` does not prove a request for pure cotton,
and an absent material does not satisfy a material constraint. The planner does
not interpret natural-language claims, descriptions, delivery dates, ratings,
environmental claims, or other unsupported constraints as established facts.

Candidates are alternatives, not a shopping bundle: at most three distinct
products, one eligible variant per product, each with its own one-line
`CartProposal`. Ranking uses exact merchandise subtotal, then stable product and
variant IDs. It does not claim global best price or completeness beyond the
retrieved catalog page. Incomplete result and variant sets have explicit notices.

Known price, sale availability, and quantity rules are required. Existing proposal
validation rejects unavailable variants, incompatible currency or quantities, and
known insufficient inventory. Unknown inventory remains an explicit notice and
never becomes a claim that stock exists. Exclusions retain bounded reason codes.

## Evidence and authority

Each recommendation reason is structured as a code and an evidence ID for price,
availability, or a matched material. A candidate retains the validated snapshot,
or references the result's shared snapshot, and its proposal binds the snapshot
fingerprint and all required selected facts. Proposals expire within the
60-second evidence freshness window. Fixed inputs, clock, and snapshot produce
deterministic output.

Catalog descriptions are never parsed for instructions, tool names, constraints,
prices, or reasons. A successful proposal is still subject to later server-held
authority, revalidation, and both buyer confirmations before checkout handoff.
This service has no cart, checkout, order, payment, or LLM capability.

## Tools and verification

The tool boundary receives trusted catalog, source, context, and clock dependencies.
Only `search`, `getProduct`, and `getVariants` are allowed. Inputs and returned
snapshots are validated against those trusted dependencies. Wrong source/context,
identity, freshness, or fingerprint is rejected with an opaque error.

Each run has at most three dispatch attempts before denial and a five-second
overall deadline. Denied requests cannot grow trace memory without bound. The
planner uses one bounded search; later refinements must preserve the same limits.
Trace records contain operation names and outcome codes, not raw user input,
untrusted descriptions, provider exceptions, or credentials.

The deadline bounds the returned result. The existing catalog port has no abort
signal, so an already dispatched read may finish after a timeout; its provider
transport retains its own deadline. Late completion cannot issue another tool
call or produce a successful late planner result. Clock readings must remain
valid and monotonic, and final output checks snapshot and proposal expiry again.

Run `npm run test:eval` for the fixed intent/adversarial suite and
`npm run test:coverage` for integration with the per-file 85% branch gate. Raw
evaluation results are retained in `test-results/evals/planner.json`; CI uploads
that directory with its other test artifacts. These synthetic evaluations do not
prove live-store behavior or complete shopping-flow acceptance.
