# Source layout

One home per concern. Full rules: [`docs/architecture.md`](../docs/architecture.md) §3–§4.

```text
Presentation → Application → Domain ← Data, Security, Platform
```

Outer layers reach each other only through the ports in `application/ports` ([ADR 0004](../docs/adr/0004-ports-and-composition-root.md)).

| Folder           | Holds                                                        | May import                                        |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------------- |
| `domain/`        | Pure TypeScript: money, dates, identity, ledger, invoices, … | `domain` only; no React, React Native or Expo     |
| `application/`   | Use cases, and the ports they need in `ports/`               | `domain`, `logging`; no React, React Native, Expo |
| `data/`          | Schema, migrations, repositories; all SQL                    | `application/ports`, `domain`, `logging`          |
| `security/`      | Key hierarchy, vault lifecycle, backup format                | `application/ports`, `domain`, `logging`          |
| `platform/`      | iOS/Android implementations of ports                         | `application/ports`, `domain`, `logging`          |
| `composition/`   | Composition root: builds implementations, wires use cases    | everything                                        |
| `design-system/` | Tokens and components                                        | `i18n`                                            |
| `i18n/`          | Externalized strings                                         | —                                                 |
| `logging/`       | Sanitized logging only                                       | —                                                 |

Routes in `../app/` stay thin and may import `application`, `domain`, `design-system`, `i18n`, `logging` and `composition`.

Test fakes live in `application/ports/fakes/` and may only be imported from test files.

These rules are enforced by ESLint (`eslint.config.js`) and covered by `tests/architecture/boundaries.test.ts`. Folders are created when their first module lands.

Tests sit next to the code as `*.test.ts(x)`.
