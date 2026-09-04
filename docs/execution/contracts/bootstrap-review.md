# Task Contract: Independent repository foundation review

- Objective: independently review the actual M0 foundation before public publication.
- Business context: initialize a safe and honest development baseline for Proof Cart v0.1.
- Current state: docs-only foundation, no application scaffold or claimed runtime checks.
- Dependencies: builder's six product docs and main-owned root/backlog/CI files.
- Allowed files: read all tracked/untracked project files and supplied source charter.
- Forbidden areas: all writes, commits/pushes, account mutations, private memory, other repositories.
- Required interfaces: INV-01–INV-09, M0–M3, PC-01–PC-08, working Markdown links.
- Hard constraints: inspect actual artifacts, not just builder reports; identify numeric omissions and false claims.
- Safety boundaries: public-safe product content only; zero secrets, local personal paths, career context, or unrelated source import.
- Non-goals: application implementation, dependency upgrades, legal review, executing live-store actions.
- Acceptance criteria: scope and constraints match charter; full long-goal Done definition; first sprint dependency order; source cannot be confused with accepted implementation; no blocking publication issue.
- Required checks: source-versus-doc invariant/threshold comparison, relative link targets, whitespace review, public-content inspection, workflow permissions and behavior.
- Artifact: complete current workspace; docs-only initial commit candidate.
- Branch/worktree: shared read-only `main` in current repository; no integration authority.
- Required gates: Scope, Architecture, Safety, Test (hygiene only), Regression (source preservation), Integration, Product Acceptance (M0 only).
- Independence: do not implement the original task or trust builder assertions as sole evidence.
- Report: PASS / FAIL / REWORK REQUIRED, each gate, inspected files/commands, blocking findings, nonblocking risks, required rework.
