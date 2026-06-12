# Session Handoff

## Current Objective

- Goal: Extend the Taipei pedestrian garbage bin map into `台北市街頭清潔便利地圖` / `Taipei Street Cleanliness Map` with dog-waste bag box data.
- Current status: Implementation, data conversion, docs, tests, e2e, and full baseline verification are complete.
- Branch / commit: Working tree has uncommitted app, data, docs, and test changes.

## Completed This Session

- [x] Refactored the app from `Bin` to typed `Facility` records.
- [x] Added dog-waste bag box CSV conversion with Big5/CP950 decoding.
- [x] Generated combined and per-type facility JSON files.
- [x] Generated `conversion-report.json` with coordinate outlier reporting.
- [x] Preserved the suspicious dog-waste coordinate as `isCoordinateOutlier: true`.
- [x] Added facility type filter, type-aware warnings, popups, result cards, and map legend.
- [x] Updated nearby lookup to respect selected facility types and filters.
- [x] Updated product naming, i18n labels, PWA metadata, and service worker cache.
- [x] Updated README and bilingual docs.
- [x] Updated unit and e2e tests.

## Verification Evidence

| Check | Command | Result | Notes |
|---|---|---|---|
| Data conversion | `npm run convert:bins` | Passed | Generated 1,707 facilities: 1,197 pedestrian bins and 510 dog-waste bag boxes. |
| Unit tests | `npm test` | Passed | 8 facility utility tests passed. |
| Production build | `npm run build` | Passed | Vite production build completed. |
| E2E | `npm run test:e2e` | Passed | 12 desktop/mobile Playwright tests passed. |
| Full baseline | `./init.sh` | Passed | `npm test`, `npm run build`, and `npm run test:e2e` passed. |

## Files Changed

- `scripts/convertBins.ts`
- `package.json`
- `public/data/facilities.json`
- `public/data/pedestrian-bins.json`
- `public/data/dog-waste-bag-boxes.json`
- `public/data/conversion-report.json`
- `public/manifest.webmanifest`
- `public/service-worker.js`
- `index.html`
- `src/App.tsx`
- `src/types.ts`
- `src/i18n.ts`
- `src/utils/facilityUtils.ts`
- `src/utils/facilityUtils.test.ts`
- `src/components/FacilityTypeFilter.tsx`
- `src/components/FacilityList.tsx`
- `src/components/FacilityMap.tsx`
- `src/components/FacilityPopup.tsx`
- `src/components/MapLegend.tsx`
- `src/components/NearbyButton.tsx`
- `src/components/WarningNotice.tsx`
- `src/styles.css`
- `tests/e2e/bin-map.spec.js`
- `README.md`
- `docs/system-design.en.md`
- `docs/system-design.zh-Hant.md`
- `docs/tradeoffs.en.md`
- `docs/tradeoffs.zh-Hant.md`
- `docs/deployment.en.md`
- `docs/deployment.zh-Hant.md`
- `feature_list.json`
- `progress.md`
- `session-handoff.md`

## Decisions Made

- Use one generic `Facility` model instead of two parallel app flows.
- Keep dog-waste bag boxes distinct from garbage bins in labels, warnings, filters, and result cards.
- Keep coordinate outliers in the dataset and surface warnings rather than dropping them.
- Continue using Leaflet canvas markers rather than adding clustering for the current 1,700-point scale.
- Keep `npm run convert:bins` as a compatibility alias and add `npm run convert:facilities` for clarity.

## Blockers / Risks

- The original pedestrian-bin source CSV is absent at `/Users/Leo/Downloads/●行人專用清潔箱總表.csv`; converter fallback uses existing `public/data/bins.json`.
- Remaining npm audit warning from previous sessions is the known Vite/esbuild dev-server advisory with a breaking upgrade path.
- Chromium e2e may require browser permissions in restricted environments.

## Next Session Startup

1. Read `AGENTS.md`.
2. Read `feature_list.json`, `progress.md`, and this handoff.
3. Run `./init.sh` to re-establish the baseline before new work.
4. Add the next feature to `feature_list.json` before editing.
