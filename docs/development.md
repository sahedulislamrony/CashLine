# Cashline — Development Plan

Status: aligned with [`project-specifications.md`](project-specifications.md) on 2026-10-13.

## 1. Development philosophy

Build incrementally and deliver the product promise end to end before building convenience and polish. Each feature follows:

```text
Requirement → Design → Clarify unknowns → Tests → Implementation
→ Unit tests → Integration tests → Manual verification → Security review → Docs → Commit
```

Use test-driven development for: money and currency arithmetic, dates, invoice totals and derived status, payment allocation, the cash-flow outlook, recurrence, encryption and key handling, migrations, backup/restore, and entitlement logic.

## 2. Rules for contributors and coding agents

1. Read `project-specifications.md`, `architecture.md`, `security.md` and this file before changing the project. Read `design-system.md` before changing UI. Read `memory.md` for current decisions and open items.
2. Check current documentation before using version-sensitive APIs; never invent package APIs or security guarantees.
3. Never silently change requirements. If a decision is needed, add it to `memory.md` with options and a recommended default, then ask the maintainer.
4. Keep changes small and feature-scoped; avoid unrelated refactoring.
5. Write tests before or alongside implementation; never claim a test passed unless it ran, and never claim an external service was tested if it was not.
6. Update `memory.md` and the relevant doc when a decision is made or a milestone is verified.
7. Keep platform code in `src/platform/`; domain code stays pure. Respect the import-boundary lint rule.
8. Do not add dependencies without the checks in `security.md` §13.

## 3. Phases

Phase numbers replace the earlier 25-stage plan. Phases 1–5 deliver the promise and form the first test build; later phases add safety, convenience and polish.

### Phase 0 — Repository and open-source hygiene

