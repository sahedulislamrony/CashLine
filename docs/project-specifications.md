# Cashline — Project Specifications

Status: V1 specification. Last aligned: 2026-10-13. Decisions and open items live in [`memory.md`](memory.md); if the two disagree, `memory.md` records the latest decision and this document must be updated to match.

## 1. Project identity

**Name:** Cashline
**Tagline:** Your freelance cash, offline.
**Version:** V1
**Platforms:** iOS and Android, one shared React Native / Expo / TypeScript codebase. Both platforms are first-class from the first commit.
**Product type:** Local-first, end-to-end-encrypted freelancer cash-flow and personal-finance app.
**License:** Apache-2.0 (code). The name and logo are trademarks and are not licensed for use by forks.
**Business model:** Free to use, with a one-time premium purchase. No subscription, no ads, no accounts, no servers operated by the project.

Cashline helps a solo freelancer record spending and client income, issue and track invoices, and see what cash they have now, what is expected but unpaid, what is committed soon, and what a planned purchase would leave them with.

## 2. Principles

1. Local-first: the phone is the source of truth and the app is fully usable offline.
2. No accounts. The project operates no backend and holds no user data.
3. Financial data is encrypted at rest and in every backup.
4. The user holds the keys. Lost keys mean lost data, and the app says so plainly.
5. Deterministic financial calculations only; no LLM or remote service is involved in any number the app shows.
6. Received cash, unpaid invoices and expected income are always shown separately. An unpaid invoice is never presented as cash.
7. Free means free: the core product has no ads, no invoice or client caps, and no data lock-in. Backup, restore and export are never paywalled.
8. Premium is convenience, never a lock. A lapsed, refunded or missing purchase never deletes, locks or hides user data.
9. Open source: the code is public; premium is honor-system for people who build from source.
10. Security decisions are explicit and testable; unverified properties are described as unverified.
11. Daily entry must take seconds and produce an understandable summary, not just charts.
12. Platform-native look on each platform with shared tokens; accessible by default (see [`design-system.md`](design-system.md)).

## 3. V1 scope

### In scope

- Local encrypted vault created automatically on first launch; biometric/device-credential app lock; recovery phrase.
- Main currency and any number of accounts, in any ISO 4217 currency (see §8).
- Manually managed accounts (default Cash).
- Ledger: income, expense, transfer, opening balance, adjustment; categories and subcategories; notes and merchants; history, search and filters; voiding instead of deleting.
- Clients, business (seller) profile, invoices with line items, manual payment allocation, PDF share.
- Commitments (one-off scheduled payments) and recurring rules.
- Essential-spending reserve target.
- Cash-flow outlook for a user-selected date range and a planned-purchase estimate (§11).
- Reports (§14).
- Encrypted backup file with versioned format; manual backup and restore (free); backup-overdue reminder.
- CSV export and import of ledger data.
- Quick-add shortcut/widget for fast expense entry.
- Localization (languages, number/date formats, RTL readiness).
- Free tier plus one-time premium purchase (§5).

### Premium (one-time purchase)

- Automatic scheduled backup to a user-chosen folder.
- Advanced reports (per-client revenue, year-over-year/trend comparison, cash-flow history, PDF report export).
- Multi-device sync, when it ships (post-V1; see §13).

### Never paywalled

Unlimited clients and invoices; the ledger; the cash-flow outlook and planned-purchase estimate; manual backup and restore; CSV import/export; app lock; localization.

### Non-goals for V1

Do not silently expand V1 into:

- Bank or card account linking, automatic transaction ingestion, wallet linking.
- Online payment collection for invoices.
- Tax calculation, e-invoicing, or claims that an invoice is legally compliant in any jurisdiction.
- Custom invoice templates (one clean built-in layout only).
- Bookkeeping, payroll, double-entry accounting, tax filing.
- User accounts, cloud sign-in, hosted sync or hosted backup operated by the project.
- AI features (server-side or otherwise). A future opt-in, bring-your-own-key or on-device feature may be considered later.
- Multi-user/household finance, real-time collaboration, social features.
- Investments, crypto exchange integrations, credit scoring, financial or investment advice.
- Subscriptions and ads.

