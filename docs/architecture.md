# Cashline — Architecture

Status: aligned with [`project-specifications.md`](project-specifications.md) on 2026-10-13.

## 1. Architectural style

> **Local-first, end-to-end-encrypted, no accounts, no required server. One React Native codebase for iOS and Android.**

The phone runs everything: storage, calculation, invoicing and backup. The project operates no backend. Optional services (a self-hostable sync relay, post-V1) can be added without changing the core.

## 2. High-level view

```text
┌──────────────────────────────────────────────────────┐
│          React Native · Expo · TypeScript            │
│  Presentation (Expo Router screens, design system)   │
├──────────────────────────────────────────────────────┤
│  Application layer (use cases)                       │
├──────────────────────────────────────────────────────┤
│  Domain (pure TypeScript, no platform imports)       │
│  money · currency · dates · ledger · invoices ·      │
│  cash-flow outlook · recurrence · reports            │
├──────────────────────────────────────────────────────┤
│  Data layer (repositories, schema, migrations)       │
├──────────────────────────────────────────────────────┤
│  Encrypted SQLite (SQLCipher)  ←  vault key          │
├──────────────────────────────────────────────────────┤
│  Platform adapters (interfaces + iOS/Android impls)  │
│  SecureKeyStore · Biometrics · Files · Share ·       │
│  Notifications · Scheduler · Widgets · Purchases     │
└──────────────────────────────────────────────────────┘
        │ only by explicit user action or store billing
        ▼
   Backup file · PDF share · CSV · Store purchase
```

The security boundary is the vault: nothing reads or writes financial data except through the data layer while the vault is unlocked. Purchases are not part of the security boundary; they gate premium features only.

## 3. Layers and rules

```text
Presentation → Application → Domain ← Data, Security, Platform
```

Outer layers reach each other only through ports (interfaces) owned by the application layer, and a composition root wires the implementations in. See [ADR 0004](adr/0004-ports-and-composition-root.md).

- **Presentation:** screens, navigation, forms, loading/error states, design-system components. No SQL, no cryptography, no secret handling, no premium checks beyond calling the entitlement service.
- **Application (use cases):** `CreateEntry`, `VoidEntry`, `TransferBetweenAccounts`, `CreateInvoice`, `IssueInvoice`, `ShareInvoicePdf`, `MarkInvoiceSent`, `RecordPayment` (income entry + allocation, one transaction), `VoidInvoice`, `ComputeOutlook`, `EstimatePlannedPurchase`, `CreateBackup`, `RestoreBackup`, `ImportCsv`, `ExportCsv`, `UnlockVault`, `RotateRecovery`, `GetEntitlement`, `PurchasePremium`, `RestorePurchases`.
- **Domain:** entities, validation, exact money arithmetic, invoice totals and derived status, allocation rules, outlook calculations, recurrence expansion, report calculations. Pure functions, no I/O, fully unit-testable.
- **Data:** repositories (`LedgerRepository`, `AccountRepository`, `InvoiceRepository`, `ClientRepository`, `CommitmentRepository`, `SettingsRepository`), the Drizzle (or equivalent) schema, migrations. All SQL lives here.
- **Ports:** the interfaces use cases need from outside (`SecureKeyStore`, `DeviceAuth`, `RandomSource`, `Clock`, repositories, files, sharing, notifications, purchases) live in `src/application/ports/`, with shared test fakes beside them.
- **Platform:** iOS/Android implementations of ports. Domain, application and presentation code must not import platform APIs directly; an ESLint boundary rule enforces the dependency direction.
- **Composition root (`src/composition/`):** the one place that may import every layer. It builds the implementations and hands use cases to the routes.

## 4. Source tree

