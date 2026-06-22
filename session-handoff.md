# Session Handoff

## Current Objective

- Goal: Maintain the seven-layer `台北市公共便利設施地圖` / `Taipei Public Amenities Map`.
- Current status: feat-016 is implemented and verified.
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

## Verification

| Check | Result |
|---|---|
| `npm run convert:bins` | 5,347 total facilities |
| `npm test` | 24 tests passed |
| `npm run build` | Passed |
| `npm run test:e2e` | 26 desktop/mobile tests passed |
| `./init.sh` | Passed |
| Responsive smoke | No horizontal overflow at 390px or 1440px |

## Deliberate Omissions

- No dashboard charts: the app has no chart dashboard surface.
- No extra nearby shortcut buttons: the existing nearby action already respects selected layers.
- No frontend Taipei Open Data calls: all runtime data remains static local JSON.

## Risks

- Source datasets are snapshots, not real-time availability or water-quality guarantees.
- Used-clothing data has 29 coordinate outliers; the app lists them but does not render their markers.
- Timed collection accepted-item flags are based only on explicit note text.
- Existing Vite/esbuild moderate development-server advisory remains pending a breaking toolchain upgrade.
