# Cashline — Security Specification

Status: aligned with [`project-specifications.md`](project-specifications.md) on 2026-10-13.

## 1. Security objective

Cashline handles highly sensitive financial data. Security is a system property, not a single encryption feature.

Objectives:

1. Confidentiality of financial records on the device, in backups and in shared files.
2. Integrity of financial records and backups.
3. Protection of cryptographic keys.
4. Safe recovery and device migration without a server.
5. No data leaves the device except by explicit user action (and store billing).
6. Resistance to accidental developer leakage.
7. Trustworthy distribution: users can verify they run the official, unmodified app.
8. Detectable and testable failure modes.

Use OWASP MASVS as the verification framework (control groups: STORAGE, CRYPTO, AUTH, NETWORK, PLATFORM, CODE, RESILIENCE, PRIVACY) and MASTG for practical testing.

## 2. Security authority

Nothing may be described as secure unless verified. Before implementing or changing a security-sensitive mechanism:

1. Check current official documentation (OWASP, Android Developers, Apple Developer, Expo, React Native, package repositories).
2. Check the exact package version and platform behavior.
3. Prefer established standards and platform primitives; never invent cryptographic protocols.
4. Document assumptions.
5. Ask for confirmation if a requirement is ambiguous.

If a property is unverified, write:

```text
UNVERIFIED:
The selected library/version needs verification before this mechanism is implemented.
```

If a requirement is ambiguous:

```text
QUESTION:
Two interpretations are possible:
A...
B...
Please confirm.
```

## 3. What Cashline does not need

Cashline has no accounts, no server, no API keys and no secrets in the app. This removes whole threat classes (account takeover, backend compromise, cloud storage leaks, server-side authorization bugs). The remaining risks are on-device, in files the user shares, and in the supply chain.

## 4. Threat model

### T1 — Lost or stolen device

Defenses: device-bound vault key, biometric/credential app lock, encrypted database, no plaintext financial data in ordinary storage, app-switcher and screenshot protection, minimal logging.

### T2 — Stolen or leaked backup file

Defenses: authenticated encryption before the file exists outside the app, key derived through the recovery phrase with a memory-hard KDF, versioned header with non-secret parameters only, and a clear warning that the phrase protects the backup.

### T3 — Modified, malformed or malicious backup/import file

Defenses: integrity and authenticity verified before decryption results are used; schema and data validation before replace; atomic restore; CSV import is parsed defensively and creates ledger entries only through the normal validated use case; no executable content.

### T4 — Backup or restore through the operating system

Android Auto Backup and device-to-device transfer, and iOS device/iCloud backups, can copy app files. Defenses: exclude the database and wrapped-key files using Android `dataExtractionRules` (Android 12+) and `fullBackupContent` (Android 11 and lower) for both cloud-backup and device-transfer sections; set the iOS exclude-from-backup attribute; store the device key with “this device only” accessibility. When the database is present without its device key (after a restore), the app falls back to recovery-phrase unlock and tells the user.

### T5 — Compromised or malicious dependency (supply chain)

Defenses: pinned lockfile, minimal dependencies in security-sensitive code, dependency audit and secret scanning in CI, review of native permissions, signed release builds, documented build-from-source and signature-verification instructions, and an SBOM for releases.

### T6 — Counterfeit or modified app

Because the code is open, anyone can build a lookalike. Defenses: registered name/logo trademark, published official signing certificate fingerprints, store-only official distribution, and a documented policy against use of the name by forks.

### T7 — Sensitive data in logs, crash reports, notifications, clipboard, deep links, screenshots

Defenses: sanitized logging only; no transaction, account, client or invoice objects in logs; no financial data in notifications by default; no sensitive deep-link parameters; screenshot/app-switcher protection on sensitive screens where the platform allows (Android `FLAG_SECURE`; iOS privacy overlay).

### T8 — Premium tampering

A modified build can unlock premium features. This is accepted: the premium list is convenience, the code is open, and no data is held hostage. Never design a feature where premium status protects user data.

