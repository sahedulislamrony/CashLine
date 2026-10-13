# Project Memory — Cashline

Decision log and open items. Open items are **not** approved requirements. Last updated: 2026-10-13.

## 1. Confirmed decisions

| ID   | Decision                                                                                                                                                                                                   | Date         |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| D-01 | Name: **Cashline**. Tagline: “Your freelance cash, offline.” Checked only for exact-name collisions on the US App Store; trademark, Play Store, domain and GitHub availability are **not** verified.       | 2026-10-13   |
| D-02 | iOS and Android from one Expo / React Native / TypeScript codebase, both first-class from day one.                                                                                                         | 2026-10-13   |
| D-03 | Codebase license: **Apache-2.0**. Name and logo protected by trademark, not licensed to forks.                                                                                                             | 2026-10-13   |
| D-04 | Free + **one-time premium purchase**. No subscription, no ads, no caps on clients or invoices, no custom invoice templates.                                                                                | 2026-10-13   |
| D-05 | Premium list: automatic scheduled backup, advanced reports, and multi-device sync when it ships. Backup/restore, CSV export, outlook and ledger are never paywalled.                                       | 2026-10-13   |
| D-06 | Billing via **direct store APIs** (StoreKit 2 / Google Play Billing) through a maintained library verified at selection time. No RevenueCat. Builds from source and a store-free flavor unlock everything. | 2026-10-13   |
| D-07 | **No accounts, no backend, no Supabase.** The project hosts nothing. One-active-device rule, device leases, email verification and cloud snapshots are removed.                                            | 2026-10-13   |
| D-08 | Any **ISO 4217 currency** is supported from day one. `Money = { minor, currency }` with exponent from a bundled table; no cross-currency arithmetic; no exchange rates in V1.                              | 2026-10-13   |
| D-09 | Key model: random VMK wrapped by a device-bound key (daily unlock) and by a recovery-phrase key (new device, key loss). Vault created automatically before onboarding screens.                             | 2026-10-13   |
| D-10 | Ledger is immutable: edits are versions, deletes are voids. Invoice payment = income entry + allocation (not two parallel records). Invoice stored status: `draft                                          | issued       | void`; everything else derived. | 2026-10-13 |
| D-11 | Backup = encrypted versioned file. Manual backup/restore and a backup-overdue reminder are free; scheduled backup is premium and best-effort.                                                              | 2026-10-13   |
| D-12 | No AI in V1; deterministic calculations only.                                                                                                                                                              | 2026-10-13   |
| D-13 | Visual language: platform-native (Material 3 on Android; native controls and Liquid Glass via platform navigation on iOS 26+). No custom glass component in V1.                                            | 2026-10-13   |
| D-14 | V1 adds: CSV import/export, quick-add widget/shortcut, localization (RTL-ready), and manual tax/discount lines on invoices.                                                                                | 2026-10-13   |
| D-15 | First-release audience is solo freelancers with irregular client income; students are not a primary V1 audience. Unpaid invoices are never counted as cash.                                                | carried over |
| D-16 | Subscription/premium state never deletes data or blocks access to the vault, backup, restore or export.                                                                                                    | carried over |

## 2. Product guardrails carried over

- Cash received, unpaid invoices and expected income are shown separately; estimates show assumptions and never tell the user whether to buy.
- V1 does not collect payments, calculate tax, or claim legal invoice compliance in any jurisdiction.
- External wallet linking, bank ingestion, tax filing, payroll and double-entry bookkeeping are outside V1.
- Client, invoice, line-item and allocation data live only in the encrypted vault and in encrypted backups.

## 3. Open decisions (with proposed defaults — confirm or change)

