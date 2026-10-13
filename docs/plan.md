# Cashline — Work Plan

The step-by-step build list for V1. It breaks the phases in [`development.md`](development.md) §3 into single tasks. If this file and `development.md` or the spec disagree, those documents win and this file is corrected.

## How this plan is used

- **One task at a time, in order.** Only the task marked **Current** is worked on. When it is finished and its tests have run, work moves straight on to the next task. It stops only for a real blocker: a decision that belongs to the maintainer, or a missing device or tool.
- **Order:** most important first (the order of the phases). Inside each feature: pure logic and its tests → storage → use cases → UI.
- **Tests are part of the task.** Logic tasks are test-first (`development.md` §5). A task is not done until its tests exist and have been run.
- **Checking off:** tick each box when the item is done and verified, then tick the task in the progress table. Never tick something that did not run; write what is unverified under the task instead.
- **Every task ends with:** `pnpm check` passing, docs and `memory.md` updated if a decision changed, and one or more signed-off conventional commits.
- **Device checks:** items marked 📱 must be run on real iOS and Android builds, not only in Jest.

## Progress

**Current task: 2.3 — not started.** It needs a CI build of the new native libsodium dependency first (push required). 0.2 stays open: Android launch and Maestro run are blocked on local tooling.

| Task | Title                                       | Done |
| ---- | ------------------------------------------- | ---- |
| 0.1  | Repository, tooling and open-source files   | ✅   |
| 0.2  | CI green and app launched on both platforms | ⬜   |
| 1.1  | Currency table                              | ✅   |
| 1.2  | Money type and exact arithmetic             | ✅   |
| 1.3  | Money parsing and formatting                | ✅   |
| 1.4  | Calendar dates                              | ✅   |
| 1.5  | Identifiers and timestamps                  | ✅   |
| 2.1  | Platform interfaces and test fakes          | ✅   |
| 2.2  | Key hierarchy and recovery phrase           | ✅   |
| 2.3  | Encrypted database and migrations           | ⬜   |
| 2.4  | Vault lifecycle and app lock                | ⬜   |
| 2.5  | Sanitized logging and OS-backup exclusion   | ⬜   |
| 2.6  | Lock screen UI and device verification      | ⬜   |
| 3.1  | Ledger domain rules                         | ⬜   |
| 3.2  | Ledger schema and repositories              | ⬜   |
| 3.3  | Ledger use cases                            | ⬜   |
| 3.4  | i18n infrastructure and core components     | ⬜   |
| 3.5  | Onboarding UI                               | ⬜   |
| 3.6  | Ledger UI and fast entry                    | ⬜   |
| 4.1  | Invoice domain rules                        | ⬜   |
| 4.2  | Invoice schema and repositories             | ⬜   |
| 4.3  | Invoice use cases and idempotent payment    | ⬜   |
| 4.4  | Invoice PDF and sharing                     | ⬜   |
| 4.5  | Clients, business profile and invoice UI    | ⬜   |
| 4.6  | Due-date reminders                          | ⬜   |
| 5.1  | Recurrence and commitments domain           | ⬜   |
| 5.2  | Outlook and planned-purchase calculations   | ⬜   |
| 5.3  | Commitments storage and use cases           | ⬜   |
| 5.4  | Outlook and Home UI                         | ⬜   |
| 5.5  | Validation gate (test build to freelancers) | ⬜   |
| 6.1  | Backup file format                          | ⬜   |
| 6.2  | Backup and atomic restore                   | ⬜   |
| 6.3  | CSV export and import                       | ⬜   |
| 6.4  | Backup, restore and CSV UI                  | ⬜   |
| 7.1  | Report calculations                         | ⬜   |
| 7.2  | Reports UI                                  | ⬜   |
| 7.3  | Quick-add widget and shortcut               | ⬜   |
| 7.4  | Localization, RTL and accessibility pass    | ⬜   |
| 8.1  | Entitlement service and store-free flavor   | ⬜   |
| 8.2  | Store purchase adapters and paywall         | ⬜   |
| 8.3  | Scheduled backup (premium)                  | ⬜   |
| 8.4  | Advanced reports (premium)                  | ⬜   |
| 9.1  | Security hardening and MASVS review         | ⬜   |
| 9.2  | Release builds, SBOM and store listings     | ⬜   |

---

## Phase 0 — Repository and open-source hygiene

### 0.1 Repository, tooling and open-source files ✅

- [x] Expo SDK 57 project with TypeScript, Expo Router and five placeholder tabs
- [x] ESLint import boundaries, Prettier, Jest, React Native Testing Library, Maestro smoke flow
- [x] License, contributing guide, security policy, code of conduct, trademark policy, ADRs 0001–0002
- [x] Git hooks: lint-staged, Conventional Commits and DCO sign-off
- [x] Tests: boundary rules fire; token contrast; placeholder screen (88 tests, run 2026-10-13)

