# Shade Equity v1.0 — review handoff

Branch: `codex/shade-equity-v1`. Implementation commit `0d94343` was pushed and its remote SHA verified. This is a review-only delivery, not a municipal planting plan or source-adoption approval; do not merge automatically.

PR handoff status (2026-10-20): the connected GitHub integration returned HTTP403 `Resource not accessible by integration`. **No PR was created by this task.** No permission or credential bypass was attempted. The maintainer can [create the review PR from the pushed branch](https://github.com/LEO0331/taipei-bin-map/compare/main...codex/shade-equity-v1?expand=1), choose draft status, and use the description below. Do not create a duplicate if a maintainer has already opened one.

Suggested title: **Shade Equity v1.0: source-backed inventory review with explicit measurement gates**

## Purpose and scope

Add an independent `#/shade-equity` decision-support route for Policy Issue #1. Keep public-amenities discovery, Protected Trees, Cooling & Comfort Spots and Bin Policy Mode A/B unchanged. No Portfolio changes, backend, paid API, account system or new dependency.

## Actual data and analytical gate

- Raw/GIS-admitted: 90,358/89,860 roadside-tree observations; 15,053/14,896 sidewalk units; 56,720 pit/planter features containing 50,904 explicit pits, of which 50,730 pass GIS admission. The 5,816 flowerbeds are not pits.
- Parks (813 records) and historical greening (45 annual rows) are context only. Protected trees do not substitute for roadside stock. No measured canopy or defensible segment-scale pedestrian heat exposure was adopted.
- Source snapshot `shade-source-v1-078b91443dc33e45`; derived snapshot `shade-equity-v1-8e4cfb4029d0831d`; method `shade-equity-evidence-review-v1`; configuration `1.0.0`.
- **Actual ranked eligibility remains zero** because official length semantics/units and source comparability are not sufficiently verified. Capacities 5/10 and balanced/evidence strategies return the same empty selection. No synthetic Taipei shortlist, canopy, vacant-pit count, cooling benefit or planting approval.

## Engineering and explanations

Frozen lossless gzip originals, source identities/hashes/dates, schema/CRS/topology/district checks, indexed projected-metre joins and side-specific stable IDs. Unique containment, bounded proximity, unresolved boundaries/multiple matches and full-polygon pit containment remain distinct. JSON/CSV retain real inventory separately from selected-scope counts and protect spreadsheet formulas.

The browser loads 13,723-byte metadata first and district chunks on demand, never raw spatial datasets per scenario. Four compact bilingual views expose source quality, inventory, gated priority controls, capacity/scope comparisons and briefings. Actual 0/2/5 m reassociations are explicitly different evidence scopes, not environmental effects. Research data is network-first, cached after use.

Independent full-source runs share normalized snapshot SHA256 `6683224b154200e9f321742c8f4c69d72cb0dabd4c805e3e6a8f9c21c097c3c6`. Scoped Git attributes preserve exact evidence bytes on Windows/Linux checkouts.

## Verification

- npm ci: zero reported vulnerabilities; no dependency changes.
- 471 tests / 31 files; TypeScript and production build passed.
- Full 160 desktop/mobile E2E passed with one worker.
- 2 Shade offline, 4 unchanged Bin Policy offline, and 2 Shade project-base cases passed.
- Actual source acquisition/audit, frozen restore, independent reproduction, strict output replay, syntax and diff checks passed.
- A hole-enclosure defect and district CRS metadata were independently identified and fixed with regression coverage.
- A two-worker Chromium `ERR_NO_BUFFER_SPACE` failure is disclosed; one-worker full verification passed without added retries/sleeps. The new offline fixture synchronizes with real activation navigation.

Screenshots: [desktop inventory](images/shade-equity-inventory-desktop.png), [mobile English controls](images/shade-equity-controls-mobile.png). Local captures, not a claimed public deployment.

## Review focus and remaining limits

Review source identities, distinct populations, ambiguity/exclusion semantics and the closed measurement/comparability gate. Confirm export-specific length definitions and source coverage before admitting a new ranked snapshot. Field occupancy, tree survival, utilities, clearance, soil, jurisdiction and actual shade measurements remain external prerequisites.

Full details: [source audit](shade-equity-source-audit.md), [methodology](shade-equity-methodology.md), [Traditional Chinese decision guide](shade-equity-decision-mvp.zh-Hant.md), [delivery evidence](shade-equity-delivery.md), and `reports/shade-equity/`.

No automatic merge, government approval, live hosting assertion or whole-application GitHub Pages migration.
