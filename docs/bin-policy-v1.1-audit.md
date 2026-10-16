# Bin Policy v1.1 — audit and implementation record

Historical milestone record (2026-10-15). v1.1 subsequently merged in [PR #14](https://github.com/LEO0331/taipei-bin-map/pull/14); v1.2 merged in [PR #15](https://github.com/LEO0331/taipei-bin-map/pull/15), verified 2026-10-16. Future-work statements and dependency/test findings below describe the v1.1 milestone, not today's status. See the [v1.2 audit](bin-policy-v1.2-audit.md) for implemented research weights and current limitations.

## Baseline (2026-10-15)

- Started from clean `origin/main` `cfa0fb1`, which includes MVP PR #11 (`e06dc6b`) and contextual legend PR #13. Dedicated branch: `codex/bin-policy-v1-1`.
- `npm ci`: successful, one pre-existing high-severity dependency advisory; dependency upgrades are not part of this data-governance task.
- `npm test`: 102 passed. `npm run build`: passed. `PLAYWRIGHT_PORT=5206 npm run test:e2e -- --workers=2`: 108 passed. Alternate port avoids unrelated local port ownership.
- No existing `.github/workflows` directory. Policy data is a separately fetched schema-v1 snapshot, network-first with cached fallback after first use. No external tiles are cached by the service worker.
- Both the general map and policy map currently use the standard OSM tile endpoint, despite historic README/CARTO statements. Single representative OSM and CARTO tile probes both returned HTTP 200 PNG; this does not establish production reliability or justify changing provider. Preserve OSM and add explicit failure handling and browser checks. OSM's [tile usage policy](https://operations.osmfoundation.org/policies/tiles/) forbids bulk/offline tile prefetch. CARTO's [current offering](https://carto.com/basemaps/) documents keys; do not introduce a key-dependent service.

## Bounded implementation plan

1. Reconcile original bin records against the audited policy raw rows and the separate tourist/commercial resource. Preserve evidence and units, deterministic one-to-one matches, ambiguity and unresolved differences. Produce versioned JSON, CSV and a human summary.
2. Document distinct provenance timestamps before adding a monitor. Monitoring reports and deduplicated alerts must never publish data. Require reviewed exact hashes/identity/schema and safe staging for publication; keep the previous known-good snapshot and stage branch/PR output only.
3. Evaluate Taipei's current stop feed and TDX access. Retain the audited 2021 default until explicit adoption approval. Preserve raw snapshots; report unit differences and same-parameter sensitivity using the unchanged allocation engine.
4. Add small bilingual reconciliation, health and source-comparison disclosures without redesigning the dashboard. Validate report/snapshot association; unavailable optional reports must not block A/B/C scenarios or exports.
5. Verify source-failure recovery, deterministic regeneration, monitoring/publication dry runs, component and desktop/mobile flows, production preview and offline tile failure. Record actual outcomes, not assumed network or deployment success.

## Contract boundary

`analysis.json` remains schema version 1 and its counts retain their meaning. Governance, reconciliation and bus-version reports use independently versioned sidecar contracts associated with the published snapshot ID and source hashes. No reference populations are silently combined. Source dates, retrieval, validation, publication and monitoring dates are separate nullable fields; unknown metadata is not replaced with the execution time.

Source-data changes remain proposals for human review. Successful retrieval or a changed coverage percentage is neither proof of current inventory nor proof of a policy effect.

## Implemented architecture and artifacts

- Pure conservative reconciliation: `src/lib/binPolicyReconciliation.ts`; source preparation and versioned JSON/CSV/summary: `scripts/reconcileBinSources.ts` and `public/data/bin-policy/reconciliation*`.
- Monitoring: `scripts/monitorBinPolicySources.ts`, official portal reference-graph parsing and retained evidence in `reports/bin-policy/monitor-2026-10-15/`. All four monitored resources returned HTTP 200 with identical hashes and raw counts 681 / 3,407 / 12 / 130. Old-source, exclusions and missing earlier portal-metadata baseline remain warnings.
- Publication: explicit approval → isolated bundle → exact source/manifest checks → retained archive reconstruction → new review branch → reconciliation, health and source-sensitivity reports → tests → draft PR only. Metadata-only revisions conflicting with a content-addressed archive are blocked pending a separate provenance migration.
- New authoritative source: frozen `GetStopLocation.gz` snapshot, declared WGS84, source-local update `2026/10/15 13:03:04`. It has 5,374 raw rows and 3,453 distinct in-Taipei reference coordinates; 1,916 outside/ambiguous assignments and five exact-coordinate duplicates are retained as evidence. The 2021 input remains the default. TDX Stop and Station endpoints returned 401 without credentials; optional paginated adapter is tested, not claimed as successful live retrieval.
- Frontend: additive health/reconciliation/source-version panels; same-snapshot checks; lazy large reports; bilingual labels; unknown dates remain unknown. Existing analysis schema, 679 accepted bins, 3,395 default references and allocation algorithm file remain unchanged.
- Mapping: a stable production-preview browser session loaded OSM tiles and five candidate markers. Both OSM and CARTO representative image probes loaded. Initial diagnostic was interrupted by the existing service-worker activation reload; it was not evidence of a provider outage. Keep standard OSM, visible attribution and a tile-failure status outside the map. External tiles are never precached.

## Reconciliation finding

The report accounts for all 2,008 source rows exactly once across relationships: 576 confirmed matches, 42 probable matches, 535 historical-only, 22 current-only, 13 possible location changes, 23 ambiguous groups, 130 different-scope rows, two invalid records and zero instances of the specific `unresolved` classification. **Zero in that classification does not mean all differences are resolved:** 725 relationship records remain outside confirmed/probable matches, and probable matches still require review.

The supplemental file contains 130 named-place rows; its `n處` notes total 940 source-described places. That is neither 130 individual bins nor a verified 940-bin inventory. The official August 10 announcement of 806 groups / 1,612 units remains a separate aggregate claim. No totals are combined; no disappearance is treated as an authoritative closure or removal.

## Source-version decision and sensitivity

At 30m, 1,677 old references have mutually unique possible spatial counterparts and 1,312 ambiguous nearby relationships. ID namespaces have not been proven equivalent; spatial leads do not establish identity or closure.

Fixed sensitivity scenario: same 679 bins, 中正區, 300m, five additions, 50m minimum separation, no budget/cost constraint and unchanged `greedy-equal-reference-coverage-v1`:

| Reference version | References | Baseline | Incremental coverage | Post-scenario |
| --- | ---: | ---: | ---: | ---: |
| Audited 2021 | 223 | 135 (60.54%) | 52 | 187 |
| Review-required current feed | 218 | 129 (59.17%) | 53 | 182 |

Reference populations differ. These are data-version sensitivity results, **not government-policy improvement or deterioration**. Both full allocations, coordinates and ranking shifts are retained in `bus-decision-impact.json`. Adoption is deferred to explicit independent PR approval; existing snapshots are retained.

## Verification and review limitations

- `npm ci`: passed at startup; no new dependencies. Existing high-severity advisory remains separate.
- `npm test`: 186 unit/component/GIS/governance cases passed after final timestamp and manifest fixes.
- `npm run build`: passed, including TypeScript. Main application chunk unchanged in size; policy-only chunk increased for the additive evidence panels.
- Full dev-server desktop/mobile regression: 122 passed, two workers and an alternate free port. Production-preview offline fallback: two passed, both device profiles. Initial preview test exposed the intentional first service-worker reload; the test now observes lifecycle state rather than sleeping or retrying failures.
- Deterministic reconciliation and approved-source conversion reproduced; frozen bus conversion and same-parameter comparisons reproduced. Failure fixtures cover HTTP/timeout/schema/count/coordinate problems, preserved production bytes, legacy manifest redirection and same-hash metadata edits. Safe publication uses explicitly test-only reviewer fixtures, not an actual approval.
- Independent code inspection identified the legacy filename bypass, metadata-only provenance conflict and outdated bus-sidecar publication issue; all were fixed with regression coverage and workflow regeneration.
- `git diff --check` passed. No standalone lint script is configured. Workflow YAML was manually inspected; a local YAML/actionlint parser was unavailable. GitHub-hosted jobs, Issue/PR token rights, protected environment and branch protection were **not** exercised by local tests.
- Screenshots and interaction evidence are generated by `tests/e2e/bin-policy-governance.spec.js` and `tests/preview/bin-policy-preview.spec.js` under ignored `test-results/`; deployment to a public preview is not claimed.

## Reproduction

```bash
npm ci
npm run data:reconcile:bins
npm run data:convert:bin-policy -- data/raw/bin-policy/v1-14c24bcdbade --output test-results/policy-reproduced.json
npm run data:convert:bus-current -- data/raw/bin-policy/bus-current/taipei-stop-location-1bddfb244c11 data/raw/bin-policy/v1-14c24bcdbade/districts.zip
npm run data:compare:bus-policy
npm run data:monitor:bin-policy -- test-results/bin-policy-monitor
npm run data:health:bin-policy -- test-results/bin-policy-monitor/report.json
npm test
npm run build
npm run test:e2e -- --workers=2
npm run test:policy-preview
git diff --check
```

Use `PLAYWRIGHT_PORT` when 5173 is occupied. Regeneration may advance actual validation/check times; it must not invent source publication dates. Read the governance guide before preparing an approval or invoking publication. No approval fixture or secret is committed.

## Decision table

| Area | Implemented | Verified | Limitations | Follow-up |
| --- | --- | --- | --- | --- |
| Bin reconciliation | Versioned evidence, CSV, classifications and source rows | Deterministic matching and actual official supplement | Historical-only and ambiguous relationships remain unexplained | Submit precise inventory questions to the agency; verify probable matches |
| Monitoring | Weekly/manual, four sources, artifact reports and deduplicated Issue path | Real downloads, portal metadata and injected failures | GitHub runtime/permissions not exercised locally | Configure reviewers, branch protection and Issue/PR rights |
| Bus modernization | Frozen newer feed, optional TDX adapter, comparisons | WGS84/district/ID validation and same-parameter sensitivity | 2021 remains default; shared IDs and adoption not approved; TDX 401 | Independently review platform scope, ambiguities and adoption |
| Decision compatibility | Same v1 schema and unchanged greedy engine | Existing A/B/C, budget, evidence and exports | Straight-line equal-reference heuristic, not demand or causal effect | Preserve method identity; consider separately justified v1.2 policy alignment |
| Dashboard reliability | Additive bilingual disclosures, tile status and cached-data fallback | Desktop/mobile, production preview and offline flows | External tiles are best-effort; no offline basemap guarantee | Recheck real deployment after approved merge |

Recommended v1.2 work is **review and evidence first**: agency-confirmed inventory definitions, field validation, and explicitly justified commercial/tourism/market or Metro weighting. These models, IoT, routing, household-dumping inference and cross-repository integration are not implemented here.
