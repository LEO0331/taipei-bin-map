# Policy alignment and category-balanced allocation

## Two independent modes

Mode A remains `greedy-equal-reference-coverage-v1` using the approved 679-bin / 3,395-bus snapshot. No new POIs, weights or bus version enter its calculation. Existing A/B/C radius and budget comparisons and original-mode exports retain their meanings.

Mode B is `policy-balanced-coverage-v1`, an independent study of public-activity priorities using the source-backed, **review-required** policy snapshot. Its score units cannot be compared directly to Mode A. In the route, select mode, inspect assumptions and missing categories, edit weights/budget/radius, run, review candidate contributions and sensitivity, then export.

## Policy context, not official coefficients

The [August 10, 2026 announcement](https://www.gov.taipei/News_Content.aspx?n=F0DDAF49B89E9413&s=798A998A29BE46CD) motivates attention to commercial areas, vendor/night-market locations, attractions, public activity and recycling cooperation. It supplies **no numerical formula**. `policy-priority-weights-v1` is an explicit analytical assumption:

| Category | Default | This snapshot's eligible citywide entities |
| --- | ---: | ---: |
| Tourist attractions | 4 | unavailable: API HTTP403 |
| Official vendor concentration / verified night markets | 4 | 42 vendor locations; not all classified as night markets |
| Traditional markets | 3 | 47 |
| Spatially defensible commercial districts | 3 | unavailable: 235 contextual directory rows, not district geometry |
| MRT station references | 2 | 73 station centres, not entrances |
| Approved historical bus references | 1 | 3,395 |

One category weight of four does not mean four times the people or garbage. Advanced edits must supply all six finite numbers in the central 0–10 bounds; negative, empty, NaN, infinite and excessive values are rejected. Reset uses the same central defaults. A default/interpretation change requires a new configuration version. Custom values remain explicitly recorded under the configuration's semantics.

The [historical procedure](https://laws.gov.taipei/Law/LawSearch/LawArticleContent/FL076512) is marked stopped from 2022-08-24. Its width or 50m rules are **not current constraints** in this software. Separation is an optional analytical assumption from listed bins only; no legal suitability is inferred.

## Canonical populations and fixed denominators

For each category k, N_k is the number of valid canonical entities in the selected area, including those already covered by bins. Global canonical identity is resolved **before** district filtering so aliases cannot acquire different categories depending on the selected area. Verified shared canonical IDs use the primary order tourism → vendor → traditional market → commercial → MRT → bus. Nearby or even coincident independent entities do not merge merely because of distance. Exact duplicate candidate coordinates may share one stable-ID anchor; this does not merge the reference entities they cover.

The current inputs use source-scoped identities, exact reviewed vendor operating aliases and three explicitly reviewed MRT interchange pairs. Raw rows, aliases, exclusions, context-only records, source hashes and dates are retained. Source sequence IDs are stable only within the frozen revision, not asserted as permanent government facility IDs. [Source audit and precise deduplication evidence](bin-policy-v1.2-sources.md).

N_k remains fixed during every selection step and all weight comparisons within that prepared scenario. For candidate c:

`gain(c) = Σ_k weight[k] × newlyUncoveredEntitiesCovered[k,c] / N_k`

N=0 excludes the term, marks the category unavailable and does not redistribute its weight. A zero configured weight is an explicit choice to give no priority contribution, not evidence of zero demand. N<5 is a sparse-population caution, not a statistical confidence estimate. Published POIs do not measure users, waste volume or operating intensity.

## Coverage and candidate selection

1. Validate the published base, source hashes/versions, category/source eligibility and Taipei coordinate bounds. Context-only commercial directories, blocked sources and contradictory availability cannot become scored entities.
2. Bind the district archive to the approved baseline's exact SHA256; retain its provenance in source exports. Raw archival checks and actual analysis-ready spatial/contract validation have separately labelled timestamps.
3. Count baseline entities within inclusive Haversine radius of any listed bin, including bins across district borders. Geographic grid lookup reduces candidate search work; exact Haversine filtering determines coverage, never an approximate grid score.
4. Candidate anchors are approved bus references or bus+MRT references, selected explicitly. Tourist/market coordinates are coverage references, not synthetic candidate locations. A baseline-covered transport anchor can still be useful for uncovered entities of another category.
5. Exclude anchors inside the chosen minimum distance to listed bins and collapse exact equal candidate coordinates by stable ID. No additional candidate-to-candidate separation rule is silently imposed.
6. Precompute baseline-uncovered neighbour sets once. Repeatedly choose the greatest positive incremental category-balanced gain. Subtract already covered entity IDs before each next choice.
7. Stop at zero gain, candidate exhaustion, count limit (0–50), or `floor(budget/unitCost)` when both monetary assumptions exist. Zero budget then permits no additions. Costs exclude maintenance, collection and civil works.

Score ties within a relative tolerance of `1e-12 × max(|score|, |bestScore|)` use stable ID order; scaling all valid weights down does not silently erase positive gain or change the ranking through an absolute score floor. The 1e-7 metre radius tolerance only absorbs numerical error, not source uncertainty. These greedy choices do not guarantee a global optimum, fairness, safe walking access or installation permission. Every candidate requires field verification of current operation, sidewalks, obstacles, ownership/jurisdiction, affected residents/businesses, maintenance and collection access.

## Sensitivity and explainability

All comparisons reuse the same prepared references, N_k, source versions, radius, anchors, budget and separation:

- Equal category priorities: every available category gets one.
- Documented policy defaults: 4/4/3/3/2/1.
- Active user edits.
- Each available category individually ±25% around its documented default, all others fixed. Invalid-bound variations would be explicitly skipped, not silently clamped.

The interface and JSON preserve every selected candidate's per-category raw gains, denominator, weight and score, full scenario rankings, omission counts and missing/sparse categories. A dash means not selected, not stable rank. No unexplained score/100 or unsupported “robust” label is generated.

On the frozen citywide 300m / ten-anchor scenario, equal and proposed weights each cover 125 additional raw entities, while `bus-1210` moves from rank seven to rank three. These are allocation-priority differences, not evidence of reduced litter or costs. Score magnitudes differ with weight scale; do not call the higher magnitude greater policy effectiveness. Full outputs and timing are in `reports/bin-policy-v1.2/performance.json`.

## Provenance, exports and governance

Source revisions, reference/base snapshot identities, method version and weight configuration version are independent dimensions. The input snapshot stays `review_required`; technical review does not create government approval. Source monitoring reports failures/changes but never replaces approved data. The same-origin service worker only caches policy JSON/assets after use; external tiles are not precached.

JSON contains exact scenario weights, method/configuration, category definitions, source IDs/hashes/dates, approved base and bus version, analysis validation/generation timestamps, full active/sensitivity results, exclusions and limitations. CSV contains a scenario-summary row (including zero-candidate runs), category summaries and candidate rows; it separates raw counts from weighted gains and records the same versions and source hashes. Formula-like source strings are escaped. Mode A exports are unchanged.

See [research governance and review preparation](bin-policy-v1.2-governance.md), [architecture / verification](bin-policy-v1.2-audit.md), and the [Traditional Chinese guide](bin-policy-v1.2-methodology.zh-Hant.md). This work does not implement government sign-off, routing, fullness sensors, household dumping predictions or cross-repository integration.

The committed [example JSON](../reports/bin-policy-v1.2/example-analysis.json) and [CSV](../reports/bin-policy-v1.2/example-analysis.csv) can be regenerated with `npm run data:example:policy-priority`. [Desktop](images/bin-policy-v1.2-controls-desktop.png) and [mobile](images/bin-policy-v1.2-controls-mobile.png) screenshots show the local research controls, not a public production deployment.