| #    | Question                                                                                                                                                  | Proposed default                                                                                                                                                                                               |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| O-01 | First localization languages and launch regions (invoice-field guidance, testing)                                                                         | Owner to choose 1–2 regions; none assumed                                                                                                                                                                      |
| O-02 | Account types in V1                                                                                                                                       | Cash, Bank, Mobile wallet (manual balances only; credit and debt later)                                                                                                                                        |
| O-03 | Invoice numbering                                                                                                                                         | Per-seller gapless sequence assigned at issue; user-editable prefix; void and re-issue to correct                                                                                                              |
| O-04 | Rounding for quantity × unit amount                                                                                                                       | Round half away from zero to the currency's minor unit per line; total = sum of rounded lines; quantity up to 3 decimals (record as an ADR)                                                                    |
| O-05 | Reserve target default                                                                                                                                    | No default amount; user enters it, with an optional “months of essential spending” helper                                                                                                                      |
| O-06 | Budget periods                                                                                                                                            | Week / month / custom date range; build only if the validation gate shows demand                                                                                                                               |
| O-07 | App lock default                                                                                                                                          | Biometric or device credential; auto-lock after 1 minute (user-configurable)                                                                                                                                   |
| O-08 | Premium price and trial                                                                                                                                   | Test a one-time price in the $15–30 range; no trial; regional pricing through the stores                                                                                                                       |
| O-09 | Minimum OS versions                                                                                                                                       | **Resolved (ADR 0001):** iOS 16.4 and Android 7.0 (API 24), the minimums of Expo SDK 57                                                                                                                        |
| O-10 | Application ID / bundle identifier                                                                                                                        | **Provisional:** `io.github.sahedulislamrony.cashline` is set in `app.json` so builds work. Owner to confirm or replace with a domain they control before the first store upload (it cannot change afterwards) |
| O-11 | Background backup while the device is locked                                                                                                              | ADR in Phase 8; default is “run only when unlocked, reminder covers the gap” until verified                                                                                                                    |
| O-12 | Sync technology (post-V1)                                                                                                                                 | Evaluate Evolu, LiveStore, PowerSync and a minimal custom log; verify E2EE and licenses first                                                                                                                  |
| O-13 | E2E test tool                                                                                                                                             | Maestro chosen (ADR 0001); smoke flow in `.maestro/`. **Not yet run** on a device or in CI                                                                                                                     |
| O-14 | Translation platform                                                                                                                                      | An open-source-friendly hosted platform; deferred to Phase 3, when strings are externalized                                                                                                                    |
| O-15 | Contributor mechanism                                                                                                                                     | **Resolved:** DCO sign-off, enforced by commitlint locally and in CI                                                                                                                                           |
| O-16 | Validation-gate criteria                                                                                                                                  | Continue if at least 40% of tested freelancers say they would switch, manual entry is tolerated, and a meaningful share would pay around the test price; otherwise pivot or stop                               |
| O-17 | Advanced-reports exact contents                                                                                                                           | Per-client revenue, year-over-year/trend comparison, cash-flow history, PDF report export (refine after the gate)                                                                                              |
| O-18 | Light `accent` (`#8B683A`) on `surfaceSubtle` is 4.35:1, below the 4.5:1 that `design-system.md` §4 claims for all text pairs (found by `tokens.test.ts`) | Treat `accent` as non-text / large-text emphasis only (3:1, which it meets on every surface), or darken the light value; owner to choose and update `design-system.md`                                         |
| O-19 | Composition root: routes may not import `data`, `platform` or `security`, so use cases need one place where implementations are wired in                  | Decide with the first vault use case in Phase 2 (ADR 0002)                                                                                                                                                     |

## 4. Verification status

Verified:

- Light/dark design-token contrast pairs were recomputed on 2026-10-13. The light `outlineStrong` token was corrected to `#728279`.
- `expo-sqlite` documents a `useSQLCipher` config-plugin option (needs a development build, not Expo Go).
- Android documents `allowBackup` / `dataExtractionRules` / `fullBackupContent` exclusions for cloud-backup and device-transfer.
- Expo documents Router native tabs as beta in recent SDKs (import path changed in newer docs). In SDK 57 the import is `expo-router/unstable-native-tabs`.
- Phase 0, on 2026-10-13 (macOS, Node 24): `pnpm check` passes (format, lint, typecheck, 88 Jest tests, 100% coverage of the code that exists); `expo prebuild` generates both native projects with the expected identifier and `allowBackup="false"`; `expo export` bundles the app for iOS and Android.