## 4. Target user and product promise

**Initial user:** privacy-conscious solo freelancers and independent workers with irregular client income. Students are not a primary audience.

**Promise:** “What money do I have now, what is expected but unpaid, what must I pay soon, and what would this purchase leave me with?”

The market is global. Launch regions for localization, invoice-field guidance and testing are still to be chosen (see `memory.md`); do not assume one regional pattern applies worldwide.

**Validation:** the product is a hypothesis until tested with solo freelancers other than the project owner. Phases 1–5 of the plan (`development.md`) deliver the promise end to end so it can be tested before backup, premium and hardening work is invested.

## 5. Business model

- The app is free to download and use, with a one-time premium purchase unlocking the premium list in §3.
- Implemented with the stores' own billing APIs (StoreKit on iOS, Google Play Billing on Android) through a maintained RN/Expo library chosen and verified at implementation time. No third-party purchase SaaS is used. Nothing about the user or the vault is sent anywhere except the store purchase itself.
- Entitlement is checked on-device from the store's purchase record and cached locally for offline use. Because the project runs no server, on-device verification is the only verification; this is acceptable for a convenience unlock and is documented as a known limitation.
- Builds from source, and a store-free build flavor (for example for F-Droid), have all features unlocked and contain no billing code. Premium for store builds is honor-system for people who compile it themselves, by design.
- Funding is premium sales plus voluntary donations. Pricing is a hypothesis to be tested (see `memory.md`).

## 6. Platform strategy

iOS and Android from one codebase. Platform-specific capabilities sit behind interfaces so business logic stays platform-independent:

```text
SecureKeyStore    BiometricAuth     FilePicker / FolderAccess
ShareService      NotificationService   PurchaseService
BackgroundScheduler   WidgetService
```

The business layer must not import platform APIs. Minimum OS versions are decided from the chosen Expo SDK's supported range (see `memory.md`). Native Liquid Glass applies on iOS 26 and later and falls back gracefully on earlier versions (see [`design-system.md`](design-system.md)).

## 7. Technology stack

- React Native, Expo, TypeScript, Expo Router.
- State: Zustand or another explicitly approved solution; derived data comes from queries, not duplicated stores.
- Local persistence: SQLite with SQLCipher via `expo-sqlite` (config plugin `useSQLCipher`; requires a development build, not Expo Go). Drizzle ORM if its integration with the chosen SDK is verified.
- Secure key storage: iOS Keychain and Android Keystore through the `SecureKeyStore` interface.
- Purchases: StoreKit 2 / Google Play Billing via a maintained library, verified at selection time (see `development.md` Phase 8).
- Localization: `expo-localization` plus an i18n library and a translation platform for contributors.
- Invoice PDFs: generated on device with a library verified at selection time.
- Testing: Jest, React Native Testing Library, a cross-platform E2E tool (Maestro or Detox, chosen and verified in Phase 0), real-device tests on both iOS and Android.
- No backend, no Supabase, no RevenueCat, no TanStack Query (no remote state exists).

Version-sensitive facts (SQLCipher support, Expo Router native tabs, library compatibility) must be rechecked against the exact Expo SDK chosen.

## 8. Financial model

### Money

```text
Money = { minor: integer, currency: ISO-4217 code }
```

- Amounts are stored as integer minor units. Floating point is never used for authoritative money.
- The minor-unit exponent comes from a bundled, versioned ISO 4217 table (for example JPY 0, USD 2, KWD 3). Any exponent change in the table is handled by a migration decision.
- Any ISO 4217 currency is supported from the first release. Each account has exactly one currency; each ledger entry carries its account's currency.
- No cross-currency arithmetic and no exchange rates in V1. Reports and the outlook are computed per currency. A multi-currency user sees one section per currency.
- The “main currency” chosen at onboarding sets defaults (new accounts, invoice currency, display order); it does not convert anything.
- Large values: the money module must define and test its numeric range (for example using `bigint` in TypeScript and SQLite 64-bit integers) and reject overflow.
- Rounding for quantity × unit-price invoice lines is defined by a recorded ADR; the default is in `memory.md`.

