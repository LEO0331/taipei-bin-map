# Bin Policy v1.1 — audit and implementation record

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
