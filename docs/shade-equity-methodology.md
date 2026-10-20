# Shade Equity evidence-review methodology v1.0

Method: `shade-equity-evidence-review-v1` · Configuration: `1.0.0` · Review date: 2026-10-20 (Asia/Taipei).

## Supported decision and current publication gate

The question is which documented sidewalk units warrant earlier inventory or field investigation under limited survey capacity, **not where trees can be planted or how much cooling will result**. The method separates registered observations, infrastructure, spatial relationships, measured canopy, pedestrian exposure and legal/engineering feasibility.

The real snapshot `shade-equity-v1-8e4cfb4029d0831d` supports inventory and relationship inspection. It has **0 eligible ranked candidates**. The sidewalk export labels `SW_LENG_ItemValue` as length, but reviewed authoritative material does not establish that field's unit and measurement definition. Polygon perimeter is not a pedestrian segment length; area divided by width is not an independently validated substitute. All published segment `lengthM` and `widthM` values remain `null`, `measurementVerified` is false, and normalized distribution ranking is disabled. Width in metres in a general survey specification does not certify the particular export's length field or record accuracy.

This is a deliberate no-go for prioritization, not evidence of no trees, no need for investigation, or successful completion of a tree-planting plan. The fallback is an explicitly non-comparable administrative inventory and association review. Confirm the measurement contract and coverage before publishing a shortlist.

## Exact review unit and source contract

One unit is one admitted **official sidewalk polygon feature**, retaining district, original ID, road, side and source extent. It is not a road-network edge, route, tree pit, proposed tree position or planting approval. Different road sides are never merged on road name.

Stable IDs are `sidewalk:<official ID>:<first 12 hex SHA256 characters of canonical projected geometry>`. Canonicalization makes ring start/direction and polygon ordering immaterial while preserving holes and distinct geometries. Repeated official IDs with different geometry remain distinguishable. The map representative is an existing source boundary vertex for navigation, not a measured tree or proposed planting coordinate.

Core source identity and actual schema are frozen in [the acquisition manifest](../data/raw/shade-equity/sources.json) and reviewed in [the source audit](shade-equity-source-audit.md):

| Population | Dataset / resource | Admission meaning |
| --- | --- | --- |
| Roadside-tree CSV | `7a49d00c-a5ff-4a6b-be9e-aaa6dc1ff7e8` / `0e96f4b5-8f8c-4935-ae0b-b97b3d031c94` | Registered roadside observations only; not park trees or legally protected-tree subset |
| Sidewalk MultiPolygons | `715d3a83-8445-4496-b6bf-b0900538b7e7` / `b11d6142-1d71-41d5-a843-7b7cfcea61ef` | Validated geometry inventory; length-definition gate remains closed |
| Tree-pit/planter MultiPolygons | `693705fa-4604-4207-bd50-8a9ce9fcfbc6` / `3e2b359b-8dae-46e4-a747-5912d8743d0e` | Only actual `Name === '樹穴'`; flowerbeds are not pit observations |

The CSV must match the actual UTF-8 header, including `UpdDate`, not catalogue wording `Update`. GIS input must declare `urn:ogc:def:crs:EPSG::3826` and the supported MultiPolygon shape. Required identity, original-byte hash and byte length are checked before conversion. Context-only parks/greening and administrative boundaries have separate provenance; no park or Protected Trees stock is substituted for street trees. Heat/canopy observations have no admitted segment-scale source.

## GIS matching and quality rules

Distances use original **EPSG:3826 projected metres**, easting then northing. Existing TWD97 conversion is reused only for WGS84 display and administrative boundary checks. No geometry simplification, fictional centreline, network inference or browser geocoding is used.

