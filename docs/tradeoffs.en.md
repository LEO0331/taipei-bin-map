# Tradeoff Decisions

## Static App Instead Of Backend

Decision: keep all facility data as static JSON under `public/data/`.

Why: both datasets are public, small, and read-only for this product. Static hosting reduces operational cost, avoids API keys, and makes Vercel/GitHub Pages deployment straightforward.

Rejected: a backend API or CMS. It would add hosting, authentication, and maintenance burden without solving a current user problem.

## Generic Facility Model

Decision: refactor from a bin-only model to `Facility` with explicit `type`.

Why: pedestrian garbage bins and dog-waste bag boxes have different meanings and source columns. A typed model keeps labels, warnings, filters, and popups accurate without duplicating the whole app.

Rejected: forcing dog-waste bag boxes into the old bin model. That would risk describing them as trash bins, which is incorrect.

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

## Canvas Markers Instead Of Clustering

Decision: keep Leaflet `CircleMarker` rendering with `preferCanvas` and distinct colors/legend.

Why: about 1,700 points is still manageable, and canvas markers avoid adding a clustering dependency.

Tradeoff: dense areas can still visually overlap. If the dataset grows or field testing shows map clutter, marker clustering is the next upgrade.

## Limited Default List Rendering

Decision: render the first 80 list items by default and show a notice encouraging search/filter.

Why: rendering all 1,707 rows is not useful for scanning. Users looking for a specific facility are better served by search, district filters, facility type filters, or nearby lookup.

Tradeoff: users do not see every row in the list at once, but the map still shows all matching facilities and the count remains visible.

## Service Worker Strategy

Decision: use network-first for navigations/app shell and cache-first for stable static assets/data.

Why: a cache-first app shell can keep users stuck on an old deployment. Network-first keeps deploys fresh while still preserving offline fallback.

Tradeoff: first navigation prefers the network, so full offline behavior depends on having opened the app before.