### 0.2 CI green and app launched on both platforms

- [x] iOS development build compiles in CI
- [x] Android development build compiles in CI
- [x] Format/lint/test, dependency audit and secret scan jobs pass on `main`
- [x] 📱 App launches on an iOS simulator from a development build (CI-built app on iPhone 18 Pro, iOS 27.0, 2026-10-14; tabs switch, native Liquid Glass tab bar)
- [ ] 📱 App launches on an Android emulator or device from a development build — blocked: no emulator image, AVD or JDK on the dev machine
- [ ] Maestro smoke flow runs and passes on at least one platform — blocked: Maestro needs a JDK locally; the manual `E2E` workflow has not been run
- [ ] Confirm or replace the provisional identifier (`memory.md` O-10)
- [ ] Decide the `accent` contrast question (`memory.md` O-18)

Done when: the Phase 0 exit in `development.md` holds — the app launches on both platforms from CI-built development builds, and lint, typecheck and tests pass.

---

## Phase 1 — Money, currency and dates (pure TypeScript)

No UI. Everything lives in `src/domain/` with no React, React Native or Expo imports.

### 1.1 Currency table

- [x] Bundled, versioned ISO 4217 table: code, minor-unit exponent, name (165 codes, `src/domain/money/currencies.ts`)
- [x] Lookup and validation of currency codes
- [x] Tests: 0-, 2- and 3-decimal currencies (JPY, USD, KWD); unknown and malformed codes rejected; table has no duplicates (56 tests, 100% coverage, run 2026-10-14)

### 1.2 Money type and exact arithmetic

- [x] `Money = { minor, currency }` using `bigint`, with a defined and tested numeric range
- [x] Add, subtract, negate, compare, sum, multiply by quantity
- [x] Mixed-currency operations rejected; overflow rejected
- [x] ADR for rounding of quantity × unit amount (default in `memory.md` O-04) — ADR 0003
- [x] Tests: unit tests plus property-based tests (fast-check) for arithmetic and rounding across exponents; no floating point anywhere (run 2026-10-14)

### 1.3 Money parsing and formatting

- [x] Parse user-typed amounts to minor units for a currency and locale
- [x] Format by locale with explicit sign, symbol and the currency's decimals
- [x] Tests: round trip parse ↔ format; too many decimals, separators, negative and empty input; 17 locales (run 2026-10-14 in Node; 📱 not yet checked in Hermes on a device — see `memory.md` §4)

### 1.4 Calendar dates

- [x] `YYYY-MM-DD` calendar-date type with validation
- [x] Today from the device's local date, add days/months, month boundaries, week start by region, date ranges
- [x] Tests: leap years, month ends, time-zone and clock changes, invalid dates rejected (run 2026-10-14)

### 1.5 Identifiers and timestamps

- [x] UUIDv7 generation and validation; UTC instants; version counter helper (plus record metadata with tombstones, `src/domain/identity/`)
- [x] Tests: ordering by time, uniqueness, format, clock stepping backwards (run 2026-10-14)

Done when (phase): money and date modules are fully tested and no float arithmetic exists in the domain.

---

## Phase 2 — Vault foundation

Security-sensitive. Follow `security.md`; do not claim a property that was not verified. Do not continue past this phase until the vault lifecycle is stable.

### 2.1 Platform interfaces and test fakes

- [x] `SecureKeyStore`, `DeviceAuth`, `RandomSource` and `Clock` ports in `src/application/ports/`, with in-memory fakes for tests (location changed by ADR 0004)
- [x] Decide the composition root (`memory.md` O-19) and update ADR 0002 — ADR 0004, lint rules and boundary tests updated
- [x] Verify library choices against Expo SDK 57 (`security.md` §13) — APIs of `expo-secure-store`, `expo-local-authentication`, `expo-crypto` read from their SDK 57 type definitions; device behavior still unverified, and O-20 is open
- [x] Tests: fakes honor the interface contract (run 2026-10-14)

### 2.2 Key hierarchy and recovery phrase

- [x] Vault Master Key generation; device copy in the platform key store; sealing under the recovery key (`src/security/`)
- [x] Recovery phrase generation and confirmation (24 BIP39 words); Argon2id at 3 passes and 64 MiB
- [x] Separate derivations for database, backup and attachment keys
- [x] Tests: seal/open round trip, wrong phrase fails, tampering detected, known-answer vectors, no secrets in errors (run 2026-10-14 in Node against real libsodium; 📱 the native build has not run on a device — see `memory.md` §4)

### 2.3 Encrypted database and migrations