1. Validate finite coordinates and the conservative projected envelope (easting 280,000–340,000; northing 2,740,000–2,810,000); then apply retained official Taipei district boundaries. An envelope pass alone is not city membership.
2. Reject missing/repeated tree IDs, unusable coordinates and source/geometry district disagreement. Exact repeated tree coordinates are conservatively non-additive exclusions, not a claim of duplicate physical trees. Retain missing dates and invalid biological measurements as audit flags; no crown estimation is performed.
3. Validate closed polygon rings, positive area, self-intersections, holes and MultiPolygon parts. Canonical duplicate geometry is excluded. Sidewalk district consistency checks all vertices; geometry crossing or touching an unresolved district boundary is excluded. Boundary/district checks do not certify completeness of the inventory.
4. Index sidewalk bounding boxes in **100 m cells** before exact geometry tests. This avoids a full tree-by-polygon Cartesian product while preserving projected matching semantics.
5. Prefer unique strict containment. A boundary hit, more than one possible containing polygon, or more than one nearby polygon is unresolved rather than assigned to an arbitrary road side. Boundary numerical epsilon is **1e-7 m**, not a real-world survey accuracy claim.
6. If no containment exists, permit a unique relationship within the frozen **2 m** tolerance. Offline tolerance is restricted to 0–5 m. Changing it requires a separately rebuilt and reviewed snapshot, not a browser-only relabelling of old joins.
7. A tree-pit representative point alone is insufficient: its polygon must also pass the converter's full containment condition. Otherwise the relationship is ambiguous. Even a unique pit/sidewalk association does not prove tree occupancy.
8. Count a uniquely assigned tree or pit once. Ambiguous relationships retain candidate IDs for review but are **non-additive**; summing ambiguous per-segment or district appearances is not the number of distinct observations.

Overlap detection is conservative and includes boundary interactions; the recorded overlap-pair count is not a measurement of double-counted sidewalk area. Close parallel sidewalks, medians and opposite sides are not resolved with nearest-road guessing. An unmatched roadside tree can be physically valid outside the mapped sidewalk inventory.

## Eligibility, evidence questions and priority rules

Required admission conditions are stable identity, supported Taipei district, valid geometry/display bounds, verified source identity and **verified positive length definition**. Unsupported source populations, invalid widths when supplied and invalid measurements are exclusions, not zero environmental values. Context-only or unavailable sources cannot create analytical candidates. `limited` sources may support their specifically qualified inventory role; that label does not bypass segment eligibility.

Only material segment-specific evidence questions count. Each question has a dimension and causal source/problem ID. Maximum bipartite matching across dimension and cause selects independent questions: neither several symptoms of one source failure nor repeated labels for one dimension inflate the count. Global missing canopy, unknown planting feasibility and generally unknown pit occupancy are shared limitations, not extra priority points in every row.

| Tier | Rule |
| --- | --- |
| A — Verify First | Eligible unit and at least two independent material questions |
| B — Review | Eligible unit and one material question, or explicit unresolved spatial association |
| C — Routine Review | Eligible unit without a qualifying independent question |
| Insufficient | Mandatory identity, geography, source or measurement gate fails; never selected |

Evidence-first order is tier A/B/C, independent-question count descending, confidence high/medium/low, oldest fixed survey date first (unknown last), stable district text, then stable segment ID. Confidence describes source/association evidence, not shade or safety. Sorting never uses the browser's current date. Zero matched trees alone does not raise priority.

## Distribution calculations and scenarios

Only after denominator and population comparability pass review may the engine calculate `treeCount × 1000 / lengthM` and the equivalent pit-observation rate. Numerators contain uniquely assigned observations within the **same eligible units**. A partial tree population divided by all-city sidewalk length is prohibited. Missing pit evidence remains unknown rather than zero pits. Raw district counts are descriptive, not equity comparisons.

The engine's optional low-recorded strategy orders admitted comparable units by registered-tree observations per kilometre, then the evidence comparator. It currently does **not** implement a bottom-quartile threshold. No empirical threshold is adopted for the real snapshot because comparability is false. The UI must not suggest a validated lowest-25% finding.

Scenario parameters are district (empty means all represented districts), strategy (`evidence`, `balanced`, conditional `low-recorded`), capacity (positive safe integer; **0 means unlimited**, not zero slots), minimum eligible length (finite and nonnegative), inclusion of ambiguous associations, and the frozen tolerance. The current UI default minimum length must be read with the scenario's exported parameters; it is an analyst choice, not a municipal standard.

Balanced review round-robins stable district queues, retaining evidence order within each district. It allocates investigation effort; it does not measure ecological equity. Slots mean potential documentary or field reviews, not trees or budgets. Capacity never fills itself with ineligible records.

Comparisons report retained/added/removed IDs and rank changes. Capacity or strategy comparisons on the same source population are same-evidence-scope. Different district, minimum length, ambiguity eligibility, source/version/population or tolerance is **different evidence scope**, even if selected IDs happen to match. Identical selected sets can still have rank changes; neither stability nor change establishes environmental benefit.

## Real reproducible example

The published input has 14,896 admitted sidewalk inventory features, but every feature fails the verified-length gate. The following actual outcomes must not be replaced with synthetic Taipei candidates:

