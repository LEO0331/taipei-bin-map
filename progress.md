# Session Progress Log

## Current State

**Last Updated:** 2026-06-11 09:58 Asia/Taipei  
**Active Feature:** none

## Status

### What's Done

- [x] Built the static Taipei pedestrian garbage bin app.
- [x] Converted the Big5/CP950 CSV into `public/data/bins.json` with 1197 usable records.
- [x] Added core tests, browser smoke verification, PWA-ready files, and README.
- [x] Generated initial harness files with `harness-creator`.
- [x] Replaced generic harness placeholders with project-specific scope and verification rules.
- [x] Validated the harness with a 100/100 score.
- [x] Ran `./init.sh` successfully outside the sandbox.

### What's In Progress

- [ ] No active work.

### What's Next

1. Pick the next feature only after updating `feature_list.json`.
2. Run `./init.sh` before and after substantive app changes.

## Blockers / Risks

- [ ] `npm audit --audit-level=moderate` reports a remaining Vite/esbuild dev-server advisory. npm's suggested fix is a breaking Vite 8 upgrade, so this is documented as a dev-only residual risk.
- [ ] Browser smoke tests require launching Chromium; sandboxed environments may need escalation or equivalent browser permissions.

## Decisions Made

- **Keep harness minimal**: Root `AGENTS.md` contains startup, scope, and verification only. Product details remain in `README.md` and app code.
- **Make `./init.sh` authoritative**: It runs unit tests, production build, and a smoke test against a temporary Vite server.
- **Track one active feature**: `feature_list.json` uses one active harness feature to prevent parallel scope drift.

## Files Modified This Session

- `AGENTS.md` - Project-specific agent startup and verification rules.
- `feature_list.json` - Current feature state and evidence.
- `progress.md` - Session status, risks, and next steps.
- `session-handoff.md` - Restart instructions for the next agent session.
- `init.sh` - Baseline verification script.

## Evidence of Completion

- [x] App tests before harness edits: `npm test` passed 5 tests.
- [x] App build before harness edits: `npm run build` passed.
- [x] App smoke test before harness edits: `node tools/smoke-test.mjs` confirmed 1197 records and no page errors.
- [x] Harness validation: `node /Users/Leo/.agents/skills/harness-creator/scripts/validate-harness.mjs --target /Users/Leo/Documents/taipei-bin-map` scored 100/100.
- [x] Full `./init.sh`: passed `npm test`, `npm run build`, and browser smoke test on 2026-06-11.

## Notes for Next Session

Start with `AGENTS.md`, then run `./init.sh`. Keep the app static and local-data based unless the user explicitly changes the product direction.
