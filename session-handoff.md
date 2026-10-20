# Session Handoff

Last reviewed: **2026-10-20 Asia/Taipei**. Historical milestones remain in [progress.md](progress.md).

## Current scope and branch

- New bounded feature: `feat-045`, independent `#/shade-equity` evidence-readiness/inventory module.
- Branch: `codex/shade-equity-v1`, based on preserved `490f649`. Refreshed `origin/main` includes that baseline through merged PR #16 (`af8e29e`).
- Public Bin Policy Mode A/B methods, approved inputs, research snapshots and review workflows are unchanged. No Portfolio repository, backend, account system, paid API or dependency was added.
- User requested commit/push and one reviewable PR; no automatic merge or operational source approval. Final delivery/PR status is recorded in [the delivery document](docs/shade-equity-delivery.md).

## Actual supported analysis

Roadside-tree observations, official sidewalk geometry, explicit tree pits, park context, historical greening, measured canopy/heat and physical feasibility remain separate.

| Population | Raw | GIS admitted |
| --- | ---: | ---: |
| Roadside trees | 90,358 | 89,860 |
| Sidewalk polygons | 15,053 | 14,896 |
| Pit/planter polygons | 56,720 | 50,730 tree pits; 5,816 flowerbeds not admitted as pits |

At 2 m: trees 45,559 matched / 44,274 unmatched / 27 ambiguous; pits 46,109 / 480 / 4,141. These are possible spatial associations, never canopy/shade or occupancy/vacancy.

**Actual ranked eligibility is zero.** Official sidewalk length semantics/units and cross-source comparability remain unverified; capacity 5/10 and district balancing do not produce a fabricated shortlist. Non-empty tiers/scenarios are explicitly synthetic tests only. To reopen selection, obtain authoritative export-specific measurement/coverage evidence, validate and review a new snapshot. Do not infer lengths from polygon perimeter or divide a partial population by a complete-city denominator.

## Versions and architecture

- Sources: `shade-source-v1-078b91443dc33e45`.
- Derived snapshot: `shade-equity-v1-8e4cfb4029d0831d`.
- Method: `shade-equity-evidence-review-v1`; configuration `1.0.0`.
- Generation event: `2026-10-20T00:41:41.554Z`, not current-browser-time ranking.
- The actual district archive is EPSG:3826 projected metres; its `.prj` is asserted and inverse TM normalization precedes geographic district containment.
- Browser metadata is 13,723 bytes. Twelve district chunks contain the full admitted inventory and load only on selection. Chunk identities, source roles and unavailable states are validated.
- Source-bound 0/2/5 m offline comparisons are different evidence scopes, not environmental improvements. JSON/CSV preserve inventory separately from selected-subset counts and resist spreadsheet formula injection.
- New JSON uses network-first, cached after use (service-worker v38); no raw tree/geometry downloads or third-party source APIs in browser scenarios.

## Reproduction and verification

Restore exact originals with `npm run data:fetch:shade-equity -- --restore-frozen`, then `npm run data:audit:shade-equity` and `npm run data:convert:shade-equity`. Use `npm run data:analyze:shade-equity` for actual examples/sensitivity. Five gzip originals preserve 69,874,202 expanded bytes; original hashes/sizes are checked before restoration. Scoped Git attributes prevent newline changes from breaking exact-byte replay.

Two independent full-source builds match SHA256 `6683224b154200e9f321742c8f4c69d72cb0dabd4c805e3e6a8f9c21c097c3c6`. Actual offline conversion is about 15.5–16.1 s on this machine; validated-input alternative joins about 2 s, not physical-phone latency.

Latest checks passed: **471 tests / 31 files**, TypeScript/production build, **160 full desktop/mobile E2E cases with one worker**, **2 Shade offline**, **4 unchanged Bin Policy offline** and **2 Shade project-base cases**. A prior two-worker run hit Chromium `ERR_NO_BUFFER_SPACE` while loading an unchanged app module (159 passed); the final single-worker rerun passed. The offline test observes actual activation navigation, not merely the pre-navigation session marker. No new retries, sleeps or relaxed app assertions were added; concurrent-host exhaustion is not claimed permanently eliminated.

The bounded independent review's hole-enclosure containment finding was fixed with RED/GREEN regression. All twelve district chunks and count partitions validate. Metadata CRS was separately corrected from the actual projection file. Actual-snapshot screenshots are linked in the delivery document.

## Remaining boundaries

No measured shade percentage, street-level thermal exposure, cooling benefit, vacant-pit inventory, approved planting site, removal history reconstruction or physical tree survival claim is supported. Source monitoring/adoption, hosted Actions permissions, real hosting deployment and physical-phone testing were not exercised by this implementation. The new module's project-base loader is tested; whole-app GitHub Pages path migration is not claimed.

Read [source audit](docs/shade-equity-source-audit.md), [methodology](docs/shade-equity-methodology.md), [Chinese decision guide](docs/shade-equity-decision-mvp.zh-Hant.md) and [delivery evidence](docs/shade-equity-delivery.md) before extending. Run npm tests/build/E2E (or Bash `init.sh` equivalent), then production preview checks. Do not run unrelated facility refresh or Bin Policy publication as a side effect.
