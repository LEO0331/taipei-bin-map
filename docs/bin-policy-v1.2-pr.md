# v1.2 PR handoff

**Subsequent status (verified 2026-10-16): [PR #15](https://github.com/LEO0331/taipei-bin-map/pull/15) is merged**, head `01d07aa`, merge commit `1280011b086f498404abf138c29f64041963e14c`. The integration failure and draft text below are historical handoff evidence. Do not create a duplicate PR; no hosting deployment or operational source approval is implied by the merge.

The feature branch is pushed and ready for independent review. The connected GitHub integration returned HTTP403 (`Resource not accessible by integration`) when creating a draft. No PR has been created by this task; no main merge or production approval occurred.

[Create draft PR from codex/bin-policy-v1-2](https://github.com/LEO0331/taipei-bin-map/compare/main...codex/bin-policy-v1-2?expand=1)

Suggested title: **Bin Policy v1.2: category-balanced policy priorities and explainable allocation**

---

## v1.2 — policy alignment and explainable category-balanced coverage

Built from merged v1.1 PR #14 through staged implementation/evidence commits; no automatic merge, production approval or v1.3 operations. Original `analysis.json` and `greedy-equal-reference-coverage-v1` code are unchanged.

### Old and new capabilities
- Mode A retains approved bins / historical 2021 bus coverage, its A/B/C scenarios and existing exports.
- Explicitly selected, lazy Mode B adds `policy-balanced-coverage-v1`, central editable/resettable `policy-priority-weights-v1`, category explanations, same-input sensitivity and reproducible JSON/CSV.
- Existing reconciliation, Data Health, source comparison and review-controlled workflows remain available.

### Data actually integrated
| Category | Eligible entities | Decision |
|---|---:|---|
| Tourism | unavailable | Official API/Swagger HTTP403; response retained, no fabricated POIs |
| Vendor concentrations | 42 | From47officialrows with five reviewed aliases; not all declared night markets |
| Traditional markets | 47 | Official reference positions, not installable sidewalks |
| Commercial districts | unavailable | 65intro+170association rows remain context; mailing addresses are not district geometry |
| MRT references | 73 | EPSG3826 transformed;124features minus48outside/ambiguous and3reviewed aliases |
| Bus references | 3395 | Original approved source/hash; newer StopLocation comparison is not adopted |

The research snapshot has3557entities and3468transport anchors. All new inputs remain `review_required`. Raw source/date/hash evidence and exclusions are retained; scoped Git attributes preserve original bytes across Windows/Linux. Previously normalized retained CSVs were restored to their recorded original bytes, not treated as new government revisions.

### Formula, assumptions and explanations
`gain(c) = sum_k(weight_k * newlyCovered_k(c) / fixedEligiblePopulation_k)`

Defaults tourism/vendor/market/commercial/MRT/bus = **4/4/3/3/2/1**, finite nonnegative bounds0–10. These are scenario assumptions, not official coefficients, people, waste volume or policy effects. N includes baseline coverage, stays fixed across selection and comparisons, and zero-population terms are unavailable without redistributing their weights.

Verified canonical identities prevent aliases being counted twice; independent nearby places are not proximity-merged. Candidates are separate bus/MRT field-review anchors. Source-category and availability guards reject blocked/context-only spatial inputs. The district ZIP is bound to approved provenance. Minimum separation is analytical only: the historical2022-stopped procedure is not enforced as current law.

Each candidate explains raw gain, weighted score, category numerators/denominators/weights, nearby bins, source/coordinate evidence, sensitivity omissions and field checks. Raw and weighted before/after units remain separate.

### Example and sensitivity
Same approved bins, citywide,300m,ten additions,0m listed-bin separation, no monetary constraint:
- Equal category priorities:125newrawentities; score0.6747225;bus-1210rank7.
- Documented priorities:125newrawentities; score2.1961240;bus-1210rank3.
- Different score scales are NOT an improvement/effect estimate.

Eleven scenarios reuse the same prepared populations/radius/sources/budget: equal,defaults,active and individual ±25% default variations for the four available categories. Complete rankings, omissions, category contributions and exact source/method/weight versions are in reports/bin-policy-v1.2/example-analysis.json and.csv. No unsupported robustness label is produced.

### Governance and verification
- Read-only research monitoring extends existing weekly/manual jobs with separate artifacts and deduplicated alerts.
- Actual checks:fiveHTTP200 unchanged resources; tourism403. Monitor correctly reports failure/exit1 and preserves the approved snapshot.
- Technical-review bundles require exact hashes and base/method/weight identities, remain nonproduction and do not grant government approval.
- Independent review found district-provenance and context-only eligibility gaps; both fixed with RED/GREEN regressions.
- npm ci passed,0reportedvulnerabilities,no dependencies added.
- **308unit/component/ETL/governance tests;142desktop/mobile E2E;4production-preview offline cases; TypeScript/build;diffcheck passed.**
- Actual citywide Node preparation+allocation+11sensitivities approx0.71seconds on this machine. Both viewport profiles passed a4×CPU-throttled flow under15s; not a physical-phone latency claim.
- Earlier development loading/download timeouts are disclosed in the audit. The original CSV case passed10isolated repetitions and the settled full run passed; first-failure traces are retained, not masked by new retries.

### Screenshots
[Desktop research controls](https://github.com/LEO0331/taipei-bin-map/blob/codex/bin-policy-v1-2/docs/images/bin-policy-v1.2-controls-desktop.png) · [Mobile research controls](https://github.com/LEO0331/taipei-bin-map/blob/codex/bin-policy-v1-2/docs/images/bin-policy-v1.2-controls-mobile.png)

Local E2E captures, not a claimed public production deployment.

### Documentation and reproduction
- docs/bin-policy-v1.2-methodology.md / .zh-Hant.md
- docs/bin-policy-v1.2-sources.md / market-sources.md / governance.md
- docs/bin-policy-v1.2-audit.md — architecture, limitations, actual findings and commands
- README versions, feature_list.json and progress.md updated.

`npm ci`; `npm test`; `npm run build`; `npm run test:e2e -- --workers=2`; `npm run test:policy-preview`.
Rebuild the frozen research dataset using the explicit rawversion+approved districtZIP listed in the audit, then `npm run data:example:policy-priority` and `npm run benchmark:policy-priority`.

### Remaining risks
Restore authorized tourism access and verify actual API schema/classifications; obtain defensible commercial geometry; review source age, completeness, canonical identities, walking/jurisdiction/site/collection conditions. Sparse counts are not statistical confidence. Missing sources are not zero demand. GitHub-hosted jobs, notification rights and actual human approvals were not exercised locally.

Draft for independent review only. No automatic merge, legal siting approval, measured litter/dumping/cost benefit, sensors, dispatch or portfolio integration.
