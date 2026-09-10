# Contributing

Proof Cart is building its first storefront milestone. Read the [charter](docs/charter.md),
[roadmap](docs/roadmap.md), and [agent instructions](AGENTS.md) before proposing work.

Choose one scoped issue and describe the observable behavior it changes. Keep work
in progress at two issues or fewer and changes small enough for independent review.
Use a feature branch (`codex/` for agent-authored work) and submit a pull request
with the problem, decision, actual validation, and remaining limitations.

For cart, planner, or security changes, name the affected safety invariants and
include negative tests. Reviewers must inspect the code and evidence rather than
treating a green status or author report as product acceptance. Update relevant
architecture decisions and execution state when a boundary changes.

Follow [local development](docs/development.md) for setup, type checking, lint,
unit tests, worker builds, runtime checks, and browser tests. Also run
`git diff --check`. Do not add empty tests to make CI green or report metrics not measured.

Use synthetic fixtures and official API contracts. Do not upload credentials,
cart secrets, personal information, private planning documents, or real merchant
data. Report vulnerabilities through the [security policy](SECURITY.md).

Contributions are provided under the repository's [MIT License](LICENSE).
