# Civic Explorer v4.0 — Public Amenities integration

## Scope and sources

The original map remains the default. The header's **Explore Public Services** button sits in the service-navigation row, immediately after Shade Equity and before the optional back link. It opens an optional, bilingual dialog. It starts in the HTML list, with a visual scene available as an alternative. A service title previews details; a separate native link opens the existing module. The Explorer is navigation only: no datasets, source interpretations, research gates, scoring, map filters, or deployment settings changed.

- Target `main`: [868c6df](https://github.com/LEO0331/taipei-bin-map/tree/868c6df8f12e519938a154614f179116055c08b6), identical to the researched SHA.
- Portfolio `main` at review: [dc77b28](https://github.com/LEO0331/portfolio/tree/dc77b28e103c58a2636fd06691c4ac86884ab2a4/src/components/explorer), five commits past the [research baseline](https://github.com/LEO0331/portfolio/tree/28019b32ef7ce30760f360c6d7ce7940f2ae35b6). The generic folder, API, and license were unchanged between those versions.
- The generic source is vendored in [src/components/explorer](../src/components/explorer/) with its [original MIT notice](../src/components/explorer/LICENSE). The only upstream code adjustment is an explicit list role to preserve list semantics when CSS removes list markers, as [documented by WebKit](https://bugs.webkit.org/show_bug.cgi?id=170179). No Portfolio pages or data were copied. No dependency was added.

## Navigation and ownership

| Theme | Existing destinations (hash suffixes) |
| --- | --- |
| Public Facilities & Citizen Services | `/`, `/public-school-sports-venues`, `/cooling-comfort-spots`, `/swimming-pools` |
| Environment & Resource Circulation | `/bulky-waste-collection-booking`, `/industrial-waste-reuse-operators`, `/recycling-analytics` |
| Public Health & Services | `/unused-medicine-collection-stations`, `/certified-bathhouses` |
| Policy Research & Evidence | `/bin-policy`, `/shade-equity` |

[The host adapter](../src/features/civic-explorer/) supplies a typed bilingual model, neutral descriptions, and local Explorer state. The existing hash allowlist lives in [directoryRoutes.ts](../src/directoryRoutes.ts); routing still uses `hashchange`, and the service-directory links are unchanged. The dialog does not own a route. Normal links update the hash without document reload, modified clicks retain browser behavior, and hash changes (including Back/Forward) dismiss an open Explorer. Closing without navigating keeps the underlying dashboard mounted. A real route change may still unmount the map, as it did before.

The entry uses a native modal dialog. Opening focuses the dialog heading; Escape and the persistent Close button return focus to the entry. In-tab destination activation moves focus to the shared application heading in the newly active route, not to a module-specific title. Search counts are announced politely. Topics, search, list links, and scene buttons are native controls; the SVG artwork is decorative. The lazy content has a local error boundary, so failure to load the optional chunk (for example, a first visit while offline) leaves the original navigation available.

## Verification — 2026-11-11 (Asia/Taipei)

Windows, Node 24.14.0, Vite 8.3.5, Playwright Chromium. The sandbox denied the first dependency install; `npm ci` succeeded with workspace approval, using the existing lockfile. No baseline test failures.

| Check | Untouched baseline | With Explorer |
| --- | ---: | ---: |
| `npm test` (final: `-- --maxWorkers=2`) | 505 passed | 518 passed |
| `npm run build` | Passed | Passed |
| `npm run test:e2e` (baseline: 4 workers; final: 2) | 166 passed | 223 passed; one Windows socket failure before app startup |

New browser cases cover all eleven destinations, direct/reload and Back/Forward behavior, same-route closing, modified clicks, keyboard-only scene navigation, dialog focus, untouched map DOM/pan/zoom, no extra dataset requests, bilingual controls, reduced motion, touch, and 320/390/768/1280px widths. The two new unit/component suites add model and interaction checks.

The final full browser run's single failure was the desktop Scene → List test. Its trace records `net::ERR_NO_BUFFER_SPACE` on the localhost `/src/main.tsx` request; no app interaction ran. The unchanged case passed **3/3** on a fresh port with one worker, so all 224 cases passed across the full run and targeted rerun, not in one invocation. Earlier runs at higher concurrency also hit existing governance and throttled policy timing thresholds. Those checks passed at lower concurrency without increasing any threshold or changing the tests.

Production regressions also passed: `npm run test:policy-preview` (4/4) and `npm run test:shade-preview` (2/2).

### Production assets

Sizes below are the initial Phase 2 measurements in Vite's decimal kB; gzip sizes are in parentheses. The later header-placement follow-up does not change the lazy content.

| Asset | Baseline | With Explorer |
| --- | ---: | ---: |
| Entry JS | 361.49 (97.15) | 363.83 (98.20) |
| Entry CSS | 47.26 (13.43) | 48.61 (13.68) |
| Explorer-only JS | — | 17.22 (6.73) |
| Explorer-only CSS | — | 11.27 (2.86) |

A local production preview (`npm run preview`) was checked in fresh Chromium with the service worker blocked and map tiles stubbed, to isolate the app's asset requests from cache and external network behavior. Neither Explorer asset was requested on the initial map; both loaded on opening. On a settled map, opening, selecting a service, and closing left the same Leaflet DOM node, document-relative bounds, and two initial local dataset requests. No console/page errors or unexpected layout-shift entries occurred during that interaction. Blocking the Explorer JS chunk produced the localized fallback, and Escape returned to the working map. Initial loading did show layout-shift entries; no before/after startup CLS benchmark was performed. These are local observations, not production latency measurements.

### Accessibility review checklist and limitations

The keyboard, no-trap, focus order, visible focus, language, and reflow checks use the [Taiwan Ministry of Digital Affairs Website Accessibility Guidelines (110.07)](https://accessibility.moda.gov.tw/Accessible/Guide/68) as reference. Browser checks do not constitute formal certification.

For human review with NVDA/Chrome and VoiceOver/Safari:

1. Open the dialog by keyboard; confirm the title and Close button are announced. Confirm focus stays within the open modal and Escape returns it to the entry.
2. Change a topic and search. Confirm the result count and the semantic list are announced, and every result has a distinct navigation link.
3. Open a result from the list and from the scene. Confirm the destination heading receives focus and Back returns to the prior route.
4. Repeat at 320px in both languages and with reduced motion enabled. Scroll the list and confirm Close remains available.

Dedicated assistive-technology sessions and Safari/Firefox were not run. During early browser testing, the existing delayed Leaflet `invalidateSize` callback sometimes ran after map removal (`_leaflet_pos`) during fast route changes. The effect now cancels its scheduled resize on cleanup, with a browser regression that checks for uncaught errors. No map state, rendering policy, or filtering logic changed.
