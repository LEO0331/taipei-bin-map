# Tradeoff Decisions

[English](tradeoffs.en.md) | [繁體中文](tradeoffs.zh-Hant.md)

Reviewed 2026-10-16 against the retained repository snapshot. See [system design](system-design.en.md) for current module boundaries.

## Static App Instead Of Backend

Decision: keep all facility data as static JSON under `public/data/`.

Why: the datasets are public, small enough for client-side filtering, and read-only for this product. Static hosting reduces operational cost, avoids API keys, and makes Vercel/GitHub Pages deployment straightforward.

Rejected: a backend API or CMS. It would add hosting, authentication, and maintenance burden without solving a current user problem.

## Generic Facility Model

Decision: refactor from a bin-only model to `Facility` with explicit `type`.

Why: the 22 shared facility types have different meanings and source columns. A typed model keeps labels, warnings, filters, and popups accurate. Dedicated dashboards retain their own contracts instead of expanding one generic schema for every analytical task.

Rejected: forcing every amenity into the old bin model. That would risk describing dog-waste bag boxes or public toilets as trash bins, which is incorrect.

## Keep Coordinate Outliers

Decision: preserve broad Taipei coordinate outliers with `isCoordinateOutlier: true` and report them in `conversion-report.json`.

Why: suspicious coordinates may still be useful for manual verification, and silent deletion hides data-quality issues.

Rejected: dropping all out-of-bounds rows. That would make the data cleaner-looking but less auditable.

## OpenStreetMap + Leaflet Instead Of Google Maps API

Decision: use Leaflet with OpenStreetMap tiles.

Why: no API key is required, the map is good enough for facility discovery, and it keeps the project deployable by anyone.

Rejected: Google Maps embed/API as the main map. Google Maps links are still provided for navigation, but using Google Maps as the main map would introduce key management and billing concerns.

## Client-Side Geolocation And Distance Calculation

Decision: calculate Haversine distance in the browser.

Why: the user location never needs to leave the device, and the dataset is small enough for local sorting.

Rejected: server-side nearest-facility lookup. It would add privacy and infrastructure concerns for no current benefit.

## Marker Cap Instead Of Clustering

Decision: use emoji `divIcon` markers, but suppress facility markers when the active result set is above the marker cap.

Why: the retained combined dataset is 16,956 records, too cluttered for unclustered mobile markers. The shared map starts with no type selected; selecting one type replaces the previous selection. At most 500 valid coordinates in a focused single-type view, or nearby results, render precise markers. Address-only district summaries are not exact facility locations.

Tradeoff: users do not see all markers by default. If the product needs low-zoom all-marker browsing, marker clustering is the next upgrade.

## Limited Default List Rendering

Decision: render the first 80 list items by default and show a notice encouraging search/filter.

Why: mounting all 16,956 retained records is not useful for scanning. Search, district, source-specific filters and nearby lookup reduce both rendering and cognitive load. Dedicated directories use their own pagination/limits.

Tradeoff: neither the list nor the map necessarily displays every matching record at once. The full matching count remains visible. If exhaustive browsing becomes a requirement, evaluate pagination/virtualization; low-zoom spatial exploration may justify clustering or Canvas/WebGL, with additional interaction and accessibility work.

## Service Worker Strategy

Decision: use network-first for navigation, `/assets/` and `/data/bin-policy/`; cache-first for other `/data/`, icons and manifest.

Why: a cache-first app shell can keep users stuck on an old deployment. Network-first keeps deploys fresh while still preserving offline fallback.

Tradeoff: first navigation prefers the network, so full offline behavior depends on having opened the app before.

Policy data is cached after use, not ordinary-map precached. Offline policy analysis needs a prior successful visit to that mode; external tiles are not cached. Ordinary data updates require cache-version management. Test production behavior with `npm run test:policy-preview` after building.

## Policy weights instead of an unexplained composite score

Decision: retain transport-only Mode A and add independently selected Mode B with fixed-category-denominator gain, editable versioned weights, category contributions and same-input sensitivity.

Why: raw bus counts can overwhelm smaller categories. Category normalization makes the chosen priorities explicit, not objectively correct. Missing tourism/commercial geometry remains unavailable without redistributing weights; raw gains and weighted gains have different units.

Tradeoff: a small category can have substantial influence, and a greedy heuristic is not a global optimality guarantee. Before operational use, review completeness, priorities, canonical identities, walking access and field constraints. With reliable usage and collection-cost data, evaluate a demand/cost model separately rather than relabelling these reference entities as people. See [methodology](bin-policy-v1.2-methodology.md).

## Evidence before automatic data adoption

Decision: retain raw bytes, hashes, distinct dates, reconciliation and separate read-only monitoring/review-controlled publication.

Why: a new download, unchanged hash or successful technical validation does not prove present-day service validity or authorize adopting a source. The 2021 bus baseline stays explicit while a newer source is compared independently.

Tradeoff: human review costs time and can delay freshness. Expand automation only when source identity, exclusions, approval responsibilities and rollback evidence remain auditable. The blocked tourism source is still a real monitor failure, not a successful empty dataset.