- [ ] SQLCipher database opened with the VMK-derived key (`expo-sqlite` with `useSQLCipher`)
- [ ] Migration framework and `schema_migrations`; `vault_meta` table
- [ ] Verify Drizzle with SDK 57 or choose the alternative; record the decision
- [ ] Tests: migrations apply in order and are idempotent; 📱 database file is actually encrypted; wrong key fails; correct key opens

### 2.4 Vault lifecycle and app lock

- [ ] Automatic vault creation on first launch; lock, unlock, auto-lock timeout
- [ ] Wrong-credential handling; database present without its device key; biometric enrollment change
- [ ] Unlock with the recovery phrase
- [ ] Tests: lifecycle state machine; 📱 restart, enrollment change, recovery-phrase unlock on both platforms

### 2.5 Sanitized logging and OS-backup exclusion

- [ ] `src/logging` that cannot emit keys, phrases or financial data
- [ ] Android and iOS backup exclusions for the vault and wrapped keys
- [ ] Tests: logger redaction; 📱 inspect an Android backup and an iOS backup

### 2.6 Lock screen UI and device verification

- [ ] Lock/unlock screen, app-switcher hiding, screenshot protection where available
- [ ] Tests: component tests; 📱 full vault checklist from `development.md` Phase 2 on both platforms

Done when (phase): vault lifecycle is stable on real devices on both platforms.

---

## Phase 3 — Ledger

### 3.1 Ledger domain rules

- [ ] Accounts, categories (parent/child), merchants, entry types: income, expense, transfer, opening balance, adjustment
- [ ] Edit-by-version and void; balance calculation per account and per currency
- [ ] Tests: valid/invalid amounts, currency handling, transfer symmetry, void effects on balances, transfers excluded from income/expense totals

### 3.2 Ledger schema and repositories

- [ ] Tables: accounts, categories, merchants, ledger entries, transfer links (UUIDv7, integer minor units, tombstones)
- [ ] `AccountRepository`, `LedgerRepository`, `SettingsRepository`
- [ ] Tests: repository tests against a real database; migration tests

### 3.3 Ledger use cases

- [ ] `CreateEntry`, `VoidEntry`, `TransferBetweenAccounts`, edit entry, list, search, filters
- [ ] Tests: use cases with repositories; transfer is one transaction; failure leaves no partial write

### 3.4 i18n infrastructure and core components

- [ ] `expo-localization` plus an i18n library; every string externalized from here on
- [ ] Core design-system components needed by the ledger: `Text`, `Button`, `TextField`, `AmountField`, `Surface`, `TransactionRow`, empty/loading/error states
- [ ] Tests: component tests including large text and both themes; missing-key check

### 3.5 Onboarding UI

- [ ] Main currency → accounts (default Cash) → recovery phrase confirmation → backup location (or skip)
- [ ] Tests: component tests; Maestro onboarding flow; 📱 both platforms

### 3.6 Ledger UI and fast entry

- [ ] Entry list with search and filters; entry detail with history; add/edit/void
- [ ] Fast-entry flow in a few taps
- [ ] Tests: component tests; Maestro add-expense flow; 📱 both platforms

---

## Phase 4 — Clients and invoices

### 4.1 Invoice domain rules

- [ ] Line totals and invoice totals with the rounding ADR; free-form negative lines
- [ ] Stored status `draft | issued | void`; derived sent, partially paid, paid, overdue
- [ ] Allocation rules: not above the entry's unallocated amount or the invoice balance; currencies must match
- [ ] Tests: totals and rounding boundaries; overdue by date boundaries and time zones; allocation limits

### 4.2 Invoice schema and repositories

- [ ] Tables: clients, business profile, invoices, lines, allocations, number sequence
- [ ] `ClientRepository`, `InvoiceRepository`
- [ ] Tests: repository and migration tests; gapless numbering under concurrency

### 4.3 Invoice use cases and idempotent payment

- [ ] `CreateInvoice`, `IssueInvoice` (number and snapshots), `MarkInvoiceSent`, `VoidInvoice`
- [ ] `RecordPayment`: income entry plus allocation in one transaction, idempotent by operation ID
- [ ] Tests: draft → issued → sent; partial and full payment; retry does not duplicate; void reverses; interrupted write leaves no partial state

### 4.4 Invoice PDF and sharing

- [ ] PDF library verified at selection time; one clean built-in layout; `ShareInvoicePdf`
- [ ] Tests: share or PDF failure changes no state; no invoice content in logs; 📱 share on both platforms

### 4.5 Clients, business profile and invoice UI

- [ ] Business profile, client list and detail, invoice draft editor, invoice detail with status chips, record-payment sheet
- [ ] Tests: component tests; Maestro create-issue-pay flow; 📱 both platforms

### 4.6 Due-date reminders

- [ ] Optional local notifications with generic text only
- [ ] Tests: no financial data in notification text; scheduling by due date; 📱 both platforms

---

