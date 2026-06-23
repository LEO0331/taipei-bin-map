# Session Handoff

## Current Objective

- Goal: Maintain the ten-layer `台北市公共便利設施地圖` / `Taipei Public Amenities Map`.
- Current status: feat-018 is implemented and verified.
- Branch / commit: Working tree has uncommitted app, data, docs, and test changes.

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
- Combined-layer map updates are deferred and capped at 700 markers; all-layer previews use 500 markers. Single-layer limits remain unchanged.
- Static data is cache-first through the versioned service worker for faster repeat visits.
- Added 483 lactation rooms from two Big5/CP950 resources, with normalized deduplication and legal-required-list cross-reference.
- Added lactation directory filters, district summary bubbles, address-based Google Maps links, bilingual notices, summary JSON, and an optional verified-coordinate cache.
- Added 334 riverside toilets and 393 family-friendly toilets with valid coordinates, filters, nearby lookup, map/list/popup details, summary JSON, and PWA caching.
- Soft-matched all current family-friendly toilet records to general public-toilet records without merging the specialized layer.

## Verification

| Check | Result |
|---|---|
| `npm run convert:bins` | 6,557 total facilities |
| `npm test` | 33 tests passed |
| `npm run build` | Passed |
| `npm run test:e2e` | 34 desktop/mobile tests passed |
| `./init.sh` | Passed |
| Responsive smoke | No horizontal overflow at 390px or 1440px |

## Deliberate Omissions

- No dashboard charts: the app has no chart dashboard surface.
- No extra nearby shortcut buttons: the existing nearby action already respects selected layers.
- No frontend Taipei Open Data calls: all runtime data remains static local JSON.
- No automatic geocoding: lactation rooms remain address-only unless manually verified coordinates are supplied.

## Risks

- Source datasets are snapshots, not real-time availability or water-quality guarantees.
- Used-clothing data has 29 coordinate outliers; the app lists them but does not render their markers.
- Timed collection accepted-item flags are based only on explicit note text.
- Existing Vite/esbuild moderate development-server advisory remains pending a breaking toolchain upgrade.
- Lactation-room source files have no coordinates, so exact nearby sorting is intentionally unavailable for those records.
- New toilet datasets are snapshots and do not guarantee cleanliness, maintenance, opening status, or equipment availability.
