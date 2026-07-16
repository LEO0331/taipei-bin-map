# Session Progress Log

## Current State

**Last Updated:** 2026-07-14 Asia/Taipei
**Active Feature:** None

## Status

### What's Done

- [x] Fetched the official Taipei Open Data accessible public off-street parking CSV (113 rows) into `data/raw/accessible-public-parking-facilities/`.
- [x] Added UTF-8-SIG/Big5/CP950-safe conversion, raw accessibility preservation, non-negative count parsing, TWD97/WGS84 detection, TWD97-to-WGS84 conversion, primary/fallback keys, and conversion-quality reporting.
- [x] Generated 113 records: 86 valid markers and 27 invalid-coordinate directory records across all 12 districts; merged them into 16,956 combined facilities.
- [x] Added shared filters, search fields, exact marker safeguards, popup/list fields, bilingual labels/notices, PWA cache entries, and a seven-view module dashboard with overview cards, district/feature charts, directory, quality, and notes views.
- [x] Added converter regression coverage for counts, accessibility normalization, and TWD97 coordinates.
- [x] Verification: `npm.cmd test` passed 56 tests; `npm.cmd run build` passed; alternate-port desktop Playwright suite passed 32 tests including the new accessible-parking flow.
- [x] Browser smoke fetched the app shell and `/data/accessible-public-parking-facilities/records.json` successfully; the standard `npm run test:e2e` port 5173 check remains unavailable because an unrelated WSL relay owns that strict port.

- [x] Added 385 green-space adoption records from `臺北市行道樹公園綠地廣場認養人資料.csv`.
- [x] Added Big5/CP950 raw-data copy, conversion, summary generation, combined facility merge, PWA cache entries, README workflow notes, feature ledger state, and focused tests for the green-space adoption layer.
- [x] Kept green-space adoption records address-only because the source has no official coordinates; no automatic geocoding or fake exact markers were added.
- [x] Added management-unit, district-code, target-attribute, target-category, adopter-name, adopter-category, road-name, range/boundary, and intersection filters.
- [x] Added searchable directory cards/popups, district summary bubbles, notices, and no ownership, real-time maintenance, plant-health, safety, boundary, legal, ranking, or recommendation claims.
- [x] Added 617 commercial EV charging and battery-swap station records from three Big5/CP950 commercial EV source files.
- [x] Added service-type classification, operator/city/city-code/address/district filters, address-based Google Maps links, district summary bubbles, notices, legend entry, PWA cache entries, README notes, and tests for the commercial EV layer.
- [x] Kept commercial EV records address-only because the source files do not include coordinates; no automatic geocoding or fake markers were added.
- [x] Added 75 gas/LPG station records from the UTF-8-SIG `臺北市加油站及加氣站分布圖.csv` source.
- [x] Converted TWD97 coordinates to WGS84 at build time and rendered exact gas/LPG markers with supplier/service/hour/status filters and nearby lookup.
- [x] Kept gas/LPG business hours, service flags, and status as source-data fields only; no real-time opening, fuel availability, price, or recommendation claims were added.
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
- [x] Improved combined-layer responsiveness with deferred map updates, cache-first static data, and a list-first marker policy: broad selections hide individual pins while nearby and small single-layer results keep exact markers.
- [x] Replaced the deployed OpenStreetMap tile endpoint with CARTO's no-key light basemap after the former rendered an empty gray map in production.
- [x] Added 202 designated smoking areas from the UTF-8-SIG `臺北市指定吸菸區.csv` source.
- [x] Added source WGS84 exact markers, type/opening-hour/photo/relative-location/management filters, nearby lookup, notices, PWA cache entries, README notes, and tests for the designated smoking area layer.
- [x] Added 3,786 announced no-smoking place records from three Taipei Department of Health CSV resources.
- [x] Added mixed UTF-8-SIG/CP950 conversion, district-code normalization, WGS84/TWD97 coordinate detection, announcement-date parsing, no-smoking record type/year/source/coordinate filters, marker/legend/list/popup details, notices, PWA cache entries, README notes, and tests for the announced no-smoking place layer.
- [x] Added 483 lactation rooms from two Big5/CP950 resources with deduplication and legal-list cross-reference.
- [x] Added lactation search, filters, directory details, district summary bubbles, address-based Google Maps links, notices, PWA cache entries, and optional verified-coordinate cache support.
- [x] Added 334 riverside toilets and 393 family-friendly toilets with exact markers, focused filters, nearby results, summaries, bilingual notices, and service-worker cache entries.
- [x] Preserved specialized toilet records and cross-referenced all current family-friendly records to the general public-toilet dataset.
- [x] Added 245 motorcycle inspection stations with UTF-8-SIG conversion, district summary bubbles, brand/postal/phone filters, address-based Google Maps links, notices, cache entries, and privacy-minimized default UI.
- [x] Added 3,874 protected tree records from the UTF-8-SIG `樹籍資料匯出-202603201657.csv` source with exact coordinates.
- [x] Added protected tree ID/species/scientific-name/English-name/location-type/management-unit/diameter/circumference/coordinate-quality filters, exact markers for narrowed views, list/popup fields, bilingual notices, cache entries, README notes, and tests.
- [x] Added 227 pay.taipei cardless parking lot records from the UTF-8-SIG `pay.taipei支援無卡進出停車場清單_20260211 (1).csv` source.
- [x] Added support-status, operator, operator ID, postal code, postal-code type, road, phone/note, stopped-service hint, basement, operator/platform address, location-precision, and geocoding-status filters.
- [x] Kept pay.taipei parking records address-only because the source has no official coordinates; the app uses district summary bubbles and address-based Google Maps lookup links.

