# AERQON

Cloud security evidence and remediation assurance for small SaaS teams using AWS.

## Current phase

**PHASE 1 — Repository Foundation**

This repository contains only the web, quality, and test foundation. It does not access AWS, use credentials, contain customer data, or implement domain rules.

## Tooling

- Next.js 16.3.4, React 19.2.0, and TypeScript 5.9.3
- ESLint 9.38.0
- Vitest 4.0.7 with React Testing Library
- Playwright 1.56.1

All direct dependencies are pinned exactly in `package.json`; `package-lock.json` records the resolved transitive tree.

## Commands

```powershell
npm install
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Run `npx playwright install chromium` once before the end-to-end test on a new machine.

### Local environment note

On the current machine, the global `npm` launcher resolves to a missing copy of npm under `%APPDATA%`. The project is valid, but run commands through the healthy npm bundled with Node until that machine-level installation is repaired:

```powershell
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run build
```

## Quality gate

`npm run verify` runs typecheck, lint, unit tests, and production build. The end-to-end suite is separate because it requires the Playwright Chromium binary.
