# Session Handoff

## Current Objective

- Goal: Maintain the fourteen-layer `台北市公共便利設施地圖` / `Taipei Public Amenities Map`.
- Current status: feat-023 is implemented and verified.
- Branch / commit: Working tree has uncommitted app, docs, and test changes.

## Completed

- Added `timed_collection_point` and `direct_drinking_station` facility types.
- Added Big5/CP950 local fetch/copy scripts and converters with raw metadata.
- Generated 30 timed collection points and 733 direct drinking stations.
- Preserved 38 outside-Taipei direct station records and marked Taipei membership.
- Added search, focused filters, nearby support, map markers, legend, lists, popups, notices, service-worker cache, and README documentation.
- Kept conservative note parsing: unknown accepted items remain `unknown`.
- Kept the existing static JSON, Vite, React, Leaflet, and PWA architecture.
- Added 1,184 approved used-clothing recycling boxes from 48 organizations and 367 villages.
- Added village, organization, and phone filters plus search, nearby, marker, legend, list, popup, notice, cache, README, and local CSV scripts.
- Broad map views are list-first: they do not mount individual facility markers. Nearby results and narrowed single-facility views with at most 500 valid coordinates retain exact markers.
- Static data is cache-first through the versioned service worker for faster repeat visits.
- Added 483 lactation rooms from two Big5/CP950 resources, with normalized deduplication and legal-required-list cross-reference.
- Added lactation directory filters, district summary bubbles, address-based Google Maps links, bilingual notices, summary JSON, and an optional verified-coordinate cache.
- Added 334 riverside toilets and 393 family-friendly toilets with valid coordinates, filters, nearby lookup, map/list/popup details, summary JSON, and PWA caching.
- Soft-matched all current family-friendly toilet records to general public-toilet records without merging the specialized layer.
- Added 245 motorcycle inspection stations with district summaries, brand/postal/phone filters, address-based map links, summary JSON, and PWA caching.
- Preserved `responsiblePersonName` in JSON while keeping it out of default cards/popups.
- Added 398 electric motorcycle charging stations with district summaries, category/city/district-code/address filters, address-based map links, summary JSON, and PWA caching.
- Added 617 commercial EV charging and battery-swap stations with service/operator/city/city-code/address/district filters, district summaries, address-based map links, summary JSON, and PWA caching.
- Kept commercial EV stations as address-only records because the source files do not provide coordinates.
- Added 75 gas/LPG stations with UTF-8-SIG conversion, TWD97-to-WGS84 conversion, exact markers, supplier/service/hour/status filters, nearby lookup, summary JSON, and PWA caching.
- Tightened the Playwright web server so E2E tests cannot silently reuse an unrelated local app on port 5173.

## Verification

| Check | Result |
|---|---|
| `npm run convert:bins` | 7,892 total facilities |
| `npm test` | 41 tests passed |
| `npm run build` | Passed |
| `./init.sh` | 41 unit/converter tests, production build, and 46 desktop/mobile tests passed |
| Responsive smoke | No horizontal overflow at 390px or 1440px |

## Deliberate Omissions

- No dashboard charts: the app has no chart dashboard surface.
- No extra nearby shortcut buttons: the existing nearby action already respects selected layers.
- No frontend Taipei Open Data calls: all runtime data remains static local JSON.
- No automatic geocoding: coordinate-free layers remain address-only unless manually verified coordinates are supplied.
- No separate map per facility category: one shared map keeps search, filtering, nearby lookup, and links consistent.

## Risks

- Source datasets are snapshots, not real-time availability or water-quality guarantees.
- Used-clothing data has 29 coordinate outliers; the app lists them but does not render their markers.
- Timed collection accepted-item flags are based only on explicit note text.
- Existing Vite/esbuild moderate development-server advisory remains pending a breaking toolchain upgrade.
- Lactation-room source files have no coordinates, so exact nearby sorting is intentionally unavailable for those records.
- New toilet datasets are snapshots and do not guarantee cleanliness, maintenance, opening status, or equipment availability.
- Motorcycle inspection station records have no coordinates, so exact nearby sorting is intentionally unavailable until verified coordinates are added.
- Electric motorcycle charging station records have no coordinates, so exact nearby sorting is intentionally unavailable until verified coordinates are added.
- Commercial EV charging and battery-swap station records have no coordinates, so exact nearby sorting is intentionally unavailable until verified coordinates are added.
- Commercial EV availability, fees, payment methods, membership rules, equipment specs, and battery inventory are not real-time guarantees.
- Gas/LPG station business hours, fuel/LPG supply, pricing, self-service availability, and operating status are not real-time guarantees.
