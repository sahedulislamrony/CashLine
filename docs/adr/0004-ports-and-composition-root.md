# 0004 — Ports and the composition root

- Status: Accepted (amends the layer table of [0002](0002-import-boundaries.md))
- Date: 2026-10-14

## Context

`architecture.md` §3 draws `Presentation → Application → Domain ← Data → Platform` and says business code must not import platform APIs. Two things were left open (`memory.md` O-19):

1. Use cases need storage, keys, randomness and the clock. If the interfaces for those lived in `src/platform` or `src/data`, the application layer would have to import outward, against the arrows.
2. Something has to construct the real implementations and hand them to the use cases. Routes may not import `data`, `platform` or `security`.

## Decision

**Ports live in `src/application/ports/`.** A port is an interface the core needs from the outside world: `SecureKeyStore`, `DeviceAuth`, `RandomSource`, `Clock`, and later the repositories, files, sharing, notifications and purchases. Ports are plain TypeScript with no React, React Native or Expo imports.

**Outer layers implement ports and never import each other.** `data`, `security` and `platform` may import `application/ports`, `domain` and `logging`, and nothing else in `src/`. Native packages are used only inside `platform` (and `expo-sqlite` inside `data`).

**`src/composition/` is the composition root.** It is the only place allowed to import every layer. It builds the real implementations, wires them into use cases, and exposes the result to routes. Only `app/` may import it.

**Test fakes live in `src/application/ports/fakes/`** next to the ports they imitate. ESLint forbids importing any `fakes` folder from a file that is not a test, so an in-memory key store or a predictable random source cannot ship.

| Folder          | May import (inside `src/`)                                                 |
| --------------- | -------------------------------------------------------------------------- |
| `domain`        | `domain`                                                                   |
| `application`   | `application`, `domain`, `logging`                                         |
| `data`          | `data`, `application/ports`, `domain`, `logging`                           |
| `security`      | `security`, `application/ports`, `domain`, `logging`                       |
| `platform`      | `platform`, `application/ports`, `domain`, `logging`                       |
| `design-system` | `design-system`, `i18n`                                                    |
| `i18n`          | `i18n`                                                                     |
| `logging`       | `logging`                                                                  |
| `composition`   | everything                                                                 |
| `app/` (routes) | `application`, `domain`, `design-system`, `i18n`, `logging`, `composition` |

`tests/architecture/boundaries.test.ts` covers these rules.

### The first ports

- **`SecureKeyStore`** is a small store keyed by alias (`store`, `load`, `remove`), not the `wrap`/`unwrap` pair sketched earlier in `architecture.md` §10. The platform libraries verified for SDK 57 keep the protected value inside the Keychain or Keystore-encrypted storage themselves, so there is no separate wrapped blob for the app to hold.
- **`load` returns `null` for "no usable secret"**: never stored, removed, lost in a restore to another device, or invalidated after biometric enrollment changed. `expo-secure-store` documents that it cannot tell these apart, and every case leads to the same action: unlock with the recovery phrase.
- **`DeviceAuth` only reports capability.** It has no "authenticate" method on purpose. Unlocking must be enforced by the platform when an auth-bound secret is read (`security.md` §6), never by a boolean from a prompt.

## Alternatives considered

- **Interfaces inside `src/platform/<capability>/`** (the earlier sketch): the application layer would import from `platform`, and lint could only separate interface files from native code with file-name globs.
- **Repository interfaces in `domain`:** workable, but it spreads ports over two layers.
- **A dependency-injection library:** unnecessary for an app this size; plain constructor arguments are enough.

## Consequences

- `architecture.md` §3, §4 and §10 and `src/README.md` are updated to match.
- Platform folders hold implementations only; each port has one fake that tests in every layer share.
- Adapters for `expo-secure-store`, `expo-local-authentication` and `expo-crypto` are written with the vault (plan tasks 2.2–2.4). Their APIs were checked against the SDK 57 type definitions; their behavior on real devices is not verified yet (`memory.md` §4).
- Test files may import across layers (the boundary rule is off for `*.test.ts`), so a test in `security` can run against the real libsodium adapter in `platform`.
