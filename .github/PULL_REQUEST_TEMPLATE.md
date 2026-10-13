## What and why

<!-- One or two sentences. Link the issue: Closes #123 -->

## How it was verified

<!-- Commands run, devices/simulators used. Do not claim a test passed unless it ran. -->

- [ ] `pnpm check` passes
- [ ] Tests added or updated alongside the change
- [ ] Verified on iOS
- [ ] Verified on Android

## Review checklist (docs/development.md §8)

- [ ] **Security:** no keys, recovery material or financial data in logs, errors, notifications or network traffic; no new permission
- [ ] **Architecture:** domain stays pure; platform code stays in `src/platform/`
- [ ] **Dependencies:** none added, or the checks in `docs/security.md` §13 are described above
- [ ] **Docs:** relevant doc and `docs/memory.md` updated if a decision changed
- [ ] Commits follow Conventional Commits and are signed off (`git commit -s`)