Unverified (must be rechecked at implementation time):

- Phase 0 exit criteria are **not met yet**: no native build has been compiled and the app has not been launched on a simulator, emulator or device (the setup machine had no CocoaPods or JDK). The GitHub Actions workflows and the Maestro flow have never run.
- Drizzle compatibility with Expo SDK 57, SQLCipher behavior with raw keys.
- Android Keystore and iOS Keychain behavior on backup restore and biometric enrollment change.
- Argon2id parameters (take from current OWASP guidance or RFC 9106).
- Whether native tabs apply Liquid Glass automatically on iOS 26.
- Purchase library choice and its compatibility with the chosen SDK.
- Evolu and other sync candidates' licenses, E2EE support and Expo compatibility.
- Trademark availability for “Cashline”.
- Market data and prices in [`market-analysis.md`](market-analysis.md) come from store listings and comparison blogs; re-check before any price decision.

## 5. Anomalies from the earlier docs and how they were resolved

| Earlier problem                                                                                 | Resolution                                                           |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Subscription/RevenueCat/entitlement stack                                                       | Replaced by one-time premium via direct store APIs (D-04, D-06)      |
| Hosted Supabase and server-side AI had no funding                                               | No backend, no AI (D-07, D-12)                                       |
| One-active-device and leases had no security value and caused data-loss ambiguity               | Removed; V1 uses a backup file; later E2EE sync with no lease (D-07) |
| Mandatory email login contradicted local-first                                                  | No accounts (D-07)                                                   |
| Onboarding order vs encrypted storage                                                           | Vault created first, automatically (D-09)                            |
| Two-decimal rule vs global market                                                               | `Money` with ISO 4217 exponents (D-08)                               |
| Payment stored twice; delete vs immutable records                                               | Allocation model, voids (D-10)                                       |
| Stored invoice status could drift                                                               | Derived status (D-10)                                                |
| Invoices lacked seller profile, snapshots, number rules, tax lines                              | Added (spec §9–§10)                                                  |
| Missing transfer, opening balance, commitments, planned purchase                                | Added (spec §9, §11)                                                 |
| Key hierarchy conflated unlock and recovery                                                     | Split into device key and recovery key (D-09)                        |
| Background backup vs locked vault; OS backups not in threat model                               | Added reminder fallback, ADR, T4 in `security.md`                    |
| Delivery order delayed the product promise                                                      | New phase plan puts the outlook at Phase 5 (`development.md`)        |
| Custom glass with no Android implementation                                                     | Platform-native visuals (D-13)                                       |
| Android-only assumptions                                                                        | iOS and Android first-class throughout                               |
| Dates and time zones undefined; no localization                                                 | Calendar-date rule and localization requirement (spec §8, §16)       |
| Open decisions had no defaults                                                                  | Section 3 above                                                      |
| Design system: missing draft/sent chips, forecast vs expected token clash, weak `outlineStrong` | Fixed in `design-system.md`                                          |
| Duplicate/overlapping source folders, mixed names                                               | Single source tree and one name (architecture §4)                    |
| No open-source hygiene or supply-chain controls                                                 | Phase 0 and `security.md` §13, §16                                   |

## 6. Milestones

- 2026-10-13: Docs reviewed, anomalies analyzed, market analysed ([`market-analysis.md`](market-analysis.md)), and all docs rewritten to the Cashline model.
- 2026-10-13: Phase 0 scaffold added (Expo SDK 57 project, lint boundaries, tests, CI definitions, open-source files, ADRs 0001–0002). Phase 0 stays open until CI builds both platforms and the app is launched from those builds.
