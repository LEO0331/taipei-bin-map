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

Outputs are `report.json` and readable `summary.md`. As of the 2026-10-20 monitor correction, research-source attention is distinct from unexpected execution/source failure:

| Observation | Report / CLI | Required treatment |
| --- | --- | --- |
| Exact audited Travel endpoint remains HTTP403, frozen acquisition was blocked/403, tourism is unavailable and has no included references | `warning` / exit0; source `known_unavailable`, validation `warning` | Keep tourism excluded, retain visible warnings and review authorized source access |
| Previously available source now403; any new503, timeout, unexpected status or invalid response size | `failure` / exit1 | Investigate the new failure; preserve frozen inputs |
| Frozen hash/schema/identity verification fails | Fatal validation / exit1 | Stop before remote classification; do not write/adopt replacement data |
| A blocked source returns HTTP200 | `recovery_requires_review`; `change_detected` if bytes changed, otherwise `warning` | Validate actual schema, pagination, coordinates and exclusions before any adoption; even an HTTP200 copy of an old blocked page is not healthy data |
| Available-source bytes change | `change_detected` / exit0 with attention | Existing review-only semantics retained; changed bytes are never schema-approved automatically |
| Unknown/stale source dates | Visible warning | Never replace publication dates with check/retrieval time |

The known-unavailable exception is intentionally limited to source `taipei_travel`, resource `Attractions/All:zh-tw`, and the frozen `https://travel.taipei/open-api/zh-tw/Attractions/All?page=1` URL. It is **not** a blanket403 exemption or a fix for the upstream provider's denial. Available-source monitoring and adoption gates are unchanged. Report `availability` is separate from source validation; warning does not mean healthy or complete data.

The workflow adds an explicit warning annotation for `warning`/`change_detected`, while retaining its original hard-failure step for unexpected errors. Issues, artifacts and their stable fingerprints remain active: unknown/stale dates and known unavailability stay visible without making an unchanged excluded source look like a new broken build. The alert key excludes execution timestamps, so identical attention states do not create repeated comments. The original approved-source monitor is not changed.

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

Historical evidence, before the classification correction: the retained local check in `reports/bin-policy/v1.2-monitor/` returned five unchanged HTTP200 resources and Travel403 on 2026-10-16; the old monitor intentionally returned `failure`/exit1. This evidence is not rewritten. The same condition caused [Actions run39209033524](https://github.com/LEO0331/taipei-bin-map/actions/runs/39209033524/job/117918071962) and [Issue18](https://github.com/LEO0331/taipei-bin-map/issues/18). The 2026-10-20 fix recognizes that explicitly excluded input as known unavailability, rather than claiming the provider has recovered. New live evidence and verification are recorded in `progress.md`; the Travel publication date remains unknown, stale dates remain visible, and no source adoption or bin-inventory change occurs.

Actual post-fix local evidence: [2026-10-20 summary](../reports/bin-policy/research-monitor-classification-2026-10-20/summary.md) and [JSON](../reports/bin-policy/research-monitor-classification-2026-10-20/report.json) record Travel403known_unavailable and five unchanged200 resources, overall `warning`/exit0. Two checks retained the same actionable fingerprint; no dataset was written. Verification passed 31 targeted / 484 full tests, TypeScript/build and the workflow's actual warning program. Hosted scheduling is not claimed verified for this branch: the fix must merge to main before the next scheduled run uses it. Old failed run history remains unchanged.
