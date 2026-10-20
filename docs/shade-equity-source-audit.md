# Shade Equity — official source feasibility audit

Audit date: 2026-10-20 (Asia/Taipei). Raw source snapshot: `shade-source-v1-078b91443dc33e45`.

This is a source-byte audit, not proof of complete citywide coverage or analytical approval. The acquisition manifest is [sources.json](../data/raw/shade-equity/sources.json); reproducible raw checks are [raw-audit.json](../data/raw/shade-equity/raw-audit.json). Per-source catalogue extracts are retained beside them. Conversion/association findings, accepted feature counts, boundary exclusions and final eligibility are recorded separately in the generated Shade Equity conversion/spatial reports. A `null` raw-audit admission count means **not decided at this gate**, not zero physical trees or a failed download.

## Feasibility decision before ranking

All five official resources returned HTTP 200, with UTF-8 payloads verified by strict decoding. A–C contain usable identities/coordinates for further GIS validation, but neither the raw tree registry nor infrastructure geometries establish tree occupancy, canopy, shade, pedestrian thermal exposure or planting feasibility.

The official sidewalk catalogue identifies a length field but does not specify its exact survey definition or explicit unit. The separately reviewed engineering specification defines sidewalk polygons and width units but does not map `SW_LENG_ItemValue` to a documented length measurement. Therefore v1 must not treat that field as verified kilometres or enable a low-recorded-tree-per-kilometre selection mode on this evidence alone. Validated polygons can support **inventory/association field-review questions**, subject to the converter's geometry/identity gate. District raw counts alone cannot establish shade equity.

## A — Roadside-tree registry

