# Tradeoff Decisions

## Static App Instead Of Backend

Decision: keep all facility data as static JSON under `public/data/`.

Why: the datasets are public, small enough for client-side filtering, and read-only for this product. Static hosting reduces operational cost, avoids API keys, and makes Vercel/GitHub Pages deployment straightforward.

Rejected: a backend API or CMS. It would add hosting, authentication, and maintenance burden without solving a current user problem.

## Generic Facility Model

Decision: refactor from a bin-only model to `Facility` with explicit `type`.

Why: pedestrian garbage bins, dog-waste bag boxes, and public toilets have different meanings and source columns. A typed model keeps labels, warnings, filters, and popups accurate without duplicating the whole app.

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

Why: the combined dataset is 3,256 records, which is too cluttered for unclustered mobile markers. A marker cap avoids adding a clustering dependency while still letting search, filters, and nearby lookup reveal precise markers.

Tradeoff: users do not see all markers by default. If the product needs low-zoom all-marker browsing, marker clustering is the next upgrade.

## Limited Default List Rendering

Decision: render the first 80 list items by default and show a notice encouraging search/filter.

Why: rendering all 3,256 rows is not useful for scanning. Users looking for a specific facility are better served by search, district filters, facility type filters, toilet filters, or nearby lookup.

Tradeoff: users do not see every row in the list at once, but the map still shows all matching facilities and the count remains visible.

## Service Worker Strategy

Decision: use network-first for navigations/app shell and cache-first for stable static assets/data.

Why: a cache-first app shell can keep users stuck on an old deployment. Network-first keeps deploys fresh while still preserving offline fallback.

Tradeoff: first navigation prefers the network, so full offline behavior depends on having opened the app before.
