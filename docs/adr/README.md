# Architecture Decision Records

An ADR records one decision that is hard to reverse: what was decided, why, and what follows from it. Day-to-day decisions and open questions stay in [`../memory.md`](../memory.md).

| ADR                               | Title                                  | Status   |
| --------------------------------- | -------------------------------------- | -------- |
| [0001](0001-toolchain.md)         | Toolchain and Phase 0 baseline         | Accepted |
| [0002](0002-import-boundaries.md) | Enforcing layer boundaries with ESLint | Accepted |

## Adding an ADR

1. Copy [`template.md`](template.md) to `NNNN-short-title.md` using the next number.
2. Open a pull request. Status starts as `Proposed` and becomes `Accepted` when merged.
3. Do not rewrite an accepted ADR. Supersede it with a new one and link both ways.

ADRs already called for by the docs: invoice-line rounding (`memory.md` O-04) and scheduled backup while the device is locked (O-11).