- Provider: 臺北市政府工務局公園路燈工程管理處.
- [Dataset](https://data.taipei/dataset/detail?id=7a49d00c-a5ff-4a6b-be9e-aaa6dc1ff7e8): `7a49d00c-a5ff-4a6b-be9e-aaa6dc1ff7e8`.
- Resource: `0e96f4b5-8f8c-4935-ae0b-b97b3d031c94`; [original CSV](https://tppkl.blob.core.windows.net/blobfs/TaipeiTree.csv).
- Original bytes: **10,939,901**; SHA256 `2fd54772656da39ff0b50fa997a5a25c99d83deb7494ac49962911397e2c3efa`.
- Retrieval: `2026-10-20T00:41:23.590Z`; raw processing event: `2026-10-20T00:41:41.554Z` snapshot timestamp.
- Portal resource timestamp: `2024-04-25 14:08:49`; catalogue metadata: `2026-07-28 10:54:26`; dataset publication: `2017-08-24`. These are **not the tree survey date**.
- HTTP Last-Modified: `Mon, 19 Oct 2026 07:15:02 GMT`; every record's `UpdDate` is `2026-10-19 15:14:27`. A common export-update value does not prove every tree was inspected that day.
- Actual schema: `TreeID,Dist,Region,RegionRemark,TreeType,Diameter,TreeHeight,SurveyDate,TWD97X,TWD97Y,UpdDate`. Catalogue wording `Update` differs from actual `UpdDate`; converter must validate the actual schema.
- Raw records: **90,358**; unique/nonmissing TreeIDs: **90,358**; duplicate IDs/identical rows: **0/0**; repeated coordinate rows: **30**. Coincident coordinates are not automatically the same tree.
- Missing coordinates: **0**; outside conservative projected envelope: **0**; unrecognised district names: **0**. Exact city-boundary membership/district disagreement is a separate GIS check, not established by this envelope count.
- Nonpositive diameter: **53**; nonpositive height: **47**. Observed diameter range 0–245 and height range 0–2023 are **source values with unverified units**, not validated biological measurements. At least the height value 2023 requires review; do not derive crown size or canopy.
- Survey date raw range: `1900-01-01`–`2026-10-19`, with **1 missing/malformed value** and **1 `1900-01-01` placeholder**. The placeholder is not evidence of a 1900 survey.
- CRS: catalogue explicitly states TWD97; x/y values are consistent with the Taipei 121°E TM2 zone (EPSG:3826). Transformation and city-boundary validation must be explicit in the converter; x is easting, y northing.
- Height/diameter units are absent from both downloaded CSV and reviewed field description. Keep them descriptive with units unknown; never infer centimetres/metres solely from plausible magnitudes.
- Geographic scope: rows cover all twelve Taipei district labels, but no current completeness guarantee was supplied.
- Suitability: **`limited`** at raw gate; individual records may enter validated registered-observation analysis after GIS checks. Park trees and the application's Protected Trees legal subset remain distinct populations. No park-tree resource is substituted for roadside stock.

## B — Official sidewalk polygons

- Provider: 臺北市政府工務局新建工程處.
- [Dataset](https://data.taipei/dataset/detail?id=715d3a83-8445-4496-b6bf-b0900538b7e7): `715d3a83-8445-4496-b6bf-b0900538b7e7`.
- Resource: `b11d6142-1d71-41d5-a843-7b7cfcea61ef`; [original GIS JSON](https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=b11d6142-1d71-41d5-a843-7b7cfcea61ef).
- Original bytes: **24,404,580**; SHA256 `edd23396fc53bf39e2e08a752b2886dce3039edbf813fdada27ac57ae2d11b6c`.
- Retrieval: `2026-10-20T00:41:25.025Z`; resource update: `2026-01-14 16:02:36`; metadata update: `2026-09-22 19:06:50`; catalogue collection start: `2020-10-26`; end unspecified. There is no per-feature survey/update date in the payload.
- Actual JSON: `FeatureCollection`, name `TP_SIDEWORK`, declared CRS `urn:ogc:def:crs:EPSG::3826`, **15,053 MultiPolygon features**.
- Actual properties: `ID,Town_N,NAME_Road,PSTART,PEND,SW_DIRECT,SW_LENG_ItemValue,SW_WTH_ItemValue,Shape_AR_ItemValue,SWW_WTH,code,Shape_Leng,Shape_Area`.
- `Town_N` contains administrative codes, e.g. `63000050` = 中正區; it is not a district-name string. Preserve road sides and original IDs.
- **14,165 unique IDs**, **888 repeated-ID rows**, no missing ID, **2 exact coordinate-serialization geometry duplicates**. Repeated IDs are not permission to merge road-name neighbours: normalized review identities must retain geometry-specific distinction or exclude unresolved conflicts.
- Structural raw audit: **0 invalid/empty/open/out-of-envelope rings**, **0 zero-area geometries**, **0 unrecognised district codes**, **0 nonpositive recorded length/width/clear-width fields**. These are narrow raw checks, not a blanket topology certificate; self-intersection, overlapping polygons, hole topology and city-boundary discrepancies belong to the converter audit.
- Official classifications: 計畫道路 12,905; 退縮地 947; 學校 549; 機關 341; 公園 295; 橋樑 14; 標線型 2. Not every polygon is an independently connected walkable road segment.
- Geometry transformation: declared projected EPSG:3826 easting/northing → WGS84 for display; GIS association distances are computed in the original projected metre coordinate system. Do not make a network graph or straight-line pedestrian route from polygons.
- Recorded `SW_LENG_ItemValue` is labelled 長度 in the catalogue, but exact units/survey definition remain unverified. `Shape_Leng` is polygon boundary length, **not** a replacement centreline/path length.
- Suitability: **`limited`**, supporting validated administrative-polygon review only; length-normalized environmental/distribution claims remain gated.

### Additional engineering specification (context, not retroactive source certification)

The [臺北市人行道範圍及固定設施物位置測量工作規範](https://www-ws.gov.taipei/Download.ashx?icon=.pdf&n=6Ie65YyX5biC5Lq66KGM6YGT56%2BE5ZyN5Y%2BK5Zu65a6a6Kit5pa954mp5L2N572u5ris6YeP5bel5L2c6KaP56%2BELnBkZg%3D%3D&u=LzAwMS9VcGxvYWQvMzQ2L3JlbGZpbGUvNDgyMzUvODA0NjQxNC83ZjcxNmEyNy03NjRiLTRmYjQtYjE5My1iMzMwOGFmOWY4YzkucGRm), dated 2019-02-21, describes TWD97 two-degree-zone surveying, closed sidewalk boundary polygons split at alleys, and width/minimum-clear-width recorded in metres. It also separates tree pits and flowerbeds as mapped infrastructure. It does **not** certify the accuracy of each downloaded feature or identify a length-field calculation in this export. Its stated surveying tolerances are not automatically guaranteed error bounds for the current source.

## C — Tree-pit and planter polygons

- Provider: 臺北市政府工務局新建工程處.
- [Dataset](https://data.taipei/dataset/detail?id=693705fa-4604-4207-bd50-8a9ce9fcfbc6): `693705fa-4604-4207-bd50-8a9ce9fcfbc6`.
- Resource: `3e2b359b-8dae-46e4-a747-5912d8743d0e`; [original GIS JSON](https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=3e2b359b-8dae-46e4-a747-5912d8743d0e).
- Original bytes: **27,304,373**; SHA256 `9ed8de03c1ba61720bc3bc27903128831023f7590a9c38961a8382c7c9d80f03`.
- Retrieval: `2026-10-20T00:41:36.787Z`; resource update: `2026-01-14 10:42:07`; metadata update: `2026-09-22 19:08:18`; collection start `2020-10-26`, end unspecified; no per-feature survey dates.
- Actual JSON: `FeatureCollection`, name `TP_TREE`, declared CRS `urn:ogc:def:crs:EPSG::3826`, **56,720 MultiPolygon features**.
- Actual properties: **`OBJECTID,Name,Town_N,X_3826,Y_3826`**. Capitalization differs from catalogue `ObjectID`/`NAME`.
- Actual `Name` populations: **樹穴 50,904**; **花圃 5,816**. Only the explicitly classified tree-pit population may enter pit-presence counts; flowerbeds remain separate context.
- IDs unique/nonmissing: **56,720**; duplicate IDs **0**; exact coordinate-serialization geometry duplicate rows **8**; missing representative coordinates **0**; structural invalid/zero-area geometries **0/0**; unrecognised district names **0**. Advanced topology/district/city-boundary/spatial-join checks are separate.
- Coordinates: geometry and representative x/y use declared EPSG:3826. Representative coordinates do not replace full shape validation.
- Suitability: **`limited`** until classified polygons pass GIS validation. Spatially associated trees are not verified occupants. Unmatched pits are **not vacant**, available planting capacity, or planting recommendations.

## D — Park information (context only)

- Provider: 臺北市政府工務局公園路燈工程管理處.
- [Dataset](https://data.taipei/dataset/detail?id=ea732fb5-4bec-4be7-93f2-8ab91e74a6c6): `ea732fb5-4bec-4be7-93f2-8ab91e74a6c6`; resource `302a04cd-8dd7-4052-a014-9a7ee8ec8e58`; [JSON API](https://parks.gov.taipei/parks/api/).
- UTF-8 JSON, **7,222,647 bytes**, **813 records**; SHA256 `c7f165070ad66f4a23d19c73415fc94eff37be155de78e71db9c2b41964fa321`.
- Retrieved `2026-10-20T00:41:41.113Z`; resource update `2026-08-26 10:44:55`; metadata update `2026-08-26 10:48:29`; publication `2015-07-01`; temporal coverage unspecified.
- Actual fields include `SeqNo,pm_regions,pm_name,pm_Longitude,pm_Latitude,pm_unit,pm_LandPublicArea,pm_opening_stime,pm_opening_etime` plus descriptions/facility lists. Actual `pm_LandPublicArea` differs from catalogue `pm_area`. Full observed field list is retained in raw audit.
- Suitability **`context_only`**; accepted analytical features **0 by scope**, not zero parks. Duplicate/coordinate/geometry/CRS validation **not performed for spatial admission**, since no spatial park relation is used. These counts are `null`, not asserted zero.
- Park area is not canopy area; a park centroid is not a tree-lined pedestrian connection. Park trees are not mixed into roadside counts.

## E — Historical citywide greening statistics (context only)

- Provider: 臺北市政府主計處.
- [Dataset](https://data.taipei/dataset/detail?id=61b59d0e-071e-4e78-b9ae-8fa55a9f8f70): `61b59d0e-071e-4e78-b9ae-8fa55a9f8f70`; resource `a8405bba-f5c9-49d0-bd4d-9e428d3085eb`. Exact long official download URL retained in manifest.
- UTF-8 CSV, **2,701 bytes**, **45 annual rows**, 民國 70–114年 (1981–2025); SHA256 `acc67e4f1ca6f1ac822e8d3568654989f05e3d68ad715ba6ac9cf769e6320649`.
- Retrieved `2026-10-20T00:41:41.552Z`; resource update `2026-04-10 17:47:21`; metadata update `2026-04-10 17:47:33`; publication `2020-11-04`. Catalogue collection period says 1977–2025; **downloaded rows begin in 1981**, so do not manufacture 1977–1980 observations.
- Actual columns: 統計期; 道路綠地綠美化面積[平方公尺]; 行道樹[株]; 公園內喬木數[株]; 鄰里公園內喬木數[株]; 草花培育數[盆]; 灌木培育數[株]; 樹木修剪數[株]; 路燈器具清洗汰換數[盞]; 後巷美化累計巷數[條]; 公有田園城市示範園圃/建置數[處]; 公有田園城市示範園圃/面積[平方公尺].
- Suitability **`context_only`**; accepted analytical features **0 by scope**. No coordinates or per-tree IDs; spatial checks/CRS not applicable. Definition changes and zero/missing historic values have not been verified sufficiently for cross-system stock comparisons.
- An annual stock change is not a count or location of removals. No cutting history is reconstructed; no source period is relabelled as today's inventory.

## F — Measured canopy and pedestrian thermal exposure

**`unavailable` for segment-scale analysis**, not a claim that Taiwan has no temperature observations.

The official [CWA ground-observation documentation](https://climate.cwa.gov.tw/GroundObservation) and [CODiS service](https://codis.cwa.gov.tw/StationData?target=weather1) provide station geography and climate time series. These station observations do not certify sidewalk-specific radiation, canopy interception or pedestrian thermal comfort. No reviewed station-to-sidewalk assignment model, comparable measurement period or adequate street-scale exposure data was established for this POC.

Therefore F has no adopted resource ID, raw analytical download, SHA256, accepted feature count or transformation: these fields are **not applicable/unavailable**, not invented. Publication/update period of an adopted thermal source is likewise unavailable. No station temperature, city average, satellite land-surface temperature or weather warning is allocated to a sidewalk. There is no heat-risk score or predicted cooling value. [CWA urban heat-island educational material](https://pweb.cwa.gov.tw/PopularScience/wt/wt_25.html) is policy context only.

## Reproduction, admission and update controls

### Administrative geometry reused, not Bin Policy observations

District containment reuses only the frozen official [Department of Civil Affairs boundary archive](https://data.taipei/dataset/detail?id=1601ef3a-c253-4988-b047-943d9e786143), resource `d8b7eb29-136f-49fc-b14b-3489d3656122`, SHA256 `77bcc347b503b8ff8a43f7e1afaaedb18877a6222282587b145adaba69afd2d9`. It retains the actual 2026-10-15 retrieval and 2024-09-16 source update; these dates are not advanced by this task. The SHP/DBF contains 12 named district polygons; it is not a tree, pit or bin population.

The actual `.prj` declares `TWD_1997_TM_Taiwan`, GRS80, central meridian 121°, false easting 250,000 m, scale 0.9999 and metre units (EPSG:3826). The importer validates those parameters and uses the existing inverse transverse-Mercator conversion for WGS84-compatible longitude/latitude containment. **The source SHP is not raw WGS84.** A separate `shade_district_boundaries` provenance entry is published; the archive and all Bin Policy snapshots remain unchanged. Original content period is not independently established beyond the retained archive metadata, so this is contextual administrative geography, not a new complete-city inventory claim.

```powershell
# Network-free reconstruction of the reviewed original bytes:
npx tsx scripts/fetchShadeEquitySources.ts --restore-frozen
# Optional live acquisition: refuses a frozen resource/hash mismatch.
npx tsx scripts/fetchShadeEquitySources.ts
npx tsx scripts/auditShadeEquitySources.ts
```

Source acquisition writes only `data/raw/shade-equity`, never the browser data or Bin Policy archives. Uncompressed large payloads are locally ignored; only their gzip originals, small source manifests/catalogue extracts/audit reports are committed. The five compressed originals total **12,665,983 bytes** (about 12.1 MiB), compared with 69,874,202 uncompressed bytes. This storage is intentional: mutable official endpoints cannot guarantee historical reproduction. The gzip files are lossless transport containers, not processed substitutes; restore checks the **expanded original-byte SHA256 and byte length** against every source entry before writing any restored source. It also rejects an existing conflicting local original rather than overwriting it.

A known live-download SHA256/resource mismatch rejects the update before replacing that source's known-good bytes; use a **new explicit review directory** for a changed source and rerun all source/GIS/interpretation tests before publication. A successful request is not adoption. Because roadside-tree and park endpoints are mutable, a future live download may no longer match this snapshot: use `--restore-frozen` for reproducibility, never silently substitute a newer export. No local-machine absolute paths appear in public provenance.

Acquisition accepts only the reviewed CSV/JSON format family before constructing any output filename. An unexpected catalogue format fails before download/write; the separate converter still validates the actual bytes/schema and source identities. A regression covers format strings containing path components, not only ordinary unsupported extensions.

Raw audit processing uses the frozen snapshot event timestamp for deterministic reports; it is not a fresh download time or a per-record survey date. Envelope/ring checks are deliberately distinguished from full GIS validation. Final accepted/excluded populations must be read with the converter's spatial audit rather than treating raw counts as validated baseline indicators.