```text
app/                         Expo Router routes only (thin)
├── (onboarding)/
├── (tabs)/                  home · ledger · invoices · outlook · more
├── entry/[id].tsx
├── invoice/[id].tsx
├── client/[id].tsx
└── _layout.tsx
src/
├── domain/
│   ├── money/               Money, currency table, rounding
│   ├── dates/               calendar-date helpers
│   ├── ledger/
│   ├── invoice/
│   ├── outlook/
│   ├── recurrence/
│   └── reports/
├── application/             use cases
│   └── ports/               interfaces to the outside world + fakes/ for tests
├── data/
│   ├── schema/
│   ├── migrations/
│   └── repositories/
├── platform/                implementations of ports
│   ├── secure-key-store/    ios/ + android/ where they differ
│   ├── biometrics/
│   ├── files/
│   ├── share/
│   ├── notifications/
│   ├── scheduler/
│   ├── widgets/
│   └── purchases/
├── security/                key hierarchy, vault lifecycle, backup format
├── composition/             composition root: wires implementations into use cases
├── i18n/
├── design-system/           tokens, components
└── logging/                 sanitized logging only
```

There is one home for each concern: no duplicate `core/`, `infrastructure/`, `components/` or `utils/` folders. If a helper has no clear home, it belongs in `domain/` (pure) or `platform/` (impure).

## 5. Local database

The encrypted SQLite database is the operational source of truth. Conceptual tables:

```text
vault_meta            schema version, main currency, backup state, settings
accounts
categories
merchants
ledger_entries        immutable rows; edits add a version, voids add a reversal
ledger_transfer_links links the two legs of a transfer
clients
business_profile
invoices              status: draft | issued | void; frozen snapshots at issue
invoice_lines
invoice_allocations   (entry_id, invoice_id, amount)
invoice_number_seq    per business profile
commitments
recurring_rules
reserve_targets
attachments
entitlement_cache
schema_migrations
```

Conventions:

- UUIDv7 primary keys; `created_at` / `updated_at` as UTC instants; a version counter; tombstones, never row deletes.
- Money columns are integer minor units with a `currency` column; no floating point.
- Calendar dates are `YYYY-MM-DD` text.
- Derived state (partially paid, paid, overdue, balances) is computed from entries and allocations and is never stored.
- Keys and security metadata are not in the database tables above (see §6).

### Ledger rules

- Entry types: `income`, `expense`, `transfer`, `opening_balance`, `adjustment`.
- A transfer is two linked legs in the same transaction, in the accounts' own currencies. Cross-currency transfers are not supported in V1.
- Editing an entry creates a new version; the app shows the current version and keeps history. “Delete” is a void that preserves history and reverses effects on balances and invoice allocations.
- Reports exclude transfers from income/expense totals.

### Invoice rules

- Drafts have no number. Issue assigns the number from `invoice_number_seq` and freezes client and seller snapshots and line items.
- Status derivation: `paid` when allocations equal the total; `partially paid` when allocations are positive and less than the total; `overdue` when the due date has passed with a balance; `sent` is the user's explicit mark.
- Allocation validation: an allocation cannot exceed the entry's unallocated amount or the invoice's outstanding balance, and the entry's account currency must equal the invoice currency.
- Recording a payment writes the income entry and its allocation in one SQLite transaction and is idempotent: a client-generated operation ID prevents a retried write from creating a second entry.

## 6. Key management (summary)

Details and test requirements are in [`security.md`](security.md).

```text
Vault Master Key (VMK): random 256-bit, generated on device
  ├─ wrapped by Device Key   (Keychain / Keystore, biometric- or credential-bound, this-device-only)
  └─ wrapped by Recovery KEK (from recovery phrase, memory-hard KDF; parameters stored in the backup header)
VMK → database key, backup key, attachment key (separate derivations)
```

The vault is created before the user sees the Accounts screen, which resolves the ordering of storage and onboarding. The wrapped-key material is excluded from OS backups.

## 7. Backup architecture

```text
Consistent local snapshot
  ↓ authenticated encryption (backup key)
  ↓ versioned header (format version, schema version, KDF parameters, wrapped VMK for recovery)
Backup file (.cashline)
  ↓ user action: share sheet / Files   |   premium: scheduled write to a chosen folder
```