## Phase 5 — Cash-flow outlook and planned purchase

### 5.1 Recurrence and commitments domain

- [ ] Pure recurrence expansion; one-off commitments; reserve target
- [ ] Tests: recurrence boundaries (month ends, leap years, range edges)

### 5.2 Outlook and planned-purchase calculations

- [ ] Cash now, commitments, conservative view, conditional view with selected expected payments, reserve check, planned purchase, assumption and stale-data warnings
- [ ] Tests: cash-only view excludes unpaid invoices; conditional view includes only selected payments; purchase before/after expected dates; missing opening balance; overdue and partial invoices; reserve breach; per-currency separation

### 5.3 Commitments storage and use cases

- [ ] Tables and `CommitmentRepository`; `ComputeOutlook`, `EstimatePlannedPurchase`
- [ ] Tests: repository and use-case tests

### 5.4 Outlook and Home UI

- [ ] Commitments and recurring rules screens; outlook with assumptions; planned-purchase input
- [ ] Home: cash now, upcoming commitments, unpaid and overdue invoices shown separately, quick actions
- [ ] Tests: component tests; Maestro outlook flow; 📱 both platforms

### 5.5 Validation gate

- [ ] TestFlight and Play internal builds to solo freelancers other than the owner
- [ ] Record findings in `memory.md`; decide continue, pivot or stop against the criteria in O-16

---

## Phase 6 — Backup, restore and data portability

### 6.1 Backup file format

- [ ] Versioned header with non-secret parameters; authenticated encryption with the backup key
- [ ] Tests: encrypt/decrypt round trip; modified, truncated and corrupt files rejected; wrong phrase fails

### 6.2 Backup and atomic restore

- [ ] `CreateBackup`, `RestoreBackup`: verify → decrypt to temp → validate → migrate → atomic replace → verify balances and invoice links
- [ ] Backup-overdue reminder (free)
- [ ] Tests: schema versions; a healthy vault is never overwritten by a bad file; 📱 iOS ↔ Android round trip

### 6.3 CSV export and import

- [ ] Defensive parser; formula-injection protection on export
- [ ] Tests: round trip; malformed input; leading `=`, `+`, `-`, `@` neutralized

### 6.4 Backup, restore and CSV UI

- [ ] Manual backup and restore screens, import/export screens, overdue reminder
- [ ] Tests: component tests; Maestro backup-restore flow; 📱 both platforms

---

## Phase 7 — Reports, polish and fast entry

### 7.1 Report calculations

- [ ] Free reports from spec §14; budgets only if the validation gate showed demand
- [ ] Tests: each figure verified against hand-computed fixtures, per currency

### 7.2 Reports UI

- [ ] Report screens and charts using the semantic palette, never color alone
- [ ] Tests: component tests; 📱 both platforms

### 7.3 Quick-add widget and shortcut

- [ ] Platform widget/shortcut behind `WidgetService`
- [ ] Tests: 📱 both platforms; no financial data exposed on the lock screen

### 7.4 Localization, RTL and accessibility pass

- [ ] Translations for the chosen languages (`memory.md` O-01); RTL layouts
- [ ] Tests: 📱 large text, VoiceOver and TalkBack, contrast, reduce motion, RTL

---

## Phase 8 — Premium purchase and scheduled backup

### 8.1 Entitlement service and store-free flavor

- [ ] `EntitlementService` with offline cache; feature-access policy; flavor with everything unlocked and no billing code
- [ ] Tests: cache, expiry and refund never lock data or block export; flavor without billing

### 8.2 Store purchase adapters and paywall

- [ ] Purchase library chosen and verified; StoreKit 2 and Play Billing adapters; paywall; restore purchases
- [ ] Tests: successful, canceled, pending and failed purchases; restore on reinstall; no tokens in logs; 📱 sandbox purchases on both stores

### 8.3 Scheduled backup (premium)

- [ ] ADR on running while the device is locked; folder access on both platforms; schedule choices
- [ ] Tests: skipped runs fall back to the reminder; 📱 both platforms

### 8.4 Advanced reports (premium)

- [ ] Per-client revenue, year-over-year and trend comparison, cash-flow history, PDF report export
- [ ] Tests: calculation fixtures; component tests

---

## Phase 9 — Hardening and release

### 9.1 Security hardening and MASVS review

- [ ] MASVS review across all control groups; dependency audit; secret scan; logging review
- [ ] 📱 Network traffic test (no requests except store billing); OS-backup inspection; upgrade and migration tests
- [ ] Results and unverified items recorded in `memory.md`

### 9.2 Release builds, SBOM and store listings

- [ ] Signed release builds; published signing fingerprints; SBOM; release notes
- [ ] Store listings and privacy disclosures; known limitations documented
- [ ] Full release checklist in `development.md` §4 run and passing
