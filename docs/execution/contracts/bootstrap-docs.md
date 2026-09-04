# Task Contract: Bootstrap product documentation

- Objective: translate the supplied Proof Cart charter into concise public English product and architecture documentation.
- Business context: preserve the evidence, approval, and checkout boundary through incremental development.
- Current state: empty repository being bootstrapped; no app or tests exist.
- Dependencies: supplied charter and portfolio plan; root-owned `AGENTS.md`.
- Allowed files: `docs/charter.md`, `docs/roadmap.md`, `docs/architecture.md`, `docs/threat-model.md`, `docs/adr/0001-evidence-and-read-only-planning.md`, `docs/adr/0002-confirmation-and-checkout-boundary.md` only.
- Forbidden areas: all other files, Git operations, external mutations, personal memory, credentials, unrelated repositories.
- Required interfaces: reference milestone IDs M0 (foundation), M1 (storefront/evidence v0.0.1), M2 (cart boundary), M3 (v0.1 release); stable safety IDs INV-01 through INV-09 matching charter order; all product behavior is planned until verified.
- Hard constraints: English-first; no personal career material or local paths; no invented framework versions; keep deterministic fixture path and two human confirmations.
- Safety boundaries: no raw private source copies, deployment, account access, or real store calls.
- Non-goals: implementation, framework scaffolding, or claims of completed product tests.
- Acceptance: public-safe docs cover product scope, full acceptance thresholds, dependency ordering, initial sprint, trust boundaries, token freshness and concurrency risks, at least two ADRs.
- Required checks: compare all nine invariants and numerical release thresholds with supplied charter; inspect relative Markdown links.
- Deliverables: six Markdown files and concise report of actual checks, decisions, omissions, and risks.
- Workspace: current repository, `main` unborn; exclusive ownership of the six allowed paths provides write isolation; main owns all other files.
- Integration: main inspects all documents, then independent reviewer checks repository before first commit/push.