### What's In Progress

- [x] No active feature work remains for feat-029.

### What's Next

1. Refresh source CSVs before publishing when newer snapshots are available.

## Blockers / Risks

- [ ] The pedestrian-bin CSV is absent at `/Users/Leo/Downloads/●行人專用清潔箱總表.csv`; converter fallback uses `public/data/bins.json`.
- [ ] The dog-waste bag box CSV is absent at `/Users/Leo/Downloads/狗便袋箱位置總表 .csv`; converter fallback uses `public/data/dog-waste-bag-boxes.json`.
- [ ] Public drinking fountain data is a fetched API snapshot, not live runtime data.
- [ ] Timed collection capabilities are conservatively inferred from notes; unknown values are intentionally not treated as false.
- [ ] Direct drinking station status and sampling dates are listed-data snapshots, not real-time guarantees.
- [ ] Used-clothing box coordinates include 29 outliers; they remain listed and are excluded from map rendering.
- [ ] Used-clothing box availability and accepted-item rules are not real-time.
- [ ] Lactation-room sources contain no coordinates; exact nearby sorting remains unavailable until coordinates are manually verified.
- [ ] Lactation-room opening hours, equipment, availability, and venue rules are not real-time.
- [ ] Toilet cleanliness, maintenance, opening status, equipment counts, and award fields are snapshot data rather than real-time guarantees.
- [ ] Motorcycle inspection station business hours, service status, and inspection rules are snapshot/public-data references, not real-time guarantees.
- [ ] Electric motorcycle charging station availability, business hours, charger specifications, pricing, and on-site rules are snapshot/public-data references, not real-time guarantees.
- [ ] Commercial EV charging and battery-swap station availability, fees, payment methods, membership rules, equipment specs, and battery inventory are snapshot/public-data references, not real-time guarantees.
- [ ] Gas/LPG station business hours, fuel/LPG supply, pricing, self-service availability, and operating status are snapshot/public-data references, not real-time guarantees.
- [ ] Designated smoking area opening hours, on-site usability, legal applicability, health interpretation, and complete legal boundaries are snapshot/public-data references, not real-time guarantees or advice.
- [ ] Announced no-smoking place points are source-location references, not complete legal boundaries, real-time enforcement status, legal advice, health advice, smoking advice, or on-site signage guarantees.
- [ ] Protected tree records are source-data lookup points, not real-time tree health, collapse-risk, pruning/transplant permit, land-ownership, cadastral-boundary, maintenance-progress, legal-advice, or tourism-ranking data.
- [ ] pay.taipei cardless parking records have no official coordinates and do not represent real-time parking availability, real-time operating status, parking fees, payment success, cardless entry or exit success, exact entrance location, navigation advice, legal parking determination, consumer advice, or official endorsement.
- [ ] Green-space adoption records have no official coordinates and do not represent land or facility ownership, complete maintenance responsibility, real-time maintenance status, plant health, public safety judgment, facility boundaries, legal advice, official ranking, or official recommendation.
- [ ] `npm audit --audit-level=moderate` previously reported the known Vite/esbuild dev-server advisory with a breaking Vite upgrade path.