### Dates and time

- Entry dates, invoice dates and due dates are calendar dates (`YYYY-MM-DD`), with no time zone.
- Creation and update times are UTC instants.
- “Today”, overdue status and month boundaries use the device's local calendar date. Week start and locale formats follow the user's locale.

### Identifiers

Records use UUIDv7 primary keys, creation/update timestamps and a version counter, and deletes are tombstones. This keeps the data model ready for future sync without changing it.

## 9. Domain entities

- **Vault metadata:** schema version, main currency, backup state.
- **Account:** name, type, currency, archived flag.
- **Category:** income or expense, optional parent, archived flag.
- **Merchant:** name (optional text on entries).
- **Ledger entry** (immutable; edits create a new version, “delete” is a void): types `income`, `expense`, `transfer` (two linked legs), `opening_balance`, `adjustment`.
- **Client:** name and contact/billing fields.
- **Business profile:** seller name, address, optional tax or registration number, optional payment instructions, logo.
- **Invoice:** stored status `draft | issued | void`; client snapshot, seller snapshot and numbered identifier fixed at issue; invoice and due dates; currency; line items.
- **Invoice line item:** description, quantity, unit amount, free-form lines (including negative amounts for discount, tax or adjustment entered manually).
- **Invoice allocation:** links an income ledger entry to an invoice with an amount.
- **Commitment:** a known one-off future payment.
- **Recurring rule:** schedule that generates expected commitments or entries under an explicit rule.
- **Reserve target:** user-entered essential-spending minimum.
- **Attachment:** encrypted file attached to an entry or invoice (optional in V1).
- **Entitlement cache:** local copy of the premium state.

Planned purchases are inputs to the outlook; they are saved only if the user chooses.

Out of the domain model: user, device, device lease, cloud snapshot.

## 10. Invoice workflow

```text
Create business profile and client
        ↓
Create/edit invoice draft (no number yet)
        ↓
Issue: number assigned, client and seller snapshots frozen
        ↓
Share PDF at the user's request (does not mark anything sent)
        ↓
Optionally mark as sent after the user has actually sent it
        ↓
Record received money as an income entry and allocate it to the invoice
        ↓
Derived: partially paid → paid; overdue when due date has passed with a balance
```

- Stored status is only `draft`, `issued` or `void`. Sent, partially paid, paid and overdue are derived from user marks, allocations and the due date.
- Invoice numbers are assigned at issue from a per-seller sequence with a user-editable prefix, so drafts never leave gaps. An issued invoice is never edited; correct it by voiding and re-issuing.
- A payment is an income ledger entry plus an allocation. The amount cannot be counted twice. One entry may pay several invoices and one invoice may be paid by several entries.
- Allocations may not exceed the invoice total (validation, including after any future sync merge).
- The invoice currency must match the receiving account's currency; cross-currency settlement is not supported in V1.
- Invoices carry manual tax and discount lines but the app does not calculate tax and makes no legal-compliance claim.
- The app does not collect payment.

## 11. Cash-flow outlook

For a user-selected date range the outlook computes, per currency:

1. **Cash now:** account balances from ledger entries (opening balances included).
2. **Commitments:** known payments in the range from commitments and recurring rules.
3. **Conservative view:** cash now minus commitments, excluding every unpaid invoice.
4. **Conditional view:** conservative view plus selected expected invoice payments, clearly labelled conditional.
5. **Reserve check:** whether the projected balance falls below the user's reserve target.
6. **Planned purchase:** an optional amount and date that reduces the projection.

Rules:

- Unpaid invoices and other expected income are never counted as cash. Invoice due dates are not guaranteed payment dates.
- Show assumptions and flag missing or stale inputs (for example no opening balance, overdue invoices, old commitments).
- Output is an estimate. The app never tells the user whether to buy.
- Calculations are pure local functions with exact money arithmetic.

## 12. Application flow

