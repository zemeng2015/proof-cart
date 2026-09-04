# Security policy

Proof Cart is pre-release. No production deployment or supported stable version
exists, and the security properties in the [threat model](docs/threat-model.md)
are design requirements, not completed verification claims.

Use GitHub's [private vulnerability reporting](https://github.com/zemeng2015/proof-cart/security/advisories/new)
for suspected vulnerabilities. Do not put exploit details, tokens, cart secrets,
or personal information in public issues. If private reporting is unavailable,
open a public issue requesting a private reporting channel with no sensitive details.

Include the affected revision, a minimal synthetic reproduction, expected and
actual behavior, and which safety invariant appears violated. Never use a real
payment or purchase to demonstrate a report. No bounty or response deadline is
promised.

Secrets, checkout host validation, replay/idempotency, stale approvals, CSRF,
catalog prompt injection, and unsupported recommendation claims are within scope.
