# Session Progress Log

## Current State

**Last Updated:** 2026-06-12 11:20 Asia/Taipei  
**Active Feature:** none

## Status

### What's Done

- [x] Refactored the data model from bin-only records to typed `Facility` records.
- [x] Added dog-waste bag box conversion from Big5/CP950 CSV.
- [x] Generated combined and per-type static JSON files under `public/data/`.
- [x] Added `conversion-report.json` with dropped row, missing field, and coordinate outlier counts.
- [x] Updated the UI product name to `台北市街頭清潔便利地圖` / `Taipei Street Cleanliness Map`.
- [x] Added facility type filtering, type-specific warning notices, map legend, type-aware popups, and type-aware result cards.
- [x] Updated PWA metadata and service worker cache entries for the new facility JSON files.
- [x] Updated README and bilingual design/deployment/tradeoff docs.
- [x] Updated unit and Playwright e2e tests for the two-dataset product direction.
- [x] Completed code-review fix pass for converter restartability and report diagnostics.
- [x] Completed AI slop cleanup pass for converter duplication/dead branches.

### What's In Progress

- [ ] No active work.

### What's Next

1. Pick the next feature or publish task.
2. Add it to `feature_list.json` before editing.
3. Run `./init.sh` before and after substantive changes.

## Blockers / Risks

- [ ] The original pedestrian-bin source CSV is not currently present at `/Users/Leo/Downloads/●行人專用清潔箱總表.csv`; the converter falls back to existing cleaned `public/data/bins.json` and records that fallback in `conversion-report.json`.
- [ ] The dog-waste bag box source CSV is not currently present at `/Users/Leo/Downloads/狗便袋箱位置總表 .csv`; the converter falls back to existing cleaned `public/data/dog-waste-bag-boxes.json` and records that fallback in `conversion-report.json`.
- [ ] `npm audit --audit-level=moderate` previously reported a Vite/esbuild dev-server advisory with a breaking Vite upgrade path.
- [ ] Browser verification requires Chromium; sandboxed environments may need approval or equivalent browser permissions.

## Decisions Made

- **Use a generic `Facility` model**: Keeps pedestrian bins and dog-waste bag boxes distinct without duplicating the whole UI.
- **Keep suspicious coordinates**: Out-of-bounds records are marked with `isCoordinateOutlier: true` and reported, not silently discarded.
- **Keep canvas markers**: About 1,700 points remain practical with Leaflet canvas markers; clustering can be added later if real usage shows visual crowding.
- **Preserve static deployment**: No backend, accounts, admin page, database, or paid map API were added.
- **Make conversion restartable**: If source CSVs are absent, checked-in cleaned JSON acts as fallback input and the report records that source.
- **Keep cleanup narrow**: Cleanup removed converter duplication and dead paths only; no UI behavior changes were included.

## Files Modified This Session

- `scripts/convertBins.ts` - Converts both datasets and writes combined/per-type JSON plus conversion report.
- `public/data/facilities.json` - Combined facility dataset.
- `public/data/pedestrian-bins.json` - Pedestrian garbage bin dataset.
- `public/data/dog-waste-bag-boxes.json` - Dog-waste bag box dataset.
- `public/data/conversion-report.json` - Data conversion report and warnings.
- `src/types.ts` - Generic facility types and conversion report types.
- `src/utils/facilityUtils.ts` - Distance, formatting, filtering, labels, map URL, and coordinate bounds.
- `src/utils/facilityUtils.test.ts` - Unit coverage for facility utilities.
- `src/App.tsx` - Facility data loading, filters, nearby logic, and footer metadata.
- `src/i18n.ts` - Updated bilingual product and facility labels.
- `src/components/` - Facility map/list/popup/filter/legend/warning components.
- `src/styles.css` - Facility filter, legend, list, warning, and responsive layout styles.
- `public/manifest.webmanifest` - Updated PWA app name and description.
- `public/service-worker.js` - Updated cache name and local data assets.
- `index.html` - Updated title and metadata.
- `tests/e2e/bin-map.spec.js` - Updated public user-flow coverage.
- `README.md` - Updated bilingual project docs.
- `docs/` - Updated bilingual system design, tradeoffs, and deployment docs.
- `package.json` - Added `convert:facilities` alias.
- `feature_list.json` - Added feat-012 tracking.
- `progress.md` - Current session status.
- Code-review fix pass touched `scripts/convertBins.ts`, `src/types.ts`, `tests/e2e/bin-map.spec.js`, `README.md`, `docs/system-design.*.md`, and regenerated `public/data/conversion-report.json`.
- AI slop cleanup simplified `scripts/convertBins.ts` by deleting redundant coordinate-null branches and centralizing fallback report creation.

## Evidence of Completion

- [x] `npm run convert:bins` generated 1,707 total facilities: 1,197 pedestrian bins and 510 dog-waste bag boxes.
- [x] `conversion-report.json` records one dog-waste coordinate outlier and preserves it with `isCoordinateOutlier: true`; it now also includes `invalidCoordinateRows`.
- [x] Code-review fix verification: `npm run convert:bins`, `npm test`, `npm run build`, and `npm run test:e2e` passed on 2026-06-12.
- [x] Post-review full baseline: `./init.sh` passed `npm test`, `npm run build`, and `npm run test:e2e` on 2026-06-12.
- [x] Cleanup targeted checks: `npm run convert:bins`, `npm test`, and `npm run build` passed on 2026-06-12.
- [x] Post-cleanup full baseline: `./init.sh` passed `npm test`, `npm run build`, and `npm run test:e2e` on 2026-06-12.
- [x] `npm test` passed 8 facility utility tests.
- [x] `npm run build` passed.
- [x] `npm run test:e2e` passed 12 desktop/mobile Playwright tests.
- [x] `./init.sh` passed `npm test`, `npm run build`, and `npm run test:e2e` on 2026-06-12.

## Notes for Next Session

Start with `AGENTS.md`, then inspect `feature_list.json` and `progress.md`. The street-cleanliness facility expansion is verified and marked done.
