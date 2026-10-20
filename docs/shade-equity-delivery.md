# Shade Equity v1.0 — delivery and verification record

Record date: 2026-10-20 (Asia/Taipei). This document distinguishes implemented capabilities, real-source findings and execution evidence. It is not municipal analytical approval.

## Baseline and protected scope

Pre-change baseline: **308 unit/component/GIS/governance tests**, **142 E2E tests**, production build passing. These are historical baseline results, not the new final suite count.

The new hash route is `#/shade-equity`; method `shade-equity-evidence-review-v1`, configuration `1.0.0`. The static bilingual module adds source/quality inspection, inventory and association review, deterministic evidence tiers, conditional distribution review, capacity/scenario comparison and JSON/CSV field-review briefings. Existing public amenities, Protected Trees, Cooling & Comfort Spots and Public Bin Policy Mode A/B retain their separate populations and meanings. No Portfolio repository, backend, account system, paid map API or new UI framework is introduced.

## Official resources actually admitted

See [the full source audit](shade-equity-source-audit.md) for original-byte hashes, exact source schema and dates; [the methodology](shade-equity-methodology.md) defines analytical gates.

| Resource | Raw population | GIS-admitted population | Status |
| --- | ---: | ---: | --- |
| Roadside-tree resource `0e96f4b5-8f8c-4935-ae0b-b97b3d031c94` | 90,358 observations | 89,860 | Limited inventory, not canopy |
| Sidewalk resource `b11d6142-1d71-41d5-a843-7b7cfcea61ef` | 15,053 MultiPolygons | 14,896 | Limited geometry; measurement-definition gate closed |
| Pit/planter resource `3e2b359b-8dae-46e4-a747-5912d8743d0e` | 56,720 MultiPolygons | 50,730 tree pits | 5,816 flowerbeds excluded by population; 174 tree pits excluded by district validation |
| Park resource `302a04cd-8dd7-4052-a014-9a7ee8ec8e58` | 813 records | Not admitted spatially | Context only |
| Historical greening resource `a8405bba-f5c9-49d0-bd4d-9e428d3085eb` | 45 annual rows, 1981–2025 | Not admitted spatially | Context only, not removal history |

The three core sources declare/use TWD97 EPSG:3826; exact relationships are processed in projected metres. Display uses WGS84. Shared retained official administrative boundaries are provenance-checked, without importing Bin Policy observations or changing its approved snapshots.

Tree survey dates and source update dates differ. Uniform tree export update `2026-10-19` is not every tree's inspection date. Infrastructure resource updates are `2026-01-14`; per-feature survey dates are absent. No segment-scale measured canopy or scientifically defensible pedestrian thermal-exposure source was adopted. The Protected Trees legal subset and park trees are not citywide roadside stock.

## Geometry and actual findings

The offline converter uses validated closed polygons/holes, stable geometry-specific sidewalk IDs, a 100 m bounding-box grid, unique containment and a frozen 2 m fallback proximity tolerance. Boundary/multiple-side cases remain unresolved. Tree-pit shape containment is checked in addition to its representative point. No simplification, guessed pedestrian network or manufactured route is used.

- Trees: 45,559 uniquely assigned; 44,274 unmatched; 27 ambiguous. Of unique assignments, 3,729 use bounded proximity.
- Pits: 46,109 uniquely assigned; 480 unmatched; 4,141 ambiguous. No unmatched pit is labelled vacant.
- Conservative overlap audit: 5,358 polygon-pair relationships involving 7,989 sidewalk units. This includes conservative boundary interactions, not measured overlap area.
- Accepted sidewalks are inventory units, **not necessarily eligible ranking candidates**. All length denominators remain unavailable.

These counts are from the committed [conversion report](../public/data/shade-equity/conversion-report.json) and [spatial quality report](../public/data/shade-equity/spatial-quality.json). Stage-specific duplicate/quality counts are not interchangeable; full excluded IDs and unresolved associations are in the detailed offline report.

## Real decision example and interpretation

