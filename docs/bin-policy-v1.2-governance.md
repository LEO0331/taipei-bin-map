# v1.2 policy-priority research data governance

## Scope and approval boundary

The policy-priority sidecar is an **experimental, source-backed research snapshot**. Its `approvalStatus` remains `review_required`. Successful acquisition, conversion, monitoring, tests, or preparation of a technical-review bundle does not approve a government installation, approve a new source baseline, or replace the approved v1.1 `analysis.json`.

Mode A continues to use the approved v1.1 bin and 2021 transport baseline. Newer bus StopLocation data remain a separate reviewed comparison source. The 130-location tourist/commercial attachment remains reconciliation evidence, not an extra bin inventory. No government accounts, sign-off database, RBAC, adoption automation, or v1.3 operational workflow is introduced.

## Independent version dimensions

| Dimension | Recorded identity | Change rule |
|---|---|---|
| Approved fallback | `baseSnapshotId`, approved bus hash | Separate source-version decision; never switched by monitoring |
| Research source contents | raw SHA256, resource ID, `sourceVersion`, research `snapshotId` | New bytes require a new frozen archive and adapter review |
| Methodology | `policy-balanced-coverage-v1` | Change if calculation semantics change |
| Default weights | `policy-priority-weights-v1` | Increment when defaults or interpretation change |
| Scenario weights | Explicit six-category values in briefing | Preserve exact values with original source/method versions |

Retrieval time, validation time, official publication time and HTTP transport metadata are separate. Unknown official publication dates stay `null`; an unchanged response or successful weekly run never refreshes them. Stale or missing categories are limitations, not zero demand.

## Frozen checks before research use

`scripts/monitorPolicyPrioritySources.ts` reuses the v1.1 SHA256, report and alert-fingerprint helpers. `verifyFrozenPriority` validates:

1. Research manifest schema and unique source identities.
2. Contained archive paths and exact SHA256 of every raw file.
3. Reference snapshot schema, Taipei coordinate bounds, reference identity/version consistency and category availability through the shared pure validator.
4. Exact research snapshot identity, approved baseline and approved bus version.
5. Exact resource IDs, hashes, source versions, publication dates, retrieval dates and validation dates across the manifest and derived sidecar.
6. Any source not in the research manifest must match an existing approved v1.1 source identity/hash/publication date.

The raw archives preserve excluded/blocked evidence. A blocked HTTP response is not a valid geographic dataset. A successful byte check does not independently establish that official portal metadata is unchanged; the report states that limitation explicitly. On changed bytes, schema, coordinate geometry, canonical identity, completeness and decision impact require a new adapter review. No newly retrieved bytes are installed into the frozen archive or production snapshot.

## Read-only monitoring

```powershell
npx tsx scripts/monitorPolicyPrioritySources.ts data/raw/bin-policy-priority/<snapshot-id> public/data/bin-policy/priority-references.json test-results/policy-priority-monitor
```

Outputs are `report.json` and readable `summary.md`. A failed/blocked remote source produces a failure report and nonzero exit code while preserving the approved baseline and research archive. Unknown/stale dates produce explicit warning evidence. The alert key includes actionable facts, sorted source identities and hashes, but not execution timestamps: identical failures do not create repeated issue comments.

The existing `.github/workflows/bin-policy-source-monitor.yml` retains its original v1.1 monitoring and notification jobs. Separate research-source jobs perform this check on the same weekly/manual schedule, retain a 90-day artifact and use their own deduplicated issue marker. Artifact retention is the fallback when issue permissions are unavailable. This is monitoring only: no commit, pull request, merge, publication or `analysis.json` replacement is performed by the research jobs. A local manifest/schema setup failure is visible in workflow logs/summary rather than reported as successful freshness validation.

## Technical-review bundle, never publication

```powershell
npx tsx scripts/preparePolicyPriorityReview.ts <technical-review.json> data/raw/bin-policy-priority/<snapshot-id> public/data/bin-policy/priority-references.json test-results/<new-review-directory>
```

The reviewer must supply the `PriorityReview` contract exported by the script: explicit `technical_review_complete` status, reviewer, actual review timestamp, repository issue/PR evidence URL, exact baseline/research IDs, exact reference JSON and raw-manifest hashes, method and weight versions, each source ID/resource/hash/official date, and affirmative schema/coordinate/identity/date/exclusion/method/weight checks. Do not insert fictional reviewers or evidence URLs to make this command succeed. Automated tests use explicitly test-only fixtures, not an approval artifact for these real sources.

Validation occurs before creating output. Existing destinations are refused. `public`, `data`, `src`, `scripts`, `.git` and `.github` are prohibited output roots. A successful command copies only validated contained source files, unchanged research reference JSON, technical-review evidence and a `ready.json` manifest into a **new nonproduction review directory**. The sidecar remains `review_required`; the ready manifest explicitly says `published: false`. A human independently reviews the resulting PR. This tool cannot adopt a baseline or grant government approval.

Keep the original source archives, default-weight module and methodology version to reproduce older briefings. If any validation, retrieval or review fails, retain the prior approved snapshot. External map-tile availability has no role in technical source approval or coverage calculations.

## Verification

`scripts/policyPriorityGovernance.test.ts` covers raw-byte tampering, resource identity mismatch, wrong approved base, path escape, invalid coordinates, fabricated dates, unsupported schema, unchanged unknown dates, stable failure fingerprints, preservation of production bytes, incomplete review status, exact reviewed-hash mismatch, nonproduction output and retention of `review_required` status. Run:

```powershell
npx vitest run scripts/policyPriorityGovernance.test.ts
```

Repository GitHub scheduling and issue-delivery permissions must still be verified after the workflow reaches the default branch. A local run cannot prove a scheduled Actions run occurred.

The retained local official-URL check is in `reports/bin-policy/v1.2-monitor/`. On 2026-10-15 it returned HTTP 200 with unchanged hashes for the MRT and four market/commercial resources, and HTTP 403 for the Travel API. Overall `failure` and exit code 1 are intentional: a blocked required source must not be described as healthy or newly approved. The three 2025 market/commercial resource dates remain visibly stale; the Travel publication date remains unknown. These observations do not imply current-source adoption or a new bin inventory.
