# ADR 0001: Evidence-backed facts and read-only planning

- Status: accepted; catalog/evidence/planner services implemented and tested.
  Recommendation UI and complete release verification remain pending.
- Scope: M1 and later changes to catalog, evidence, and planner behavior.
- Invariants: INV-01, INV-02, INV-03.

## Context

A useful recommendation needs traceable price, availability, specifications, and
reasons. Catalog text may be incomplete, stale, promotional, or hostile. A planner
that can invent facts or execute writes makes factual mistakes consequential and
makes approval difficult to audit.

## Decision

Normalize catalog observations behind `CommerceCatalogPort`, with a credential-free
fixture adapter and an official Shopify Storefront adapter. Retain evidence IDs,
field values, source/API metadata, retrieval time, and snapshot hashes. Each UI
claim resolves to evidence; missing facts render as `unknown`. Derived recommendation
reasons cite the underlying facts and explain the derivation without promoting
unverified catalog claims to known truth.

Use a deterministic planner as the default. Validate shopping intent, bounded
read-only tool inputs/outputs, and the final `CartProposal`. Compare at most three
candidates. Treat catalog descriptions as untrusted data. Do not give the planner
cart executor references, secrets, write tools, or checkout tools. A proposal is
data and creates no side effect.

At most one model provider may be added later behind the same validated interface.
It must pass the same fact, tool, and adversarial constraints; a model is not a
release prerequisite. Defer UCP/Catalog MCP until the stable fixture/Storefront
boundary is demonstrated.

## Alternatives and consequences

Free-form model recommendations are rejected because they cannot establish the
required evidence coverage. A write-capable shopping agent is rejected because
planner output is not buyer authorization. Adding an agent framework or vector
database now would add dependencies without resolving either problem.

Evidence adds mapping and UI work, and unknown data can reduce recommendation
coverage. The tradeoff is a reproducible, inspectable decision trace and a useful
demo without credentials or a live model. An observation records what the source
reported; it is not a guarantee of future availability or independent product truth.

## Verification required

Adapter contracts, missing-field and malformed-output cases, evidence-link checks,
fixed intent evaluations, and prompt-injection/tool-abuse cases must verify this
decision. The release requires 100% displayed-fact evidence coverage, zero critical
price/inventory hallucinations, at least 20 intent evaluations, and at least 12
adversarial cases with all recorded attacks blocked. Raw output must be preserved.
Current synthetic checks are recorded in [PC-06 verification](../execution/acceptance-pc06.md);
they do not establish live-store or complete shopping-flow behavior.

Related: [charter](../charter.md), [architecture](../architecture.md), and
[threat model](../threat-model.md).
