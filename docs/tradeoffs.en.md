# Tradeoff Decisions

## Static App Instead Of Backend

Decision: keep all bin data as static JSON under `public/data/`.

Why: the dataset is public, small, and read-only for this product. Static hosting reduces operational cost, avoids API keys, and makes Vercel/GitHub Pages deployment straightforward.

Rejected: a backend API or CMS. It would add hosting, authentication, and maintenance burden without solving a current user problem.

## OpenStreetMap + Leaflet Instead Of Google Maps API

Decision: use Leaflet with OpenStreetMap tiles.

Why: no API key is required, the map is good enough for public bin discovery, and it keeps the project deployable by anyone.

Rejected: Google Maps embed/API as the main map. Google Maps links are still provided for navigation, but using Google Maps as the main map would introduce key management and billing concerns.

## Client-Side Geolocation And Distance Calculation

Decision: calculate Haversine distance in the browser.

Why: the user location never needs to leave the device, and the dataset is small enough for local sorting.

Rejected: server-side nearest-bin lookup. It would add privacy and infrastructure concerns for no current benefit.

## Lazy-Loaded Map Chunk

Decision: lazy-load the Leaflet map code.

Why: Lighthouse showed high initial main-thread cost when the full map bundle loaded with the app shell. Splitting the map keeps the title, controls, and warning responsive earlier.

Tradeoff: the map has a brief loading state. This is acceptable because the search/list shell remains visible and the app stays functional.

## Limited Default List Rendering

Decision: render the first 80 list items by default and show a notice encouraging search/filter.

Why: rendering all 1,197 rows was unnecessary for scanning and hurt performance. Users looking for a specific bin are better served by search, district filters, or nearby lookup.

Tradeoff: users do not see every row in the list at once, but the map still shows all matching bins and the count remains visible.

## Service Worker Strategy

Decision: use network-first for navigations/app shell and cache-first for stable static assets/data.

Why: a cache-first app shell can keep users stuck on an old deployment. Network-first keeps deploys fresh while still preserving offline fallback.

Tradeoff: first navigation prefers the network, so full offline behavior depends on having opened the app before.
