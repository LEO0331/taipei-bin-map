# Session Handoff

## Current Objective

- Goal: Add a minimal coding-agent harness to the Taipei bin map project.
- Current status: Harness files created, customized, validated, baseline verified, designer polish, Lighthouse optimization, e2e coverage, code review fixes, AI slop cleanup, and publish-readiness docs/assets completed.
- Branch / commit: Current working tree has uncommitted initial app and harness files.

## Completed This Session

- [x] Created `AGENTS.md`, `feature_list.json`, `progress.md`, `session-handoff.md`, and `init.sh`.
- [x] Replaced generated placeholders with project-specific startup, scope, verification, and feature-state guidance.
- [x] Updated harness state to reflect the completed app and current harness feature.
- [x] Validated harness structure.
- [x] Ran full `./init.sh` baseline successfully.
- [x] Completed civic field-guide visual polish pass.
- [x] Re-ran full `./init.sh` baseline after design changes.
- [x] Completed Lighthouse optimization pass.
- [x] Added Playwright e2e tests and wired them into `./init.sh`.
- [x] Re-ran full `./init.sh` baseline after e2e changes.
- [x] Fixed code-review findings around service-worker update freshness, nearby lookup readiness, and stale harness code.
- [x] Removed redundant one-off browser utility scripts and dead marker CSS.
- [x] Added PNG PWA icons, generated data metadata, bilingual README/docs, and Vercel deployment docs.

## Verification Evidence

| Check | Command | Result | Notes |
|---|---|---|---|
| Unit tests | `npm test` | Passed | 5 utility tests passed before harness edits. |
| Production build | `npm run build` | Passed | Vite production build completed before harness edits. |
| Browser smoke | legacy smoke check | Passed | Confirmed 1197 records, language toggle, search/filter, markers, and no page errors before harness edits. Superseded by `npm run test:e2e`. |
| Harness validation | `node ~/.agents/skills/harness-creator/scripts/validate-harness.mjs --target ~/Documents/taipei-bin-map` | Passed | 100/100. |
| Full baseline | `./init.sh` | Passed | Required unsandboxed run for Vite bind; tests, build, and smoke test passed. |
| Visual check | legacy visual check | Passed | Captured mobile and desktop screenshots; no page errors. Superseded by Playwright e2e and Lighthouse checks. |
| Lighthouse | `npx lighthouse@12.8.2 http://127.0.0.1:4173/ ...` | Passed | Final scores: 91/100/96/100. |
| E2E | `npm run test:e2e` | Passed | 10 tests across desktop and mobile Chromium. |
| Final baseline | `./init.sh` | Passed | Unit tests, build, and e2e passed. |
| Code-review fix baseline | `./init.sh` | Passed | Unit tests, build, and e2e passed after review fixes. |
| AI slop cleanup baseline | `./init.sh` | Passed | Unit tests, build, and e2e passed after cleanup. |
| Publish readiness baseline | `./init.sh` | Passed | Unit tests, build, and e2e passed after docs/assets/metadata changes. |

## Files Changed

- `AGENTS.md`
- `feature_list.json`
- `progress.md`
- `session-handoff.md`
- `init.sh`
- `src/App.tsx`
- `src/i18n.ts`
- `src/components/BinList.tsx`
- `src/components/WarningNotice.tsx`
- `src/styles.css`
- `playwright.config.cjs`
- `tests/e2e/bin-map.spec.js`
- `vercel.json`
- `public/robots.txt`
- `public/service-worker.js`
- `src/components/NearbyButton.tsx`

## Decisions Made

- Keep root instructions concise and procedural.
- Use `feature_list.json` as the source of truth for active work.
- Make `./init.sh` run the browser smoke test against a managed local Vite server.
- Visual direction is civic field-guide: warm paper, ink typography, teal civic accents, tactile command surface.
- `./init.sh` now uses Playwright e2e as the managed browser baseline.

## Blockers / Risks

- Remaining npm audit warning is a Vite/esbuild dev-server advisory with a breaking upgrade path.
- Chromium smoke tests may require unsandboxed browser permissions in some environments.

## Next Session Startup

1. Read `AGENTS.md`.
2. Read `feature_list.json` and `progress.md`.
3. Review this handoff.
4. Run `./init.sh`.

## Recommended Next Step

- Pick the next product or maintenance feature, add it to `feature_list.json`, then run `./init.sh` before editing.
