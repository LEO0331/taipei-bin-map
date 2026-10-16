# PR handoff

Historical draft retained for traceability. **v1.1 is now merged in [PR #14](https://github.com/LEO0331/taipei-bin-map/pull/14)** (verified 2026-10-16). The failed agent integration attempt below predates the maintainer's PR; do not create a duplicate from the old compare link. Verification/advisory statements below are dated v1.1 evidence, not current results.

PR creation through the connected GitHub integration returned HTTP 403 (`Resource not accessible by integration`). No PR has been created by this task. The feature branch is pushed and ready for independent review.

[Create PR from codex/bin-policy-v1-1](https://github.com/LEO0331/taipei-bin-map/compare/main...codex/bin-policy-v1-1?expand=1)

Suggested title: **Bin Policy v1.1: auditable data governance and reviewed bus-source comparison**. Create as a draft; do not auto-merge.

---

## v1.1: data governance, reconciliation and reviewed bus-source modernization

Built from main cfa0fb1 (MVP PR #11 and legend PR #13). Five staged commits; no main merge or deployment. `analysis.json` and `src/lib/binPolicyDecision.ts` remain unchanged.

### What changed
- Deterministic conservative bin reconciliation, all original rows retained, versioned JSON / audit CSV / readable summary.
- Weekly/manual read-only source monitoring: authoritative portal identity and metadata, HTTP/hash/schema/count/coordinate checks, artifacts and deduplicated Issue alerts.
- Separate exact-hash reviewed publication: protected-environment configuration documented, isolated bundles, preserved raw provenance, legacy bypass guards, tests and a draft-only review branch.
- Frozen newer official StopLocation data, optional build-time TDX pagination adapter, old/new comparison and unchanged-engine sensitivity.
- Additive bilingual Data Health, reconciliation and source-version disclosures; lazy large audit downloads, snapshot-association guards, offline and tile-failure behavior.

### Findings reviewers should read
- Inputs: 1,197 historical rows; 681 current raw rows / 679 accepted positions; separate 130 named-place rows. Supplemental notes total 940 source-described 處, not verified physical bins. The separate 806 groups / 1,612 bins announcement is never added to inventory.
- Reconciliation: 576 confirmed, 42 probable, 535 historical-only, 22 current-only, 13 possible location changes, 23 ambiguous groups, 130 different-scope rows, two invalid records. 725 relationships remain outside confirmed/probable; no removal or closure inference.
- New official feed: 5,374 raw StopLocation rows -> 3,453 accepted Taipei coordinate references, with 1,916 outside/ambiguous and five coordinate duplicates preserved as exclusions. Declared WGS84; source-local update 2026/10/15 13:03:04.
- **2021 remains the default. New source adoption is NOT approved by this PR.** Shared identifier namespaces and platform scope need independent review.
- Same bins / 中正區 / 300m / five additions / 50m separation / no budget: old baseline 135/223 +52; proposed baseline 129/218 +53. This is data-version sensitivity, NOT a policy intervention effect.
- TDX Stop and Station returned 401 without credentials; no successful live TDX retrieval is claimed.

### Verification
- npm ci passed; no dependencies added.
- 186 unit/component/GIS/governance tests passed.
- Production build and TypeScript passed.
- 122 full desktop/mobile E2E tests passed with two workers.
- Two production-preview cached-data/offline cases passed.
- Four real official source checks returned HTTP200 with unchanged hashes/counts 681 / 3407 / 12 / 130.
- Reconciliation, frozen bus conversion and policy snapshot reproduced; git diff --check passed.
- Independent review findings fixed: redirected manifest filenames, same-hash metadata provenance edits, and stale bus comparison sidecars during publication.
- Stable browser tile diagnostics loaded standard OSM tiles and five candidates. External tile failure does not block lists, scenarios or exports.

### Verification limits / required repository setup
GitHub-hosted monitor/publication jobs were NOT dispatched. Configure environment required reviewers, main branch protection and Issue/PR permissions before enabling publication. YAML manually inspected; local YAML/actionlint parser unavailable. Publication tests use explicitly test-only approval fixtures, not a real approval. No public deployment preview or source adoption is claimed. Existing dependency advisory is outside scope.

### Documentation / reproduction
- docs/bin-policy-v1.1-audit.md: architecture, actual findings, commands, verification and decision table.
- docs/bin-policy-data-governance.zh-Hant.md: contract and monitoring/publication controls.
- docs/bin-policy-bin-reconciliation.zh-Hant.md: evidence and agency questions.
- docs/bin-policy-bus-stop-migration.md: source units, frozen snapshot and sensitivity.
- README.md / README.zh-Hant.md, feature_list.json and progress.md updated.

Start with `npm ci && npm test && npm run build`; run `npm run test:e2e -- --workers=2` and `npm run test:policy-preview`. Audit/report regeneration commands are in the v1.1 audit.

Draft for independent review. Do not auto-merge. v1.2 weighting, predictions, IoT, collection routing and cross-repository work remain out of scope.
