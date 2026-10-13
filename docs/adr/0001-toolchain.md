# 0001 — Toolchain and Phase 0 baseline

- Status: Accepted
- Date: 2026-10-13

## Context

Phase 0 (`development.md`) requires the SDK, Node version, package manager, identifiers, minimum OS versions, test tools and Git workflow to be confirmed and recorded.

## Decision

| Item             | Choice                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------- |
| Expo SDK         | 57 (React Native 0.86, React 19.2), Expo Router                                              |
| Targets          | iOS and Android only; no web target                                                          |
| Minimum OS       | iOS 16.4 and Android 7.0 (API 24), the minimums of this SDK                                  |
| Node.js          | 24 (`.nvmrc`); `engines` allows 22.11 or newer                                               |
| Package manager  | pnpm 11, pinned through `packageManager`                                                     |
| Language         | TypeScript 6, `strict` plus `noUncheckedIndexedAccess`                                       |
| Lint and format  | ESLint 9 with `eslint-config-expo`; Prettier                                                 |
| Unit tests       | Jest 29 through `jest-expo`, React Native Testing Library 14                                 |
| End-to-end tests | Maestro (flows in `.maestro/`)                                                               |
| Native projects  | Continuous Native Generation: `ios/` and `android/` are generated and not committed          |
| Builds           | Development builds (`expo-dev-client`); Expo Go is not supported                             |
| Identifier       | `io.github.sahedulislamrony.cashline` for both platforms, **provisional** (`memory.md` O-10) |
| Git workflow     | Trunk-based on `main`, pull requests, Conventional Commits, DCO sign-off                     |

pnpm settings in `pnpm-workspace.yaml` implement parts of `security.md` §13:

- `minimumReleaseAge` of three days, so a freshly published (possibly compromised) version is not installed.
- Dependency install scripts are blocked unless explicitly allowed.
- `autoInstallPeers: false`, so optional peers such as `react-native-worklets` are not pulled in and autolinked into the native build without a decision.

GitHub Actions are pinned to commit SHAs and updated by Dependabot.

## Alternatives considered

- **npm:** lowest friction, but no release-age gate or default script blocking.
- **ESLint 10:** current, but `eslint-plugin-import` and `eslint-plugin-react` (used by `eslint-config-expo`) do not declare support for it yet.
- **Detox:** more setup and native test code than Maestro for the same smoke coverage.
- **Committing `ios/` and `android/`:** makes SDK upgrades and review harder; config plugins cover the known needs (SQLCipher, backup exclusions).

## Consequences

- The release-age gate can lag behind the newest Expo patch releases by up to three days, so `expo-doctor` may report patch mismatches. CI treats `expo-doctor` as advisory for that reason.
- Peer dependencies must be declared explicitly. `pnpm peers check` reports `react-dom`, `react-native-gesture-handler` and `react-native-reanimated` as missing; they are peers of web and drawer code that Cashline does not use.
- The identifier must be confirmed before the first store upload; it cannot be changed after publishing.
- Revisit ESLint 10 when the Expo lint config supports it.
- Not yet verified: the CI workflows, the native builds and the Maestro flow have not run (see `memory.md` §4).
