# Cashline

**Your freelance cash, offline.**

Cashline is a free, open-source, local-first money app for solo freelancers. Track spending and client income, send and follow invoices, and see what cash you have, what you are owed, what you must pay soon, and what a purchase would leave you with. It works for iOS and Android from one codebase, needs no account, and keeps your data encrypted on your device.

> Status: early development. The project scaffold, tooling and tests are in place (Phase 0); no product features exist yet. See [`docs/development.md`](docs/development.md) for the phase plan.

## Principles

- **Local-first and private:** no accounts, no servers, no analytics. Your data stays on your phone.
- **Encrypted:** an encrypted vault on the device and encrypted backup files you control. You hold the recovery phrase; lose it and the data is gone.
- **Honest cash view:** unpaid invoices are never counted as cash.
- **Free and fair:** unlimited clients and invoices, no ads. Backup, restore and export are never paywalled. A one-time premium purchase adds convenience features (scheduled backup, advanced reports, later multi-device sync).
- **Open source:** Apache-2.0. Build it yourself and everything is unlocked. The Cashline name and logo are trademarks.

## Getting started

Requires Node.js 24, pnpm 11, and Xcode with CocoaPods (iOS) or Android Studio with JDK 17 (Android). Cashline uses development builds and does not run in Expo Go.

```bash
pnpm install
pnpm ios        # or: pnpm android
pnpm check      # format check, lint, typecheck, tests
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow, [SECURITY.md](SECURITY.md) to report a vulnerability, and [`docs/adr/`](docs/adr/README.md) for recorded decisions.

## Documentation

| Document                                                           | Purpose                                               |
| ------------------------------------------------------------------ | ----------------------------------------------------- |
| [`docs/project-specifications.md`](docs/project-specifications.md) | What V1 is and is not                                 |
| [`docs/architecture.md`](docs/architecture.md)                     | Layers, data model, key management, backup, purchases |
| [`docs/security.md`](docs/security.md)                             | Threat model, cryptography rules, tests               |
| [`docs/design-system.md`](docs/design-system.md)                   | Tokens, components, accessibility                     |
| [`docs/development.md`](docs/development.md)                       | Phase plan, contributor rules, release checklist      |
| [`docs/plan.md`](docs/plan.md)                                     | Step-by-step work plan and progress                   |
| [`docs/memory.md`](docs/memory.md)                                 | Decision log and open questions                       |
| [`docs/market-analysis.md`](docs/market-analysis.md)               | Competitor and gap analysis                           |

## License

Code is licensed under [Apache-2.0](LICENSE). The Cashline name and logo are covered by the [trademark policy](TRADEMARKS.md).

## Disclaimer

Cashline gives estimates from the data you enter. It is not financial, tax, legal or accounting advice, and invoices it produces make no claim of compliance in any jurisdiction.
