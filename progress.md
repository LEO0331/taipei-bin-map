# Session Progress Log

## Current State

**Last Updated:** 2026-06-12 11:53 Asia/Taipei  
**Active Feature:** None

## Status

### What's Done

- [x] Added `public_toilet` to the shared `FacilityType` and toilet-specific optional fields to `Facility`.
- [x] Extended the converter for UTF-8-SIG `臺北市公廁點位資訊.csv` with trimmed headers.
- [x] Generated `public/data/public-toilets.json` and combined all three datasets into `public/data/facilities.json`.
- [x] Repositioned the product as `台北市公共便利設施地圖` / `Taipei Public Amenities Map`.
- [x] Added public toilet category, accessible-toilet, and parent-child-toilet filters.
- [x] Updated search to cover toilet name, category, manager, address, district, road, location, and note.
- [x] Updated result cards, popups, warning notices, map legend, PWA metadata, and service worker cache.
- [x] Added emoji markers and a marker cap to avoid rendering thousands of unclustered markers on mobile.
- [x] Updated README, system design, deployment, and tradeoff docs.
- [x] Updated Playwright e2e coverage for three datasets and public toilet flows.
- [x] Fixed review finding: public-toilet category/accessibility filters now narrow to public toilets when active and do not affect non-toilet-only selections.
- [x] Cleanup pass removed unused singular translation keys and tightened public-toilet filter predicate naming.

### What's In Progress

- [x] No active feature work remains for feat-013.

### What's Next

1. Review and commit the public amenities expansion.
2. Change the GitHub repository description in GitHub settings if desired.

## Blockers / Risks

- [ ] The pedestrian-bin CSV is absent at `/Users/Leo/Downloads/●行人專用清潔箱總表.csv`; converter fallback uses `public/data/bins.json`.
- [ ] The dog-waste bag box CSV is absent at `/Users/Leo/Downloads/狗便袋箱位置總表 .csv`; converter fallback uses `public/data/dog-waste-bag-boxes.json`.
- [ ] `npm audit --audit-level=moderate` previously reported the known Vite/esbuild dev-server advisory with a breaking Vite upgrade path.

## Decisions Made

- **Use one `Facility` model**: Keeps garbage bins, dog-waste bag boxes, and public toilets distinct without duplicating the UI.
- **No clustering dependency yet**: Large unfiltered result sets suppress map markers and ask users to narrow results; this satisfies mobile clutter constraints without adding a new package.
- **Keep source values in data**: Public toilet categories remain Chinese in JSON; UI translates labels where useful.
- **Keep the app static**: No backend, accounts, admin page, database, or paid map API.

## Files Modified This Session

- `scripts/convertBins.ts` - Added UTF-8-SIG public toilet conversion and output.
- `src/types.ts` - Added public toilet facility type and fields.
- `src/utils/facilityUtils.ts` - Added toilet search/filter/category label behavior.
- `src/utils/facilityUtils.test.ts` - Added public toilet filter and review-regression tests.
- `src/App.tsx` - Added multi-type selection, toilet filters, and marker cap.
- `src/components/` - Added/updated facility type, public toilet filter, list, popup, map, legend, and warning components.
- `src/i18n.ts` - Updated product naming and toilet labels/notices.
- `src/i18n.ts` - Removed unused singular facility label keys.
- `src/styles.css` - Added toilet filter, emoji marker, and marker cap styles.
- `public/data/public-toilets.json` - Generated public toilet dataset.
- `public/data/facilities.json` - Regenerated combined dataset.
- `public/data/conversion-report.json` - Regenerated conversion report.
- `public/manifest.webmanifest`, `public/service-worker.js`, `index.html` - Updated PWA/app metadata.
- `tests/e2e/bin-map.spec.js` - Added three-dataset and public toilet e2e coverage.
- `README.md`, `docs/` - Updated product and architecture docs.
- `feature_list.json`, `progress.md`, `session-handoff.md` - Updated harness state.

## Evidence of Completion

- [x] `npm run convert:bins` generated 3,256 total facilities: 1,197 pedestrian bins, 510 dog-waste bag boxes, and 1,549 public toilets.
- [x] `conversion-report.json` records public toilet source rows, valid rows, and no public toilet coordinate errors.
- [x] `npm test` passed 12 utility tests.
- [x] `npm run build` passed.
- [x] `npm run test:e2e` passed 16 desktop/mobile Playwright tests.
- [x] `./init.sh` passed `npm test`, `npm run build`, and 16 desktop/mobile Playwright tests after the cleanup pass.

## Notes for Next Session

Start with `AGENTS.md`, then inspect `feature_list.json` and `progress.md`. The public amenities expansion is implemented and verified.