## Decisions Made

- **Keep one `Facility` model**: Pedestrian bins, dog-waste bag boxes, public toilets, and public drinking fountains remain distinct without duplicating the UI.
- **Keep API access out of the frontend**: The app loads static JSON only; Taipei Open Data access is handled by `scripts/fetchDrinkingFountains.ts`.
- **Keep drinking fountains scoped to public-place equipment**: Labels avoid implying complete coverage of every outdoor direct-drinking station in Taipei.
- **Do not add dashboard charts**: The app has no existing dashboard surface.
- **Do not geocode lactation rooms automatically**: Address-only records use district summaries and address-based Google Maps links until verified coordinates are added.
- **Keep specialized toilet layers separate**: Cross-reference matches aid traceability but do not merge away source-specific fields.
- **Hide responsible person by default**: `responsiblePersonName` remains in JSON but is not shown in normal cards/popups.
- **Skip optional nearby shortcut buttons**: The existing nearby button already respects selected facility layers.
- **Use a strict E2E dev server**: Playwright always starts this app on port 5173 and fails fast if the port is occupied, preventing accidental tests against another local Vite app.
- **Do not geocode electric motorcycle charging stations automatically**: Address-only records use district summaries and address-based Google Maps links until verified coordinates are added.
- **Do not geocode commercial EV charging/swap stations automatically**: Address-only records use district summaries and address-based Google Maps links until verified coordinates are added.
- **Convert gas/LPG station coordinates offline**: Source TWD97 coordinates are converted during data conversion; frontend stays on static WGS84 JSON.
- **Keep broad map views list-first**: Rendering hundreds of individual Leaflet markers blocks mobile interaction. Broad selections hide exact pins; nearby results and small single-type selections render them.
- **Use CARTO for base tiles**: The previous OpenStreetMap tile endpoint failed to render in the deployed app; CARTO preserves a no-key static Leaflet map.
- **Keep designated smoking areas as lookup data**: The layer shows source fields and nearby distance only; UI copy avoids smoking recommendations, health advice, legal interpretation, and current-availability claims.
- **Keep announced no-smoking places as lookup data**: The layer complements designated smoking areas but does not claim complete no-smoking boundaries, enforcement status, legal interpretation, health advice, or smoking advice.
- **Keep protected trees in the shared facility surface**: The app has no standalone dashboard module, so protected trees use the existing map/list/filter/popup workflow.
- **Keep pay.taipei parking address-only**: The source has addresses but no official coordinates, so no automatic geocoding or exact parking markers were added.
- **Keep green-space adoption records address-only**: The source has location descriptions but no official longitude/latitude, so the UI uses district summaries, directory search, and address-based Google Maps lookup links.

## Files Modified This Session