| Scope and parameters | Eligible | Selected | Interpretation |
| --- | ---: | ---: | --- |
| All represented districts, evidence-first, capacity 5, frozen tolerance 2 m | 0 | 0 | No defensible ranked shortlist |
| Same scope, capacity 10 | 0 | 0 | Additional slots cannot cure missing evidence |
| Same scope, district-balanced, capacity 5 | 0 | 0 | Same empty selection, not demonstrated equity |
| Low-recorded-tree strategy | Unavailable | Unavailable | Measurement and source comparability gates fail |

Strict/permissive association and minimum-length sensitivity may be inspected as different-scope comparisons, but do not reopen the measurement gate. Tolerance sensitivity requires separate offline conversion. A/B/C, non-empty capacity effects and valid low-recorded examples are exercised by explicitly synthetic unit fixtures only; they are not real-city results.

The offline 0/2/5 m runs were actually executed on the same frozen source bytes. They change potential associations, not physical inventories or environmental conditions:

| Tolerance | Trees: matched / unmatched / ambiguous | Pits: matched / unmatched / ambiguous | Ranked candidates |
| --- | --- | --- | ---: |
| 0 m | 41,830 / 48,030 / 0 | 46,109 / 869 / 3,752 | 0 |
| 2 m | 45,559 / 44,274 / 27 | 46,109 / 480 / 4,141 | 0 |
| 5 m | 47,744 / 41,942 / 174 | 46,109 / 421 / 4,200 | 0 |

The Compare view loads [source-bound tolerance evidence](../public/data/shade-equity/tolerance-sensitivity.json) only on demand. It checks snapshot/method/configuration identities, source hashes and count partitions. Offline [example analysis](../reports/shade-equity/example-analysis.json) includes all 14,896 exclusions; citywide browser metadata intentionally does not download the full segment population. District exports clearly identify their loaded scope.

```powershell
npx tsx scripts/fetchShadeEquitySources.ts --restore-frozen
npx tsx scripts/auditShadeEquitySources.ts
npx tsx scripts/buildShadeEquitySnapshot.ts
npm run data:analyze:shade-equity
```

Read the resulting [conversion report](../public/data/shade-equity/conversion-report.json), [spatial quality](../public/data/shade-equity/spatial-quality.json), [candidate status](../public/data/shade-equity/review-candidates.json) and actual exported scenario parameters. Reproduction checks restored **original bytes**, not a fresh mutable endpoint. The snapshot ID binds the normalized derived content, including source hashes, method/configuration and tolerance; processing uses the frozen manifest event timestamp. Two independent full-source runs produced identical normalized snapshot SHA256 `6683224b154200e9f321742c8f4c69d72cb0dabd4c805e3e6a8f9c21c097c3c6` (this is not the small metadata-file SHA). Exact-byte publication replay also checks every existing output before replacement. Do not rerun the unrelated facility or Bin Policy publication pipeline.

The browser first fetches metadata with twelve district filenames and no individual segments. Selecting a district fetches only its chunk; the loader checks chunk snapshot/district identity and all segment contracts. Inventory summaries always retain all admitted districts, while loaded segment/exclusion counts are explicitly not citywide totals. Raw CSV and geometry payloads never enter browser scenarios.

Scoped `.gitattributes` rules disable newline rewriting for Shade archives and generated evidence. This is necessary because the publication replay deliberately compares exact JSON bytes: a Windows checkout must not replace LF with CRLF and appear to be a changed snapshot. Original CSV/JSON payloads are restored from their lossless gzip custody before conversion.

## Exports, limits and next admission step

JSON and CSV preserve snapshot/method/configuration, source identity/hashes/dates, scenario controls, evidence questions, exclusions and explicit unavailable states. Formula-like text is escaped for spreadsheet safety. An empty scenario must retain its summary/provenance rather than become an unexplained empty file. No canopy percentage, temperature, health grade, vacancy or approved planting coordinate is exported.

To reopen selection, obtain authoritative export-specific length/width semantics, survey coverage and comparable dates; independently validate the denominator; review overlap/association quality and exclusions; build a new versioned snapshot; rerun tests and review before adoption. Actual canopy, pedestrian heat exposure and planting suitability each need their own measurement and validation contract. See [the Chinese decision note](shade-equity-decision-mvp.zh-Hant.md), [source audit](shade-equity-source-audit.md) and [delivery record](shade-equity-delivery.md).