```text
First launch
    ↓
Vault created automatically (device key, no user action)
    ↓
Main currency  →  Accounts (default Cash; add or skip)
    ↓
Show recovery phrase (user confirms they saved it)
    ↓
Choose backup location (or skip; reminder stays on)
    ↓
Home
```

- No sign-in, email or account at any point.
- The main currency screen lists supported currencies. Locale-based highlighting uses the device's region setting; no location permission is requested.
- Home shows: cash now, upcoming commitments, unpaid and overdue invoices (separately), quick actions (add expense, create invoice), and the outlook with its assumptions.
- App lock (biometric or device credential) applies on launch and after the auto-lock timeout.

## 13. Backup, restore and sync

- **Backup (V1):** the app produces an encrypted, authenticated, versioned backup file. The user stores it anywhere through the share sheet / Files, or (premium) lets the app write scheduled backups to a folder they chose. Schedule choices: Never, Daily, Weekly, Monthly.
- Scheduled backup is best-effort on both platforms (the OS controls background execution). An in-app “backup is overdue” reminder is the guaranteed fallback and is always free.
- **Restore:** verify integrity and schema first, then replace the local vault atomically. A healthy vault is never overwritten by an unverified backup. A restored vault needs the recovery phrase on a new device.
- **New device:** restore a backup file with the recovery phrase.
- **Sync (post-V1, premium):** multi-device sync over an end-to-end-encrypted append-only change log, stored on a self-hostable relay or user-chosen storage. The V1 data model is designed for it (immutable ledger, UUIDv7, tombstones, derived state). There is no “one active device” rule and no device lease.

## 14. Reports

Free:

- Income vs expenses, savings, savings rate (per currency).
- Expense by category; monthly comparison.
- Account balances; cash flow.
- Recurring/commitments summary.
- Outstanding and overdue invoices (aging), shown separately from income received.
- Reserve progress.
- Budget utilization (if budgets ship, see `development.md`).

Premium (advanced): per-client revenue, year-over-year and trend comparison, cash-flow history, PDF report export.

All figures are deterministic and verifiable from local data.

## 15. Privacy

- Data stays on the device. The project collects nothing.
- No analytics or crash reporting by default. Any future opt-in diagnostics must be reviewed for PII, state exactly what is sent, and be off by default.
- No financial data in logs, notifications, deep links or analytics.
- V1 makes no network requests other than store billing (verify at release). No location permission.
- Invoice PDFs contain plaintext client and financial details by design and are shared only by explicit user action.

## 16. Localization and accessibility

- All user-visible strings are externalized; translations are community-contributed through a translation platform.
- Number, currency, date and week-start formatting follow the locale; RTL layouts are supported.
- Accessibility requirements are in [`design-system.md`](design-system.md).

## 17. Definition of done for V1

V1 is complete only when it has, passing and actually run:

- Unit and property tests for money, currency exponents, dates, rounding, invoice totals, allocation, derived statuses, outlook and recurrence.
- Repository, migration and encryption/key-handling tests on both platforms.
- Vault lifecycle tests (create, lock, unlock, wrong credential, recovery-phrase recovery, restart).
- Backup/restore tests (encryption, modified/corrupt rejection, wrong phrase, atomic restore, cross-platform restore iOS ↔ Android).
- Invoice lifecycle and idempotent payment-allocation tests; outlook tests proving unpaid invoices are not counted as cash.
- CSV import/export round-trip tests.
- Premium entitlement tests (purchase, cancel, pending, failed, restore, refund, offline cache, build flavor with everything unlocked) and proof that expiry or refund never locks data.
- Localization and RTL checks; accessibility checks (large text, screen reader, contrast, reduce motion).
- Security review against the applicable OWASP MASVS controls; real-device testing on iOS and Android.
- Documented known limitations.

## 18. Engineering authority

When documentation, memory, assumptions and implementation differ:

1. Official current documentation wins.
2. Check security standards and platform documentation.
3. Check package source and release notes when behavior is version-specific.
4. Do not invent APIs.
5. If requirements conflict, stop and ask.
6. If a security property cannot be verified, describe it as unverified.
