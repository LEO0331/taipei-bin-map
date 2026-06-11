# Taipei Pedestrian Garbage Bin Map

Mobile-first public web app for finding pedestrian-use public garbage bins in Taipei.

## Features

- Traditional Chinese UI by default, with English toggle persisted in `localStorage`.
- Leaflet + OpenStreetMap map, no Google Maps API key required.
- Local static bin data loaded from `public/data/bins.json`.
- Address keyword search, Taipei district filter, and nearest-bin lookup using browser geolocation.
- PWA-ready manifest and service worker that cache the app shell plus local JSON data.

## Install

```bash
npm install
```

## Convert CSV Data

The source CSV is Big5/CP950 encoded. The converter decodes it, drops empty or invalid-coordinate rows, ignores `Unnamed: 5`, converts coordinates to numbers, and writes normalized records.

```bash
npm run convert:bins
```

By default this reads:

```text
/Users/Leo/Downloads/●行人專用清潔箱總表.csv
```

and writes:

```text
public/data/bins.json
```

You can also pass explicit paths:

```bash
npm run convert:bins -- /path/to/source.csv public/data/bins.json
```

## Development

```bash
npm run dev
```

Open the URL printed by Vite. The app loads data locally and does not require a backend.

## Tests

```bash
npm test
```

## Production Build

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## PWA and Mobile Notes

The app includes `public/manifest.webmanifest`, a placeholder SVG icon, and `public/service-worker.js`. The service worker caches the app shell and local bin JSON after a production build is opened. OpenStreetMap tiles are network resources and may not be fully available offline.

## Data Notice

The app displays Taipei pedestrian-use public garbage bins. Household garbage is strictly prohibited and violators may be fined NT$6,000. Actual locations should be verified on site.
