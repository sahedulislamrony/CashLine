# 0003 — Money range and rounding of quantity × unit amount

- Status: Accepted
- Date: 2026-10-14

## Context

The spec (§8) requires exact money arithmetic, a defined and tested numeric range, and a recorded rounding rule for invoice lines, where a quantity with decimals (1.5 hours) multiplies a unit amount. `memory.md` O-04 proposed a default.

## Decision

**Representation.** `Money = { minor: bigint, currency }`. Amounts are integer minor units; there is no floating point in the domain.

**Range.** A Money holds from −(2⁶³ − 1) to 2⁶³ − 1 minor units. This is the SQLite 64-bit signed integer range, made symmetric so that negating a valid amount is always valid. Any operation whose result leaves the range throws `MoneyRangeError`; nothing wraps or saturates.

**Currencies.** Add, subtract, compare and sum require the same currency and throw `CurrencyMismatchError` otherwise. There is no conversion.

**Quantity.** A quantity is a non-negative decimal with at most three decimal places, held exactly as thousandths. More than three decimals is rejected, not rounded.

**Rounding.** A line amount is `unit amount × quantity`, rounded **half away from zero** to the currency's minor unit: 166.5 becomes 167 and −166.5 becomes −167. A discount line is therefore the exact mirror of the same charge line.

**Totals.** An invoice total is the sum of its rounded line amounts. Totals are never recomputed from unrounded values, so the lines a client sees always add up to the total.

## Alternatives considered

- **Half to even (banker's rounding):** removes bias over many lines, but surprises people checking an invoice by hand and is not what most invoicing tools show.
- **Round the total, not the lines:** printed lines can then fail to add up to the printed total.
- **`number` with safe-integer checks:** caps at about 9 × 10¹⁵ minor units and invites accidental float arithmetic.
- **A decimal library:** an extra dependency for what integer arithmetic already does exactly.

## Consequences

- One rounding mode exists. Adding another (for example for a tax helper) needs a new ADR.
- Splitting an amount across parts (allocation with remainders) is not defined here; decide it when a feature needs it.
- Values crossing a JSON or SQLite boundary must be carried as integers or strings, never as JavaScript numbers.
- `bigint` must work in Hermes on both platforms. Verified in Jest (Node) only; confirm on device with the first screen that shows an amount.
