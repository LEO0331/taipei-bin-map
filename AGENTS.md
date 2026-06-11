# AGENTS.md

Lightweight harness for coding agents working on the Taipei pedestrian garbage bin map.

## Project Snapshot

- Static Vite + React + TypeScript app.
- No backend, login, admin page, database, or API keys.
- Bin data is generated from the Big5/CP950 CSV into `public/data/bins.json`.
- Main app code lives in `src/`; reusable components live in `src/components/`.
- Core utility behavior is covered in `src/utils/binUtils.test.ts`.

## Startup Workflow

Before editing:

1. Confirm `pwd` is `/Users/Leo/Documents/taipei-bin-map`.
2. Read this file, `README.md`, `feature_list.json`, and `progress.md`.
3. Run `npm install` if `node_modules/` is missing.
4. Run `./init.sh` to establish the current baseline.
5. Review recent work with `git status --short` and `git log --oneline -5` when commits exist.

If baseline verification fails, fix or clearly record that failure before adding new scope.

## Working Rules

- One feature at a time: pick exactly one unfinished feature from `feature_list.json`.
- Keep the app static and deployable to Vercel, Netlify, or GitHub Pages.
- Do not add server-side services, accounts, CMS, or paid map APIs unless explicitly requested.
- Preserve Traditional Chinese as the default language and keep English as an optional UI language.
- Keep address and district data in Chinese; translate labels, messages, warnings, and controls.
- Regenerate `public/data/bins.json` with `npm run convert:bins` after changing conversion logic or source data.
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
node tools/smoke-test.mjs
```

`tools/smoke-test.mjs` expects a local app at `http://127.0.0.1:5173/`. `./init.sh` starts and stops that server automatically.

## Definition of Done

A feature is done only when all are true:

- Target behavior is implemented and scoped to the active feature.
- `npm test` passes.
- `npm run build` passes.
- Browser smoke verification passes or a clear reason is recorded.
- Data conversion is rerun if conversion or source data changed.
- Evidence is recorded in `progress.md` or `feature_list.json`.
- Remaining risks are explicit.

## End of Session

1. Update `progress.md` with changed files, verification evidence, and next step.
2. Update `feature_list.json` statuses and evidence.
3. Keep generated folders (`node_modules/`, `dist/`, `.omx/`) out of commits.
4. Leave the repo restartable from the startup workflow.
