# Source layout

One home per concern. Full rules: [`docs/architecture.md`](../docs/architecture.md) §3–§4.

```text
Presentation → Application → Domain ← Data → Platform
```

| Folder           | Holds                                              | May import                                                 |
| ---------------- | -------------------------------------------------- | ---------------------------------------------------------- |
| `domain/`        | Pure TypeScript: money, dates, ledger, invoices, … | `domain` only; no React, React Native or Expo              |
| `application/`   | Use cases                                          | `domain`, `logging`; no React, React Native or Expo        |
| `data/`          | Schema, migrations, repositories; all SQL          | `application`, `domain`, `platform`, `security`, `logging` |
| `security/`      | Key hierarchy, vault lifecycle, backup format      | `domain`, `platform`, `logging`                            |
| `platform/`      | Interfaces plus iOS/Android implementations        | `logging`                                                  |
| `design-system/` | Tokens and components                              | `i18n`                                                     |
| `i18n/`          | Externalized strings                               | —                                                          |
| `logging/`       | Sanitized logging only                             | —                                                          |

Routes in `../app/` stay thin and may import `application`, `domain`, `design-system`, `i18n` and `logging`.

These rules are enforced by ESLint (`eslint.config.js`) and covered by `tests/architecture/boundaries.test.ts`. Folders are created when their first module lands.

Tests sit next to the code as `*.test.ts(x)`.
