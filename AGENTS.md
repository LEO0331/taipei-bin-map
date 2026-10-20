# AGENTS.md

Lightweight harness for coding agents working on the Taipei Public Amenities Map and its dedicated dashboards.

## Project Snapshot

- Static Vite + React + TypeScript app.
- No backend, login, admin page, database, or API keys.
- The shared map has 22 facility types; generated data lives in `public/data/`. Dedicated discovery, analytics and bin-policy dashboards use separate static datasets.
- Main app code lives in `src/`; reusable components live in `src/components/`.
- Core utility tests live in `src/utils/facilityUtils.test.ts`; component, policy/GIS and governance tests also live under `src/` and `scripts/`. Browser flows live in `tests/e2e/`.

## Startup Workflow

Before editing:

1. Confirm the working directory is the repository root (this workspace: `D:\Practice\taipei-bin-map`), not a fixed home-directory path.
2. Read this file, `README.md`, `feature_list.json`, and `progress.md`.
3. Use a supported Node version from `package.json`; run `npm ci` if dependencies are missing or the lockfile changed.
4. Run `bash ./init.sh`, or `npm test`, `npm run build`, and `npm run test:e2e` sequentially in PowerShell, to establish the baseline. For documentation-only work, verify links/commands and record any functional checks not rerun.
5. Review recent work with `git status --short` and `git log --oneline -5` when commits exist.

If baseline verification fails, fix or clearly record that failure before adding new scope.

## Working Rules

- One feature at a time: pick exactly one unfinished feature from `feature_list.json`.
- Keep the app static and deployable to Vercel, Netlify, or GitHub Pages.
- Do not add server-side services, accounts, CMS, or paid map APIs unless explicitly requested.
- Preserve Traditional Chinese as the default language and keep English as an optional UI language.
- Keep address and district data in Chinese; translate labels, messages, warnings, and controls.
- Regenerate affected datasets with their documented converter after changing conversion logic or source data. `npm run convert:facilities` rebuilds the shared map; policy inputs have separate versioned conversion and review procedures.
- Preserve Mode A's approved policy baseline independently of Mode B research inputs. See `docs/bin-policy-v1.2-governance.md`; a successful fetch is not source adoption.
- Shade Equity uses separate official roadside-tree/sidewalk/pit sources. Restore hash-locked originals with `npm run data:fetch:shade-equity -- --restore-frozen`; never substitute protected trees, park trees or Bin Policy observations. Its unresolved measurement/comparability gate must stay closed unless new authoritative evidence is reviewed; see `docs/shade-equity-methodology.md`.
- Keep changes scoped to one active feature from `feature_list.json`.
- Update `progress.md` and `feature_list.json` before ending a session.

## Verification Commands

Standard baseline:

```bash
./init.sh
```

Individual checks:

```bash
npm test
npm run build
npm run test:e2e
```

`npm run test:e2e` starts its own Vite server through Playwright.

## Definition of Done

A feature is done only when all are true:

- Target behavior is implemented and scoped to the active feature.
- `npm test` passes.
- `npm run build` passes.
- `npm run test:e2e` passes for relevant user flows.
- Browser smoke verification passes or a clear reason is recorded.
- Data conversion is rerun if conversion or source data changed.
- Evidence is recorded in `progress.md` or `feature_list.json`.
- Remaining risks are explicit.

## End of Session

1. Update `progress.md` with changed files, verification evidence, and next step.
2. Update `feature_list.json` statuses and evidence.
3. Keep generated folders (`node_modules/`, `dist/`, `.omx/`) out of commits.
4. Leave the repo restartable from the startup workflow.
