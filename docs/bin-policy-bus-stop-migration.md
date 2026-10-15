# Bus source evaluation and controlled migration

## Decision

The audited 2021 SHP remains the default. The newer official StopLocation feed is integrated as a **frozen, review-required comparison**, not silently substituted into the published model. Its inclusion in a PR is not approval to adopt it. No raw archive or v1.0 reference point is deleted.

The candidate feed is eligible for further review: official identity, WGS84 coordinates, individual StopLocation identifiers and district containment are verified. Adoption still requires explicit review of cross-source identity ambiguity, regional coverage and decision sensitivity. Newer publication does not prove greater positional accuracy.

## Source evidence (checked 2026-10-15)

The [Taipei source catalog](https://data.taipei/dataset/detail?id=ce7d3d2b-096f-4f2d-b7cf-cdd6a529f35c) links `GetStopLocation.gz`. Its resource descriptor lists daily updates, whereas the catalog describes irregular updates. The actual payload supplies its own `EssentialInfo.UpdateTime` and `CoordinateSystem`. We preserve these separately from HTTP Last-Modified and retrieval time; neither catalog metadata date nor a re-download is a new publication date. Access succeeded without credentials; no pagination or published rate-limit guarantee was found for this whole-snapshot endpoint. Public/free catalog access is subject to its Government Data Open License link.

The [public transport office API documentation](https://pto.gov.taipei/News_Content.aspx?n=A1DF07A86105B6BB&s=55E8ADD164E4F579), version 6.3, distinguishes `GetStop` route-specific records from `GetStopLocation` locations: the former contains route, sequence, direction and a `stopLocationId`; the latter has location ID, name, address, longitude, latitude, version and bearing. Opposite-direction platforms and same-name stops are not automatically one facility. `nid` is retained as original evidence but not assumed to be a cross-source identifier.

[TDX Bus v2 documentation](https://tdx.transportdata.tw/api-service/swagger/basic/2998e851-81d0-40f5-b26d-77e2f5ac4118) remains available. Both `/api/basic/v2/Bus/Stop/City/Taipei` and `/api/basic/v2/Bus/Station/City/Taipei` returned **401 Valid API Key Required** in this environment. No successful TDX retrieval is claimed. The optional `fetchTdxPages(unit, token)` adapter uses explicit Stop/Station identity schemas, bounded `$top`/`$skip`, request timeouts, and repeated-page detection. Supply a token from build-time secrets only. Tokens are neither persisted nor included in browser JSON. TDX is not a monitored or approved production source in this revision.

## Frozen source and transformation

Raw archive: `data/raw/bin-policy/bus-current/taipei-stop-location-1bddfb244c11/`.

The actual source timestamp is `2026/10/15 13:03:04`, supplied without an offset; Taipei local time is recorded as the interpretation, not fabricated ISO provenance. The archive's full SHA-256, retrieval time, HTTP ETag and Last-Modified are in `source.json`.

The archive has 5,374 StopLocation records. Of these, 3,453 distinct coordinate references fall inside exactly one audited Taipei district polygon. Another 1,916 are outside or ambiguously assigned and are excluded from Taipei analysis, **not classified as malformed or closed stops**. Five equal-coordinate duplicates are collapsed for the existing equal-location coverage model. All original records and exclusions remain available. There are no missing/malformed IDs, conflicting IDs or invalid coordinates in this frozen revision.

Coordinates are explicitly WGS84 and need no projection. District polygons reuse the existing audited TWD97-to-geographic transformation and point-in-polygon implementation. Coordinates rounded to seven decimal places define duplicate groups; this is deterministic grouping, not a positional-accuracy claim. Shared coordinates do not prove identical platforms. IDs are normalized without stripping meaningful leading zeros; conflicting IDs are excluded, never arbitrarily chosen.

The old SHP retains 3,407 source features and 3,395 accepted references. Its missing projection file and actual geographic coordinates despite TWD97 catalog metadata remain documented. SHP `BSM_BUSSTO` and StopLocation `id` are **not proven to share a namespace**.

## Comparison and sensitivity

`bus-source-comparison.json` records district distributions, raw quality results, unmatched IDs and ambiguous relationships. At an inclusive 30-metre tolerance, 1,677 old references have mutually unique possible spatial counterparts (49.40% of old accepted references); 1,312 old references have ambiguous nearby relationships. These are proximity-review suggestions, not confirmed record matches. Names alone are never matched, and absence never proves closure. Verified same-ID movement reporting is supported only when a caller explicitly establishes the shared identifier namespace; that option is false for this audit.

`bus-decision-impact.json` calls the **unchanged** `greedy-equal-reference-coverage-v1` engine twice using the same 679 bins, 中正區, 300-metre radius, five-bin limit, 50-metre existing-bin separation and no cost/budget constraint:

| Population | References | Baseline covered | Baseline percentage | Added coverage | Post-scenario covered |
| --- | ---: | ---: | ---: | ---: | ---: |
| Audited 2021 references | 223 | 135 | 60.54% | 52 | 187 |
| Proposed frozen references | 218 | 129 | 59.17% | 53 | 182 |

This is **data-version sensitivity, not an intervention effect**. Reference populations differ. Neither percentage difference nor a different candidate ranking demonstrates improved or worsened government policy. Both full allocations, candidate IDs/coordinates, ranking and nearest-candidate geographic shifts are retained. A nearest candidate in the other run is not a verified moved stop.

## Reproduction

Commands below generate only review artifacts; they do not change `analysis.json`:

```bash
npx tsx scripts/convertCurrentBusStops.ts data/raw/bin-policy/bus-current/taipei-stop-location-1bddfb244c11 data/raw/bin-policy/v1-14c24bcdbade/districts.zip
npx tsx scripts/buildBinPolicyImpactReport.ts
npm test -- scripts/currentBusStops.test.ts
```

To download a new **unapproved** frozen revision:

```bash
npx tsx scripts/fetchCurrentBusStops.ts
```

Use the printed content-addressed directory explicitly for conversion. The importer validates its saved hash. Do not select whichever folder is newest or overwrite the approved baseline. Generated comparison reports identify the policy snapshot and source version; generation time may change while deterministic reference arrays and model results remain reproducible.

For adoption, reviewers must approve the full source hash, unit definition, district exclusions, duplicate semantics, source date and missing projection differences, ambiguous comparison records, and scenario sensitivity. Retain the previous snapshot and publish through the separate governed publication path. Current monitoring of approved sources does not imply that the unapproved feed is live or automatically adopted.