Source snapshot: `shade-source-v1-078b91443dc33e45`.
Derived snapshot: `shade-equity-v1-8e4cfb4029d0831d`.
Frozen generation event: `2026-10-20T00:41:41.554Z`.

The real scope is the source-published, admitted inventory, not guaranteed complete-city coverage. The official length field lacks an adequately verified unit/measurement definition; a general width-in-metres survey specification does not resolve that gap. `lengthM`/`widthM` remain null, and `measurementVerified` remains false.

| Real scenario | Eligible | Selected | Comparison |
| --- | ---: | ---: | --- |
| All represented districts, evidence-first, capacity 5, 2 m frozen tolerance | 0 | 0 | No defensible shortlist |
| Same source/scope, evidence-first, capacity 10 | 0 | 0 | Same empty selection |
| Same source/scope, district-balanced, capacity 5 | 0 | 0 | Same empty selection; no demonstrated shade equity |
| Low-recorded-tree representation | Unavailable | Unavailable | Length and comparability gates fail |

Capacity growth does not repair missing measurement evidence. Strict/permissive matching and minimum-length comparisons cannot reopen that gate; tolerance changes need separately reviewed offline snapshots. Synthetic fixtures demonstrate A/B/C, non-empty capacity allocation and sorting only in tests, never as real Taipei outputs.

## Reproduction and publication controls

```powershell
npx tsx scripts/fetchShadeEquitySources.ts --restore-frozen
npx tsx scripts/auditShadeEquitySources.ts
npx tsx scripts/buildShadeEquitySnapshot.ts
npm test
npm run build
npm run test:e2e
git diff --check
```

Frozen originals are losslessly compressed and restored only after checking expanded original-byte SHA256/length. A changed live endpoint must not silently replace evidence; preserve known-good files and create a new reviewed version. The converter refuses a different snapshot identity in an existing publication directory. Schema/hash/resource mismatches fail rather than create apparent zero observations. No unrelated facility refresh or Bin Policy source-publication command is needed.

## Verification evidence and browser checks

Final source and implementation checks are recorded separately from the baseline:

- `npm ci`: completed, zero reported vulnerabilities, no new dependencies.
- `npm test`: **471 tests / 31 files passed**, covering source contracts, GIS, interpretation, scenarios, exports, runtime loading and components.
- `npm run build`: TypeScript (application and Node scripts) and Vite production build passed. No standalone lint script is configured; no lint success is claimed. JavaScript syntax checks passed for 14 browser-test/config files; `git diff --check` passed.
- Final full desktop/mobile E2E: **160 passed** with one worker. Production checks: **2 Shade offline**, **4 unchanged Bin Policy Mode A/B offline**, and **2 Shade project-base cases passed**. A prior two-worker run hit Chromium `ERR_NO_BUFFER_SPACE` while loading the unchanged app error-boundary module (159 passed); the single-worker run reduces host resource contention, without modifying application behavior or claiming permanent elimination of environmental flakiness.
- Source fetch/audit/conversion scripts executed against actual official bytes. Five gzip originals restore 69,874,202 bytes with all original SHA256/lengths checked; same-version publication replay verifies every existing output before rewriting.
- Two independent full-source builds produced identical full normalized snapshot SHA256 `6683224b154200e9f321742c8f4c69d72cb0dabd4c805e3e6a8f9c21c097c3c6`.
- Actual offline timing on Windows / Node 24 / i5-13500: about **15.5–16.1 s** for full validation/conversion; **2.0–2.1 s** for 0/5 m joins reusing validated inputs. These are not browser or physical-phone latency figures. See [performance evidence](../reports/shade-equity/performance.json).
- Metadata-first loading is **13,723 bytes** plus the selected district chunk, rather than the full raw dataset; twelve chunks retain every admitted unit. The new module's configured-base fetches are tested independently; whole-app GitHub Pages subpath migration is not claimed.
- Independent review found and fixed a pit polygon enclosing a sidewalk hole; RED/GREEN regression prevents vertex-only containment. A later actual `.prj` check corrected district CRS metadata, with a regression and synchronized content-bound snapshot IDs. These changes do not alter the final inventory totals. No outstanding high/medium finding was established in the bounded review.
- Final source-only hardening added a CSV/JSON format allowlist before filename construction, with RED/GREEN regression; unit/build verification reran afterward. It does not alter frozen sources, generated snapshots or browser behavior.
- The first new offline test encountered the existing service-worker activation reload; the session marker can appear before that navigation commits. It now observes the second actual frame navigation, then controller/cache readiness, not a sleep/retry. A browser option assertion checks the actual disabled HTML attribute; the engine independently rejects unavailable distribution modes. No test retries were added.

