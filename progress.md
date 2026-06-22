# Session Progress Log

## Current State

**Last Updated:** 2026-06-22 09:00 Asia/Taipei  
**Active Feature:** None

## Status

### What's Done

- [x] Added `drinking_fountain` to the shared `FacilityType` and drinking fountain fields to `Facility`.
- [x] Added `npm run fetch:drinking-fountains` to fetch `臺北市公共場所飲水機資訊` from Taipei Open Data into `data/raw/drinking-fountains/`.
- [x] Added drinking fountain conversion from raw API JSON with trimmed headers, district normalization, numeric parsing, place-category classification, and coordinate reporting.
- [x] Generated `public/data/drinking-fountains.json` and merged drinking fountains into `public/data/facilities.json`.
- [x] Added public drinking fountain filters for place category and opening-hour information.
- [x] Updated search, list cards, nearby results, popups, warning notices, map legend, footer, service worker cache, metadata, and README for the drinking fountain layer.
- [x] Updated Playwright e2e coverage for four datasets and drinking fountain filter/nearby flows.
- [x] Added 30 timed collection points with conservative accepted-item parsing and special-hours filtering.
- [x] Added 733 direct drinking stations with status, Taipei-only, place-type, maintenance, and photo filters.
- [x] Added local Big5/CP950 fetch/copy scripts, raw source metadata, individual JSON outputs, combined conversion, map/list/popups, notices, cache entries, README, and tests.
- [x] Added 1,184 approved used-clothing recycling boxes with village, organization, phone, search, nearby, map/list/popup, notice, cache, and local CSV workflow support.

### What's In Progress

- [x] No active feature work remains for feat-016.

### What's Next

1. Review and commit the six-layer public amenities expansion.
2. Refresh source CSVs before publishing when newer snapshots are available.

## Blockers / Risks

- [ ] The pedestrian-bin CSV is absent at `/Users/Leo/Downloads/●行人專用清潔箱總表.csv`; converter fallback uses `public/data/bins.json`.
- [ ] The dog-waste bag box CSV is absent at `/Users/Leo/Downloads/狗便袋箱位置總表 .csv`; converter fallback uses `public/data/dog-waste-bag-boxes.json`.
- [ ] Public drinking fountain data is a fetched API snapshot, not live runtime data.
- [ ] Timed collection capabilities are conservatively inferred from notes; unknown values are intentionally not treated as false.
- [ ] Direct drinking station status and sampling dates are listed-data snapshots, not real-time guarantees.
- [ ] Used-clothing box coordinates include 29 outliers; they remain listed and are excluded from map rendering.
- [ ] Used-clothing box availability and accepted-item rules are not real-time.
- [ ] `npm audit --audit-level=moderate` previously reported the known Vite/esbuild dev-server advisory with a breaking Vite upgrade path.

## Decisions Made

- **Keep one `Facility` model**: Pedestrian bins, dog-waste bag boxes, public toilets, and public drinking fountains remain distinct without duplicating the UI.
- **Keep API access out of the frontend**: The app loads static JSON only; Taipei Open Data access is handled by `scripts/fetchDrinkingFountains.ts`.
- **Keep drinking fountains scoped to public-place equipment**: Labels avoid implying complete coverage of every outdoor direct-drinking station in Taipei.
- **Do not add dashboard charts**: The app has no existing dashboard surface.
- **Skip optional nearby shortcut buttons**: The existing nearby button already respects selected facility layers.

## Files Modified This Session

- `scripts/fetchDrinkingFountains.ts` - Added Taipei Open Data API fetch with pagination and raw resource index output.
- `scripts/convertDrinkingFountains.ts` - Added drinking fountain conversion, district normalization, category classification, and coordinate reporting.
- `scripts/convertBins.ts` - Merged drinking fountains into combined facility conversion.
- `src/types.ts` - Added `drinking_fountain` and drinking fountain fields.
- `src/utils/facilityUtils.ts` - Added drinking fountain search/filter behavior and place-category/district helpers.
- `src/utils/facilityUtils.test.ts` - Added drinking fountain regression tests.
- `src/App.tsx` - Added drinking fountain filter state and marker coordinate exclusion.
- `src/components/DrinkingFountainFilters.tsx` - Added place-category and opening-hour filters.
- `src/components/FacilityTypeFilter.tsx`, `FacilityList.tsx`, `FacilityPopup.tsx`, `FacilityMap.tsx`, `MapLegend.tsx`, `WarningNotice.tsx` - Added drinking fountain labels, details, notice, and marker.
- `src/i18n.ts` - Added drinking fountain bilingual labels and notices.
- `src/styles.css` - Updated facility type layout and fountain marker styling.
- `public/service-worker.js`, `index.html` - Updated cache and metadata for the drinking fountain layer.
- `data/raw/drinking-fountains/` - Added raw Taipei Open Data API snapshot and resource index.
- `public/data/drinking-fountains.json` - Generated drinking fountain dataset.
- `public/data/facilities.json` - Regenerated combined dataset.
- `public/data/conversion-report.json` - Regenerated conversion report with drinking fountain source.
- `tests/e2e/bin-map.spec.js` - Added four-dataset, drinking fountain filter, and nearby-flow coverage.
- `package.json` - Added fetch and drinking-fountain conversion scripts.
- `README.md` - Documented the drinking fountain static data workflow and disclaimer.
- `feature_list.json`, `progress.md` - Updated harness state.

## Evidence of Completion

- [x] `npm run fetch:drinking-fountains` fetched 144 raw public drinking fountain records.
- [x] `npm run convert:facilities` generated 3,400 total facilities: 1,197 pedestrian bins, 510 dog-waste bag boxes, 1,549 public toilets, and 144 public drinking fountain locations.
- [x] Drinking fountain conversion generated 1,086 total drinking fountain units across all 12 Taipei districts with no invalid or outlier fountain coordinates.
- [x] `conversion-report.json` records the `臺北市公共場所飲水機資訊` source, 144 valid rows, and no drinking fountain coordinate errors.
- [x] `npm test` passed 16 utility tests.
- [x] `npm run build` passed.
- [x] `npm run test:e2e` passed 20 desktop/mobile Playwright tests.
- [x] `npm run convert:bins` generated 4,163 facilities: 30 timed collection points and 733 direct drinking stations in addition to the existing four layers.
- [x] Direct drinking conversion preserved 695 Taipei and 38 outside-Taipei records.
- [x] `npm test` passed 22 utility/converter tests.
- [x] `npm run build` passed.
- [x] `npm run test:e2e` and `./init.sh` passed 24 desktop/mobile Playwright tests.
- [x] Responsive smoke at 390px and 1440px found no horizontal overflow with six facility buttons.
- [x] `npm run convert:bins` generated 5,347 facilities, including 1,184 used-clothing recycling boxes from 48 organizations and 367 villages.
- [x] `npm test` passed 24 utility/converter tests.
- [x] `npm run build` passed.
- [x] `npm run test:e2e` and `./init.sh` passed 26 desktop/mobile Playwright tests.

## Notes for Next Session

Start with `AGENTS.md`, then inspect `feature_list.json` and `progress.md`. The seven-layer public amenities expansion is implemented and verified.
