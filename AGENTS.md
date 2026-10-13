# Instructions for coding agents

The contributor rules in [`docs/development.md`](docs/development.md) §2 apply to you. In short:

- Read `docs/project-specifications.md`, `docs/architecture.md`, `docs/security.md` and `docs/development.md` before changing code, `docs/design-system.md` before changing UI, and `docs/memory.md` for current decisions.
- Expo changes between SDK releases. Check the versioned docs for the SDK in `package.json` (`https://docs.expo.dev/versions/v<major>.0.0/`) before using an Expo or React Native API; never invent APIs.
- Never silently change requirements or pick a security-sensitive interpretation. Record the question in `docs/memory.md` and ask the maintainer.
- Domain and application code is pure TypeScript; native capabilities stay behind interfaces in `src/platform/`. Do not disable the boundary lint rules.
- `ios/` and `android/` are generated. Configure native behavior in `app.json` and config plugins.
- Add Expo-managed packages with `pnpm exec expo install <package>`; other dependencies need the checks in `docs/security.md` §13.
- Run `pnpm check` before calling a task done. Do not claim a test passed unless it ran.
- Commits use Conventional Commits and a DCO sign-off (`git commit -s`).
- Work follows [`docs/plan.md`](docs/plan.md): tasks in order, one at a time. Finish and test a task, tick only what actually ran, then continue with the next. Stop only for a real blocker.
