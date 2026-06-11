# Session Progress Log

## Current State

**Last Updated:** 2026-06-11 10:30 Asia/Taipei  
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
- [x] Completed designer polish pass with civic field-guide art direction.
- [x] Ran visual geometry checks for mobile and desktop.
- [x] Ran `./init.sh` after the design changes.
- [x] Completed Lighthouse optimization pass.
- [x] Added Playwright end-to-end coverage.
- [x] Updated `./init.sh` to run e2e as part of the baseline.
- [x] Ran full baseline after e2e changes.
- [x] Completed code review and fixed confirmed findings.
- [x] Locked cleanup behavior with `npm test`, `npm run build`, and `npm run test:e2e`.
- [x] Completed AI slop cleanup and reran full baseline.

### What's In Progress

- [ ] No active work.

### What's Next

1. Add the next feature to `feature_list.json` before editing.
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
- `src/App.tsx` - Added compact status metrics above controls.
- `src/i18n.ts` - Added localized status labels.
- `src/components/BinList.tsx` - Added numbered result row affordance.
- `src/components/WarningNotice.tsx` - Upgraded warning notice structure.
- `src/styles.css` - Reworked visual system, responsive layout, map/list polish, and reduced-motion support.
- `playwright.config.cjs` - Playwright Test config with Vite webServer and desktop/mobile projects.
- `tests/e2e/bin-map.spec.js` - End-to-end coverage for core public flows.
- `package.json` - Added `test:e2e` script.
- `vite.config.ts` - Kept Vitest scoped to unit tests so Playwright specs are not collected by Vitest.
- `.gitignore` - Ignored Playwright report artifacts.
- `README.md` - Documented the e2e command.
- `public/service-worker.js` - Changed navigation/app shell to network-first and bumped cache version to avoid stale deployments.
- `src/components/NearbyButton.tsx` - Added disabled state support.
- `src/App.tsx` - Avoided language-change data refetch and disabled nearby lookup until bin data is ready.
- `init.sh` - Removed stale server cleanup after switching baseline to Playwright webServer.
- `src/styles.css` - Removed dead marker span CSS after the map marker implementation changed.
- `tools/smoke-test.mjs` - Deleted redundant smoke utility superseded by e2e tests.
- `tools/visual-check.mjs` - Deleted redundant visual utility superseded by e2e and Lighthouse checks.

## Evidence of Completion

- [x] App tests before harness edits: `npm test` passed 5 tests.
- [x] App build before harness edits: `npm run build` passed.
- [x] App smoke test before harness edits: legacy browser smoke check confirmed 1197 records and no page errors.
- [x] Harness validation: `node /Users/Leo/.agents/skills/harness-creator/scripts/validate-harness.mjs --target /Users/Leo/Documents/taipei-bin-map` scored 100/100.
- [x] Full `./init.sh`: passed `npm test`, `npm run build`, and browser smoke test on 2026-06-11.
- [x] Designer visual check: legacy visual check captured mobile and desktop screenshots with no browser errors.
- [x] Post-polish full baseline: `./init.sh` passed `npm test`, `npm run build`, and browser smoke test on 2026-06-11.
- [x] Lighthouse final: Performance 91, Accessibility 100, Best Practices 96, SEO 100.
- [x] E2E: `npm run test:e2e` passed 10 tests across desktop and mobile Chromium.
- [x] Final baseline: `./init.sh` passed `npm test`, `npm run build`, and `npm run test:e2e` on 2026-06-11.
- [x] Code review fix baseline: `./init.sh` passed `npm test`, `npm run build`, and `npm run test:e2e` on 2026-06-11.
- [x] AI slop cleanup baseline: `./init.sh` passed `npm test`, `npm run build`, and `npm run test:e2e` on 2026-06-11.
- [x] Static/security scan: `npm audit --audit-level=moderate` reports only the known Vite/esbuild dev-server advisory with a breaking Vite 8 fix path.

## Notes for Next Session

Start with `AGENTS.md`, then run `./init.sh`. Keep the app static and local-data based unless the user explicitly changes the product direction.
