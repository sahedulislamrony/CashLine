# 0002 — Enforcing layer boundaries with ESLint

- Status: Accepted
- Date: 2026-10-13

## Context

`architecture.md` §3 defines the dependency direction `Presentation → Application → Domain ← Data → Platform` and requires a lint rule to enforce it. The domain must stay pure TypeScript so financial logic can be tested without a device.

## Decision

Enforce the layers in `eslint.config.js` with rules already shipped by `eslint-config-expo`, without adding a dependency:

- `import/no-restricted-paths` defines which `src/` folders each layer may import (table in [`src/README.md`](../../src/README.md)).
- `no-restricted-imports` bans React, React Native and Expo packages in `src/domain` and `src/application`, and bans native-capability packages (SQLite, secure storage, biometrics, files, sharing, notifications, crypto) in routes, the design system and i18n.
- `import/no-cycle` and `no-console` are errors everywhere. Logging goes through `src/logging`.

`tests/architecture/boundaries.test.ts` lints sample files and fails if any of these rules stops firing.

## Alternatives considered

- **`eslint-plugin-boundaries`:** more expressive, but an extra dependency for rules the bundled plugin already covers.
- **Convention and review only:** not acceptable for the security boundary.

## Consequences

- The list of native-capability packages in `eslint.config.js` must be extended when a new native capability is adopted.
- Open point for Phase 2: where the composition root lives. Routes may not import `data`, `platform` or `security`, so wiring implementations into use cases needs one explicit place. Decide it with the first vault use case and update this rule set in the same change.