- Git repository, `LICENSE` (Apache-2.0), `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `docs/adr/` for decisions, trademark policy for the Cashline name and logo, contributor workflow (DCO sign-off or equivalent).
- Confirm and record: Expo SDK version, Node version, package manager, application ID and bundle identifier (use one reverse-domain identifier for both platforms), minimum Android and iOS versions, Git workflow.
- Expo project with TypeScript, Expo Router, ESLint (with import-boundary rules), Prettier, Jest, React Native Testing Library, E2E tool chosen and verified.
- CI: lint, typecheck, unit tests, secret scanning, dependency audit, and **development builds for both iOS and Android**.
- Because SQLCipher is not supported in Expo Go, all security-sensitive work uses development builds.

Exit: app launches on both platforms from CI-built development builds; lint, typecheck and tests pass.

### Phase 1 — Money, currency and dates (pure TypeScript)

- `Money = { minor, currency }`, bundled and versioned ISO 4217 table with exponents, formatting by locale, exact arithmetic, overflow rejection, rounding modes as an ADR (default in `memory.md`).
- Calendar-date helpers (local date, month boundaries, week start by locale).
- Property-based tests for arithmetic and rounding across 0-, 2-, 3-decimal currencies.

Exit: money and date modules have full tests; no float arithmetic anywhere in the domain.

### Phase 2 — Vault foundation

- `SecureKeyStore` and biometric adapters for iOS and Android; VMK generation; Device Key and Recovery KEK wrapping; recovery-phrase generation and confirmation.
- SQLCipher database with the VMK-derived key; lock/unlock; auto-lock timeout; wrong-credential handling.
- OS-backup exclusions for Android and iOS; behavior when the database exists without its device key.
- Migration framework with tests.

Tests (on real devices, both platforms): database is actually encrypted; wrong key fails; correct key opens; key absent from ordinary storage; restart; biometric enrollment change; recovery-phrase unlock; OS-backup inspection.

Exit: vault lifecycle stable. Do not continue until it is.

### Phase 3 — Ledger

- Onboarding: automatic vault, main currency, accounts (default Cash), recovery phrase, backup location.
- Accounts, categories (parent/child), merchants, ledger entries (income, expense, transfer, opening balance, adjustment), edit-by-version, void, list, search, filters.
- i18n infrastructure: all strings externalized from this phase on.
- Fast-entry flow targeting a few taps.

Tests: valid/invalid amounts, currency handling, transfer symmetry, void effects on balances, filters, balance calculations per currency.

### Phase 4 — Clients and invoices

- Business profile, clients, invoice drafts and line items (including free-form negative lines), issue (number assignment, snapshots), void, share PDF, mark sent.
- Record payment: income entry plus allocation in one idempotent transaction; derived status.
- Optional due-date reminders with generic notification text.

Tests: totals and rounding boundaries; draft → issued → sent; partial and full payment; overdue derivation by date boundaries and time zones; allocation limits; retry does not duplicate; void reverses; share/PDF failure changes no state; no invoice content in logs.

### Phase 5 — Cash-flow outlook and planned purchase

- Commitments and recurring rules (pure recurrence functions first, then persistence), reserve target.
- Outlook: cash now, commitments, conservative view, conditional view with selected expected payments, reserve check, planned purchase, assumption and missing/stale-data warnings. Home screen composition.

Tests: cash-only view excludes unpaid invoices; conditional view includes only selected payments; purchase before/after expected dates; missing opening balance; overdue and partial invoices; reserve breach; recurrence boundaries; per-currency separation.

**Validation gate:** ship a TestFlight and Play internal build to solo freelancers other than the owner. Ask whether Cashline replaces their mix of expense app, invoice app and spreadsheet; observe manual-entry tolerance; test the cash-outlook and planned-purchase value; probe willingness to pay for the premium list. Record findings in `memory.md`. Continue only if the continue criteria set at the gate are met (see `memory.md`).

### Phase 6 — Backup, restore and data portability

- Backup file format with versioned header; encrypt, authenticate, verify; restore with atomic replace; cross-platform restore tests.
- Manual backup and restore (free); backup-overdue reminder (free).
- CSV export and import with defensive parsing and formula-injection protection.

Tests: encryption, wrong phrase, modified and corrupt files, schema versions, atomic restore, iOS ↔ Android round trip, CSV round trip and malformed input.

### Phase 7 — Reports, polish and fast entry

- Free reports (see spec §14), budgets and reserve progress if the validation gate shows demand, quick-add widget/shortcut, localization pass (translations, RTL), accessibility pass.

### Phase 8 — Premium purchase and scheduled backup

- Select and verify the purchase library and exact versions; one non-consumable product on each store; entitlement service with offline cache; restore purchases; store-free flavor with everything unlocked.
- Premium features: automatic scheduled backup to a chosen folder (Android Storage Access Framework, iOS security-scoped bookmark or iCloud Drive folder, verified), advanced reports.
- ADR on whether scheduled backup can run while the device is locked.

Tests: successful, canceled, pending and failed purchases; restore on reinstall; refund; offline cache; account change of the store account; flavor without billing; expiry/refund never locks data; no tokens in logs.

### Phase 9 — Hardening and release

- MASVS review across all control groups; dependency audit; secret scan; logging review; network traffic test (no requests except store billing); OS-backup inspection; release build review; accessibility and performance checks; upgrade/migration tests; signed release builds; SBOM; store listings and privacy disclosures; published signing fingerprints.

### Later (not V1)

Multi-device sync (premium), savings goals and net worth, bring-your-own-key or on-device assistive features, additional regional invoice helpers.

## 4. Release checklist

```text
Typecheck ✓  Lint ✓  Unit tests ✓  Integration tests ✓  E2E (iOS + Android) ✓
Money/currency/date tests ✓  Invoice and allocation tests ✓  Outlook tests ✓
Vault, key and recovery tests ✓  Backup/restore (incl. cross-platform) ✓
CSV import/export ✓  Entitlements and flavor builds ✓  Localization/RTL ✓
Accessibility ✓  Network traffic test ✓  OS-backup inspection ✓
MASVS review ✓  Signed builds + fingerprints published ✓  Known limitations documented ✓
```

## 5. TDD rules

For domain logic: write a failing test, implement the minimum, refactor, run the full suite. Do not write large implementations and add tests afterward.

## 6. Feature completion rule

A feature is complete when: requirement implemented; UI implemented; domain logic implemented; persistence implemented where required; error handling implemented; tests added and run; security implications reviewed; docs updated; manual test completed on both platforms; no known critical issue.

## 7. Git workflow

Small commits with conventional prefixes, for example:

```text
chore: initialize expo project
feat(money): add currency table and exact arithmetic
feat(vault): create encrypted database with device key
feat(ledger): add expense entry and void
feat(invoices): add issue and payment allocation
feat(outlook): add conservative and conditional views
test(money): add rounding property tests
feat(backup): add encrypted backup file
```

Avoid vague messages such as “update everything”, “final changes” or “security done”. Contributions use DCO sign-off (or the contributor mechanism recorded in Phase 0).

## 8. Review checklist

- **Correctness:** meets the requirement; edge cases covered.
- **Security:** exposes sensitive data? handles keys? new permission? sends data anywhere?
- **Architecture:** domain stays pure; platform code isolated; import rules pass.
- **Testing:** tests meaningful and executed on both platforms where relevant.
- **Documentation:** decision recorded; `memory.md` updated if needed.

## 9. Rule for unknowns

If an implementation depends on an unverified fact: stop and research. If research cannot settle it, record the question in `memory.md` and ask the maintainer. Never turn uncertainty into an assumption in security-sensitive code.
