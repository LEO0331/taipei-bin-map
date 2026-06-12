# Session Handoff

## Current Objective

- Goal: Add Taipei public toilets and reposition the app as `台北市公共便利設施地圖` / `Taipei Public Amenities Map`.
- Current status: Implementation, conversion, docs, unit tests, build, e2e, and final `./init.sh` baseline are complete.
- Branch / commit: Working tree has uncommitted app, data, docs, and test changes.

## Completed This Session

- [x] Added `public_toilet` facility type and toilet-specific fields.
- [x] Added UTF-8-SIG public toilet CSV conversion with trimmed headers.
- [x] Generated `public/data/public-toilets.json`.
- [x] Regenerated `public/data/facilities.json` with 3,256 combined records.
- [x] Added public toilet category, accessible-toilet, and parent-child-toilet filters.
- [x] Updated search, list cards, popups, map legend, warning notice, PWA metadata, and service worker cache.
- [x] Added emoji markers and marker-cap behavior for large unfiltered result sets.
- [x] Updated README and bilingual docs for the public amenities product.
- [x] Updated e2e tests for all three facility types and public toilet flows.
- [x] Fixed review finding: active toilet-specific filters now narrow mixed/all selections to public toilets and are ignored for non-toilet-only selections.
- [x] Cleanup pass removed unused singular translation keys and tightened filter predicate naming.

## Verification Evidence

| Check | Command | Result | Notes |
|---|---|---|---|
| Data conversion | `npm run convert:bins` | Passed | Generated 3,256 facilities: 1,197 bins, 510 dog boxes, 1,549 public toilets. |
| Unit tests | `npm test` | Passed | 12 facility utility tests passed. |
| Production build | `npm run build` | Passed | Vite production build completed. |
| E2E | `npm run test:e2e` | Passed | 16 desktop/mobile Playwright tests passed. |
| Full baseline | `./init.sh` | Passed | Ran `npm test`, `npm run build`, and 16 desktop/mobile Playwright tests after the cleanup pass. |

## Decisions Made

- Keep source category values in Chinese and translate labels only in UI.
- Use marker-cap behavior instead of adding a clustering dependency.
- Keep conversion fallback behavior for missing CSVs.
- Preserve static deployment: no backend, accounts, admin page, database, or paid map API.

## Blockers / Risks

- The pedestrian-bin CSV is absent at `/Users/Leo/Downloads/●行人專用清潔箱總表.csv`; converter fallback uses `public/data/bins.json`.
- The dog-waste bag box CSV is absent at `/Users/Leo/Downloads/狗便袋箱位置總表 .csv`; converter fallback uses `public/data/dog-waste-bag-boxes.json`.
- Known Vite/esbuild dev-server audit advisory remains unless taking a breaking Vite upgrade.

## Next Session Startup

1. Read `AGENTS.md`.
2. Read `feature_list.json`, `progress.md`, and this handoff.
3. Review the uncommitted public amenities expansion before committing or deploying.
