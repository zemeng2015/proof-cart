# PC-02 exact-money implementation record

Date: 2026-09-10. Status: implemented and locally verified; independent review
is pending. This prerequisite does not complete PC-02 or the shopping flow.

The main agent implemented this bounded primitive after the delegated handoff
produced no files and its write ownership was withdrawn. No dependency was added
for the arithmetic module. The full domain/evidence/port/proposal scope remains.

## Behavior

`app/features/catalog/money.ts` parses strict two-field money values, normalizes
decimal strings, and performs exact addition, comparison, and multiplication.
It uses bounded integer coefficients internally and returns JSON-safe, frozen
money objects. All public operations validate operands at runtime and return
fixed error codes without echoing input. Accessor properties are not evaluated.

The v0.1 application policy supports USD, CAD, EUR, and GBP, with positive integer
line quantities from 1 through 10. Inputs allow at most 30 integer digits and
18 fractional digits before normalization. Overflow rejects; mixed currencies
never convert or default. Zero is a valid amount, whereas missing data is invalid.
There is no rounding to display precision: `19.999 * 3` is exactly `59.997`.

## Observed verification

On Windows with Node 24.20.0:

- Targeted Vitest money suite: 28 tests passed.
- Full Vitest suite: 57 tests across 5 files passed.
- Strict typecheck, ESLint with zero warnings, and production build: passed.
- Raw output: ignored `.local/money-{typecheck,lint,test,build}.log`.

Tests cover exact arithmetic, canonical zeros, decimal/quantity bounds, overflow,
comparison beyond binary floating-point precision, strict input rejection,
accessor rejection, unsupported/mixed currencies, defensive copying, frozen
outputs, and JSON serialization. No browser behavior changed, so the existing
scaffold browser checks were not rerun for this isolated arithmetic module.

Product/variant schemas, evidence binding and freshness, the read-only catalog
port, proposal validation, and provider adapters are still outstanding. These
tests establish no fact-provenance, cart-approval, or release coverage metric.