Screenshots show the real gated snapshot, not synthetic non-empty candidates: [desktop inventory](images/shade-equity-inventory-desktop.png) and [mobile English controls](images/shade-equity-controls-mobile.png). Visual-verdict review aligned native-looking controls with existing rounded/teal surfaces; desktop/mobile layout passed the internal visual gate. These captures are local browser evidence, not a public hosting deployment.

## Known limitations and release decision

### Changed-file responsibilities and simplifications

- `src/App.tsx`, `src/styles.css`, `public/service-worker.js`: additive route/navigation, scoped styling and post-visit research caching.
- `src/types/shadeEquity.ts`, `src/lib/shadeEquity*.ts`, `src/components/ShadeEquity*.tsx`: independent contracts, shared runtime validation, spatial/decision/scenario/export logic and bilingual presentation.
- `scripts/*ShadeEquity*.ts`, `scripts/shadeEquitySources.test.ts`: acquisition, frozen restoration, raw audit, conversion/publication replay, scenario evidence and source/GIS fixtures.
- `data/raw/shade-equity/`, `public/data/shade-equity/`, `reports/shade-equity/`: distinct original custody, compact browser data and detailed offline evidence.
- `tests/e2e/shade-equity.spec.js`, `tests/preview/shade*`, `tests/base/`: new-route, offline and project-base checks; existing application tests remain intact.
- README, architecture/deployment/decision documentation, `feature_list.json`, `progress.md`, `session-handoff.md`, scoped Git attributes and ignore rules: review and restart evidence.

The main simplifications are one shared snapshot validator rather than separate browser/engine schemas, district loading rather than a full-city browser payload, and reused GIS transforms/hash-routing/design controls rather than another framework. No new dependencies or Bin Policy migration.

The deliverable is a source-aware inventory and evidence-readiness module, **not a published prioritized planting or shade-deficit plan**. Ranked candidate delivery remains blocked by measurement semantics and cross-source coverage comparability; documenting zero eligibility is an honest fallback, not fulfillment through invented examples.

No measured canopy, actual shade percentage, mortality prediction, health grade, thermal hotspot, cooling benefit, vacant-pit count or planting approval is supported. Exact duplicate coordinates are conservative accounting exclusions rather than proved duplicate trees. Missing/mismatched records and conservative overlaps require review rather than environmental conclusions. Survey/utility/ownership/soil/accessibility/site measurements remain field prerequisites.

Before expanding analysis, obtain export-specific length/width definitions and coverage/dates, review association quality and source exclusions, and adopt a new audited snapshot. Measured canopy or thermal exposure requires separate sampling, geography, units, temporal comparability and scientific validation. See [the Traditional Chinese decision note](shade-equity-decision-mvp.zh-Hant.md) for planning use and field-review questions.

Implementation branch: `codex/shade-equity-v1`; pushed implementation commit `0d94343` with remote SHA verified. Based on the preserved `490f649` working state; refreshed `origin/main` contains the same documentation baseline via merged PR #16 (`af8e29e`). No main merge, source-adoption approval or public hosting deployment occurred.

The connected GitHub create-PR request returned HTTP403 `Resource not accessible by integration`; **no PR was created by this task**. A complete [review handoff](shade-equity-pr.md) and [manual compare link](https://github.com/LEO0331/taipei-bin-map/compare/main...codex/shade-equity-v1?expand=1) are available. The maintainer must resolve the integration permission or create the draft; no credential bypass or automatic merge.