### T9 — Shared invoice document disclosure

An invoice PDF contains plaintext client and financial details by design. It is generated locally, shared only by explicit user action, and temporary copies are removed where the platform permits.

## 5. Cryptographic requirements

- Use well-maintained libraries and platform cryptography; never implement primitives manually.
- Verify algorithms against the selected library versions before implementation.
- Authenticated encryption for the backup file (an AEAD construction from a reputable library, chosen and verified in Phase 2/6).
- SQLCipher for the database. Supply the key as raw key material rather than a password so no KDF cost applies on every open; verify the exact `expo-sqlite` and SQLCipher behavior and version.
- Memory-hard KDF for the recovery phrase. Argon2id is the expected choice, with parameters taken from the current OWASP Password Storage guidance or RFC 9106 at implementation time. Do not invent parameters.
- Derive the database, backup and attachment keys from the VMK with distinct labels (for example HKDF); do not reuse one key for several purposes.
- Never invent: custom XOR encryption, custom hashing, custom key exchange, custom password encryption or a custom crypto protocol.

## 6. Key hierarchy

```text
Vault Master Key (VMK): random 256-bit, generated on the device
  ├─ Device Key (Keychain / Keystore, this device only)
  │     biometric- or device-credential-bound
  │     wraps VMK for daily unlock
  └─ Recovery KEK (derived from the recovery phrase with a memory-hard KDF)
        wraps VMK; the wrapped VMK and KDF parameters are stored in the backup header
VMK → DB key · backup key · attachment key
```

Rules:

- Daily unlock and disaster recovery are separate paths. Biometrics or device credential unlock the Device Key; the recovery phrase restores access on a new device or after key loss.
- Biometric unlock must be cryptographically bound to the Device Key (hardware-backed access control), not a boolean returned by a prompt (MASVS-AUTH). Verify behavior when biometric enrollment changes; define the fallback (device credential or recovery phrase).
- The recovery phrase is shown once and must be confirmed by the user. It is never stored, logged, copied by default or sent anywhere.
- Never store plaintext keys in SQLite, AsyncStorage, Zustand persistence, logs, source code, environment variables or backups.
- Loss of the recovery phrase together with the device means the data cannot be recovered. The app states this at creation and in backup settings.
- If a secret-storage library handles strings only, the adapter encodes and decodes bytes. Encoding is an adapter detail.

## 7. Secure platform storage

- Small secrets and wrapped keys use platform-backed storage (iOS Keychain, Android Keystore) through `SecureKeyStore`.
- Storage must not be treated as the only copy of irreplaceable key material: the recovery path exists for this reason.
- Test secure-storage and biometric behavior on real iOS and Android devices.

## 8. Database security

- The financial vault is an SQLCipher-encrypted SQLite database; it is the only place financial records live.
- Never store sensitive financial records in AsyncStorage, plain JSON, unprotected SQLite, logs, URL parameters, deep links or analytics.
- All database access goes through the data layer; the presentation layer has no SQL.
- Client, invoice, line-item, allocation and payment data are financial data and stay in the encrypted vault and in encrypted backups only.
- Recording a payment (income entry plus allocation) is one atomic, idempotent transaction.

## 9. Money integrity

- Authoritative amounts are integer minor units with an ISO 4217 currency; never floating point.
- Exponents come from the bundled currency table. Rounding rules are explicit and tested.
- Cross-currency arithmetic does not exist in V1; code that mixes currencies must throw.
- Tests cover: addition, subtraction, zero, negatives, large values and overflow, 0-, 2-, 3-decimal currencies, rounding/display conversion, invoice line and total arithmetic, partial-payment totals, and transfer symmetry.

## 10. Backup and restore security

Backup:

```text
Consistent snapshot → authenticated encryption → versioned header → file
```

Restore:

```text
Open file → verify integrity/authenticity → derive key from phrase → decrypt to temp
→ validate schema → validate data → migrate if needed → atomic replace → verify balances/invoices
```