- The header contains non-secret parameters only.
- Restore: read header → verify integrity/authenticity → derive key from the recovery phrase → decrypt to a temporary location → validate schema and data → run migrations → atomically replace the vault → rebuild indexes → verify balances and invoice links.
- Never overwrite a healthy vault before every verification step passes.
- Scheduled backup is best-effort; the backup-overdue reminder is the guaranteed mechanism. Whether a backup can run while the device is locked depends on the device-key policy and is decided in an ADR before Phase 8.
- Backup files from iOS and Android are interchangeable and tested cross-platform.

## 8. Sync (post-V1, premium; designed now)

```text
Local mutation → append immutable change record → encrypt → write to relay / user storage
Other devices: fetch → verify → decrypt → apply
```

- Because ledger entries are immutable and edits are new versions, change logs merge by set union; only a few mutable settings need a last-writer-wins rule with hybrid logical clocks.
- Merge is followed by a validation pass for invariants (allocations within totals, invoice number uniqueness per device, etc.). A merge library is adopted only if such validation can be enforced after merge.
- Where the log lives is the user's choice: a self-hostable relay or user-selected storage. The project hosts nothing.
- There is no active-device rule and no lease; no device is “revoked”.
- Candidates (Evolu, LiveStore, PowerSync, or a minimal custom log) are evaluated in Phase 9+; E2EE support and licenses must be verified from primary sources.

## 9. Purchases and entitlements

```text
Paywall → PurchaseService (interface)
            ├─ iOS: StoreKit 2 adapter
            ├─ Android: Google Play Billing adapter
            └─ source/FOSS flavor: all features unlocked, no billing code
        → EntitlementService → feature-access policy
```

- One non-consumable product. The entitlement is read from the store's purchase record and cached locally for offline use.
- Feature gates read `EntitlementService`; screens never inspect product IDs or purchase buttons.
- No server verification exists. A tampered build can unlock premium; this is accepted and documented.
- Restore Purchases is always available. Expiry, refund or an unavailable store never affects vault access, export or backup/restore.
- The purchase library and exact versions are chosen and verified in Phase 8.

## 10. Platform adapters

```typescript
interface SecureKeyStore {
  store(alias: KeyAlias, secret: Uint8Array, options: { requireAuth: boolean }): Promise<void>;
  load(alias: KeyAlias): Promise<Uint8Array | null>; // null: no usable secret → recovery phrase
  remove(alias: KeyAlias): Promise<void>;
}
```

The port is byte-oriented. If the underlying library stores strings only, the adapter encodes and decodes; this is an adapter detail the domain never sees. `load` resolves `null` whenever no usable secret exists (never stored, lost in a restore, or invalidated by a biometric enrollment change), because the platform does not tell these apart. Reading a secret stored with `requireAuth` is what authenticates the user; `DeviceAuth` only reports what the device offers.

Equivalent ports exist or will exist for randomness and the clock, file/folder access (Android Storage Access Framework, iOS document picker and security-scoped bookmarks), sharing, notifications, background scheduling and widgets. Implementations live in `platform/<capability>/`, with iOS and Android side by side where they differ.

## 11. Visual-material boundary

Cashline uses platform-native navigation and controls. Native Liquid Glass applies only through platform navigation (for example Expo Router native tabs) on iOS 26 and later. Android uses Material 3. Dense financial content always sits on solid surfaces. There is no custom cross-platform glass component in V1. See [`design-system.md`](design-system.md).

## 12. Failure handling

Every operation must consider:

- App termination mid-write, storage full, corrupt or incomplete backup, schema mismatch.
- Biometric enrollment change or key loss; restore on a device without the original device key.
- Backup scheduling skipped by the OS.
- Store billing unavailable, purchase pending, canceled, refunded or restored.
- PDF generation or sharing failure; interrupted payment write; retried payment write.
- Clock and time-zone changes affecting calendar-date logic.

Guarantees:

- A failed backup, restore, sync or purchase never corrupts or locks the vault.
- A failed share or PDF generation changes no invoice or payment state.
- A retried payment write never creates a second income entry.

## 13. Consistency rule

A local commit is authoritative. Backups, sync and any cloud copy are replicas. A financial mutation is complete only when committed to the encrypted database; derived data is recomputed from committed rows.