- `scripts/fetchGreenSpaceAdoptionRecords.ts` - Added local CSV copy and metadata script for the Taipei green-space adoption dataset.
- `scripts/convertGreenSpaceAdoptionRecords.ts` - Added Big5/CP950 conversion, category classification, parsed-road/range/intersection flags, and address-only facility mapping.
- `scripts/buildGreenSpaceAdoptionSummary.ts` - Added summary generation for districts, management units, target categories, adopter categories, and road names.
- `scripts/convertBins.ts` - Merged green-space adoption records into combined static facility output and public amenity totals.
- `src/types.ts`, `src/utils/facilityUtils.ts`, `src/components/*`, `src/i18n.ts`, `src/App.tsx` - Added the shared facility type, focused filters, labels, district summaries, popup/list fields, and interpretation notices.
- `public/data/green-space-adoption-records/records.json`, `public/data/green-space-adoption-records/summary.json`, `public/data/facilities.json`, `public/data/conversion-report.json`, `public/data/public-amenities-summary.json` - Regenerated static data with the new layer.
- `public/service-worker.js`, `README.md`, `package.json`, `tests/e2e/bin-map.spec.js`, `scripts/newFacilityConverters.test.ts`, `src/utils/facilityUtils.test.ts`, `feature_list.json`, `progress.md` - Updated cache, docs, scripts, regression coverage, and harness state.
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
- `src/components/FacilityMap.tsx`, `index.html` - Switched the Leaflet base tiles and preconnects from OpenStreetMap to CARTO.
- `tests/e2e/bin-map.spec.js` - Added a regression assertion for the deployed tile host.
- `scripts/fetchDesignatedSmokingAreas.ts` - Added local CSV copy and metadata script for the Taipei designated smoking area dataset.
- `scripts/convertDesignatedSmokingAreas.ts` - Added UTF-8-SIG/CP950 fallback parsing, WGS84 coordinate validation, type/opening-hour/manager classification, and summary generation.
- `scripts/convertBins.ts` - Merged designated smoking areas into combined static facility output.
- `src/types.ts`, `src/utils/facilityUtils.ts`, `src/components/*`, `src/i18n.ts`, `src/App.tsx` - Added the shared facility type, filters, labels, marker, popup/list fields, and notices.
- `public/data/designated-smoking-areas.json`, `public/data/designated-smoking-area-summary.json`, `public/data/facilities.json`, `public/data/conversion-report.json` - Regenerated static data with the new layer.
- `public/service-worker.js`, `README.md`, `package.json`, `tests/e2e/bin-map.spec.js`, `scripts/newFacilityConverters.test.ts`, `src/utils/facilityUtils.test.ts` - Updated cache, docs, scripts, and regression coverage.
- `scripts/fetchAnnouncedNoSmokingPlaces.ts`, `scripts/convertAnnouncedNoSmokingPlaces.ts` - Added local CSV copy and mixed-encoding conversion for announced no-smoking places and smoke-free parks/green spaces.
- `scripts/convertBins.ts` - Merged announced no-smoking places into combined static facility output.
- `src/types.ts`, `src/utils/facilityUtils.ts`, `src/components/*`, `src/i18n.ts`, `src/App.tsx` - Added the shared facility type, focused filters, labels, marker, popup/list fields, and no legal-boundary/enforcement/advice notices.
- `public/data/announced-no-smoking-places.json`, `public/data/announced-no-smoking-place-summary.json`, `public/data/facilities.json`, `public/data/conversion-report.json` - Regenerated static data with the new layer.
- `public/service-worker.js`, `README.md`, `package.json`, `tests/e2e/bin-map.spec.js`, `scripts/newFacilityConverters.test.ts`, `src/utils/facilityUtils.test.ts` - Updated cache, docs, scripts, and regression coverage for the no-smoking layer.

## Evidence of Completion