- A healthy vault is never overwritten by an unverified file.
- Wrong phrase, modified header, truncated or corrupt files must fail safely and leave the existing vault untouched.
- Backup files contain only ciphertext and non-secret header parameters.
- Scheduled backups run without exposing keys to a locked device unless the key policy (ADR) allows it; otherwise they run only while unlocked and the reminder covers the gap.

## 11. Sensitive UI

- Amounts, invoice details and cash-flow warnings remain legible and are not placed on translucent surfaces where contrast cannot be verified.
- Hide content in the app switcher; protect sensitive screens from screenshots where the platform allows.
- Never place financial data in notification text unless explicitly designed and approved. Due-date reminders use generic text.
- Do not copy master keys, recovery phrases, tokens or full records to the clipboard. If copying an amount or note is supported, document the exposure.

## 12. Network and permissions

- V1 makes no network requests except store billing performed by the platform billing libraries. Verify with a network-traffic test before release.
- The app requests no location, contacts or advertising identifiers. Notifications are optional and generic.
- When the optional sync relay ships, all traffic uses TLS, uses the user's own relay or storage, carries only ciphertext, and gets its own threat model and tests before release.
- Do not adopt certificate pinning without evaluating operational cost and current platform guidance.

## 13. Dependencies and supply chain

Before adding a package: check the official repository, maintenance and release activity, security advisories, native permissions, transitive dependencies, Expo SDK compatibility, and whether it handles sensitive data. Minimize dependencies in security-sensitive code.

Build and release:

- Lockfile committed; dependency and secret scanning in CI.
- Signed release builds; official signing fingerprints published.
- Reproducible-build effort documented for the store-free flavor.
- Release notes and an SBOM per release.

## 14. Secrets and credentials

Cashline ships no API keys. Credentials that exist are the project's own:

- Android upload/signing keys, Apple certificates and provisioning profiles, and store API credentials are held in a CI secret store with limited access, never committed, and rotated if exposed.
- `.env*` files are gitignored; secret scanning runs in CI.
- Never embed any secret in the app bundle.

## 15. Error handling

Errors must not reveal keys, recovery material, database contents, request bodies or file paths that identify the user. User-facing errors are understandable; developer diagnostics are sanitized.

## 16. Vulnerability disclosure

The repository carries a `SECURITY.md` describing how to report a vulnerability privately, expected response times and supported versions. Security reports are handled before feature work.

## 17. Security testing

Minimum areas, on iOS and Android:

- **Storage:** database is encrypted; wrong key fails; secrets absent from ordinary storage; nothing sensitive in logs; OS-backup exclusion verified (inspect an Android backup and an iOS backup).
- **Key handling:** unlock, lock, restart, biometric enrollment change, key loss then recovery-phrase unlock, wrong phrase.
- **Backup:** encrypted; modified, truncated and corrupt files rejected; wrong phrase fails safely; restore is atomic; iOS ↔ Android restore works.
- **Import/export:** malformed CSV handled safely; no formula injection in CSV export (neutralize leading `=`, `+`, `-`, `@` in exported text fields).
- **Invoices:** client and invoice content absent from logs and network traffic; PDFs shared only on explicit action; interrupted and repeated payment writes do not duplicate or corrupt data; backup/restore preserves allocations.
- **Network:** a traffic capture shows no requests other than store billing.
- **Purchases:** canceled/failed purchases grant nothing; restore is idempotent; expiry or refund never locks, hides or blocks export of data; purchase tokens and receipts are not logged.
- **UI:** app-switcher hiding; screenshot protection where available; notifications contain no financial data.
- **Supply chain:** lockfile integrity, dependency audit, secret scan, and signature verification of release builds.

## 18. Verification standard

Review all MASVS groups before release, with MASTG-style testing on real devices. Record results and any unverified items in `docs/memory.md`.

## 19. Rule for contributors and coding agents

> If a security property is not verified, do not claim it is implemented. Do not silently choose a security-sensitive interpretation. Ask, or record the question in `docs/memory.md`.