- [x] `npm run data:fetch:green-space-adoption` copied the Big5/CP950 source CSV into `data/raw/green-space-adoption-records/`.
- [x] `npm run convert:facilities` generated 16,843 facilities, including 385 green-space adoption records.
- [x] `npm test` passed 55 unit/converter tests.
- [x] `npm run build` passed after the green-space adoption layer.
- [x] `npm run test:e2e` passed 62 desktop/mobile Playwright tests after the green-space adoption E2E flow was added.
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
- [x] Repeat visits now read static facility JSON from the service-worker cache while deployments refresh it through the versioned cache.
- [x] `npm run convert:bins` generated 5,830 facilities, including 483 lactation rooms across all 12 Taipei districts.
- [x] Lactation conversion cross-referenced all current records with the legal-required list and parsed all provided certification dates.
- [x] `npm run convert:bins` generated 6,557 facilities, including 334 riverside toilets and 393 family-friendly toilets.
- [x] Both new toilet datasets decoded as CP950 and produced 727 valid WGS84 coordinates with no outliers.
- [x] `npm test` passed 33 unit/converter tests and `npm run test:e2e` passed 34 desktop/mobile tests.
- [x] `npm run convert:bins` generated 6,802 facilities, including 245 motorcycle inspection stations across 12 districts and 9 brands.
- [x] `npm test` passed 35 unit/converter tests.
- [x] `npm run build` passed.
- [x] `npm run test:e2e` passed 38 desktop/mobile Playwright tests.
- [x] `npm run data:fetch:electric-motorcycle-charging-stations` copied the UTF-8-SIG 398-row source CSV into `data/raw/electric-motorcycle-charging-stations/`.
- [x] `npm run convert:bins` generated 7,200 facilities, including 398 electric motorcycle charging stations across all 12 districts.
- [x] `npm test` passed 37 unit/converter tests.
- [x] `npm run build` passed.
- [x] `npm run test:e2e` and `./init.sh` passed 40 desktop/mobile Playwright tests.
- [x] `npm run data:fetch:commercial-ev` copied the three Big5/CP950 commercial EV charging/swap source CSVs into `data/raw/commercial-ev-charging-swap-stations/`.
- [x] `npm run data:convert:commercial-ev` generated 617 commercial EV charging/swap station records and summary JSON.
- [x] `npm run convert:bins` generated 7,817 facilities, including 240 commercial electric-car charging records, 12 commercial electric-motorcycle charging records, and 365 commercial electric-motorcycle battery-swap records.
- [x] Commercial EV records are all `address_only` and span all 12 Taipei districts; no fake coordinates were generated.
- [x] `npm test` passed 39 unit/converter tests.
- [x] `npm run build` passed.
- [x] `npm run test:e2e` and `./init.sh` passed 42 desktop/mobile Playwright tests.
- [x] `npm run data:fetch:gas-lpg-stations` copied the UTF-8-SIG gas/LPG source CSV into `data/raw/gas-lpg-stations/`.
- [x] `npm run convert:bins` generated 7,892 facilities, including 75 gas/LPG stations with 75 valid converted coordinates across all 12 districts.
- [x] `npm test` passed 41 unit/converter tests.
- [x] `npm run build` passed.
- [x] `npm run test:e2e` and `./init.sh` passed 44 desktop/mobile Playwright tests.
- [x] Added a list-first marker-rendering policy: broad selections mount no individual markers, while narrowed single-type/district views and nearby results retain exact markers.
- [x] `./init.sh` passed 41 unit/converter tests, production build, and 46 desktop/mobile Playwright tests after the marker policy update.
- [x] `./init.sh` passed 41 unit/converter tests, production build, and 48 desktop/mobile Playwright tests after the CARTO base-map fix.
- [x] `npm run data:fetch:designated-smoking-areas` copied the UTF-8-SIG 202-row source CSV into `data/raw/designated-smoking-areas/`.
- [x] `npm run convert:facilities` generated 8,094 facilities, including 202 designated smoking areas.
- [x] Targeted converter/filter tests passed with 43 tests before final full verification.
- [x] `./init.sh` passed 43 unit/converter tests, production build, and 50 desktop/mobile Playwright tests after the designated smoking area layer.
- [x] `npm run data:fetch:no-smoking` copied three announced no-smoking CSV resources into `data/raw/announced-no-smoking-places/`.
- [x] `npm run convert:facilities` generated 11,880 facilities, including 3,786 announced no-smoking place records.
- [x] Targeted converter/filter tests passed with 45 tests.
- [x] `npm run build` passed after the announced no-smoking layer.
- [x] `npm run test:e2e` passed 52 desktop/mobile Playwright tests, including the announced no-smoking flow.
- [x] `./init.sh` passed 45 unit/converter tests, production build, and 52 desktop/mobile Playwright tests after the announced no-smoking layer.
- [x] `npm run data:fetch:clean-needle` copied the CP950 clean needle source CSV into `data/raw/clean-needle-exchange-service-points/`.
- [x] `npm run convert:facilities` generated 12,357 facilities, including 88 clean needle service point records across all 12 districts.
- [x] Targeted converter/filter tests passed with 49 tests.
- [x] `npm run build` passed after the clean needle layer.
- [x] `npm run test:e2e -- --grep "clean needle"` passed desktop/mobile Playwright coverage for the clean needle flow.
- [x] `npm run test:e2e` passed 56 desktop/mobile Playwright tests after the clean needle layer.
- [x] `./init.sh` passed 49 unit/converter tests, production build, and 56 desktop/mobile Playwright tests after the clean needle layer.
- [x] `npm run data:fetch:protected-trees` copied the UTF-8-SIG protected tree source CSV into `data/raw/protected-trees/`.
- [x] `npm run convert:facilities` generated 16,231 facilities, including 3,874 protected tree records.
- [x] `npm test` passed 51 unit/converter tests.
- [x] `npm run build` passed after the protected tree layer.
- [x] `npm run test:e2e -- --grep "protected trees"` passed desktop/mobile Playwright coverage for the protected tree flow.
- [x] `npm run test:e2e` passed 58 desktop/mobile Playwright tests after the protected tree layer.
- [x] `./init.sh` passed 51 unit/converter tests, production build, and 58 desktop/mobile Playwright tests after the protected tree layer.
- [x] `npm run data:fetch:pay-taipei-parking` copied the UTF-8-SIG pay.taipei cardless parking source CSV into `data/raw/pay-taipei-cardless-parking-lots/`.
- [x] `npm run convert:facilities` generated 16,458 facilities, including 227 pay.taipei cardless parking lot records.
- [x] `npm test` passed 53 unit/converter tests.
- [x] `npm run build` passed after the pay.taipei parking layer.
- [x] `npm run test:e2e -- --grep "pay.taipei"` passed desktop/mobile Playwright coverage for the pay.taipei parking flow.
- [x] `npm run test:e2e` passed 60 desktop/mobile Playwright tests after the pay.taipei parking layer.
- [x] `./init.sh` passed 53 unit/converter tests, production build, and 60 desktop/mobile Playwright tests after the pay.taipei parking layer.

## Notes for Next Session

Start with `AGENTS.md`, then inspect `feature_list.json` and `progress.md`. The bulky-waste module is a dedicated directory route (`#/bulky-waste-collection-booking`), deliberately separate from map facilities because the source has no coordinates or full service-location addresses.

## Bulky Waste Collection Booking — 2026-07-16

- Added `scripts/convertBulkyWasteCollectionBookings.ts`, using actual CP950/Big5 headers with tolerant header matching, source-field preservation, clear-delimiter village splitting, deduplication, and data-quality reporting for duplicate rows, missing districts, malformed phone values, and empty service areas.
- Generated `public/data/bulky-waste-collection-booking/records.json` and `summary.json` from the official Taipei Open Data CSV; the current source produced 65 records.
- Added a bilingual, directory-only module with overview, district, team, village, directory, and notes views; filters update metrics and rows, and the directory supports sorting, pagination, clickable phone links, copying, and filtered CSV download.
- Added the hash route, navigation entry, PWA cache entries, README documentation, converter tests, and conversion-report quality source.
- Verification: `npm.cmd run data:convert:bulky-waste-collection-booking`, `npm.cmd run convert:facilities`, `npm.cmd test` (57 tests), and `npm.cmd run build` passed. Full Playwright regression was blocked because port 5173 was already in use by an existing local server.
