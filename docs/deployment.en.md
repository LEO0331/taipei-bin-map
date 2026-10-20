# Static Deployment Guide

[English](deployment.en.md) | [繁體中文](deployment.zh-Hant.md)

Reviewed 2026-10-20. A merged PR is not evidence of a successful hosting deployment.

## Vercel setup

Import the GitHub repository with root `./`, framework `Vite`, install `npm ci`, build `npm run build`, output `dist`. No app environment variables, API keys or backend are required. Use a Node version supported by `package.json` (`^20.19.0 || >=22.12.0`). Check the actual hosting deployment and intended commit before promoting.

## Release checks

```bash
npm ci
npm test
npm run build
npm run test:e2e -- --workers=2
npm run test:policy-preview
npm run test:shade-preview
npm run test:shade-base
git diff --check
```

`test:policy-preview` requires the production build and starts its own preview server. E2E starts its own strict-port Vite server; if 5173 is occupied, set `PLAYWRIGHT_PORT` (PowerShell: `$env:PLAYWRIGHT_PORT='5175'`). `bash ./init.sh` wraps tests, build and E2E; it does not include the separate preview checks.

Do not regenerate datasets merely to deploy. Data conversion changes retained outputs/dates; use the source-specific converter and review procedure only for an intentional refresh. Policy adoption requires separate approval. Never treat a failed source monitor as permission to publish replacement data.

## Hosting paths and metadata

Hash routes such as `/#/bin-policy` need no server-side route handlers. However, runtime paths and service-worker registration are root-absolute. Vercel/Netlify root hosting is straightforward; a GitHub Pages project subpath needs an explicit base/path/service-worker audit before support can be claimed. Setting Vite's base alone does not fix all root-absolute fetches.

Configure canonical URL, `og:url` and any sitemap only for the verified production domain; they are not currently present in `index.html`.

## Cache, offline and blank-page diagnosis

The production-only worker uses network-first for navigation, hashed assets, Bin Policy JSON and Shade Equity JSON, and cache-first for ordinary datasets, icons and manifest. Research files are cached after a successful visit to the relevant mode/scope, not precached with the main map. External OpenStreetMap tiles are not worker-cached and may be unavailable offline. A first visit offline cannot be promised to work. The Shade base-path test covers that module's data loading, not migration of all existing root-absolute paths.

When ordinary cached data or the precache set changes, review the worker cache version. Activation removes older named caches; controller changes trigger at most one automatic reload per browser session. Verify an existing-browser-session upgrade as well as a clean load; preview offline tests do not prove every cross-deployment update path.

For a blank page, inspect the browser console and asset/data HTTP responses before guessing a tile failure. Check the deployed commit, HTML/chunk compatibility, root paths and worker registration/cache state. An empty map with a visible UI is different from an application render failure. Clearing site data is a diagnostic step that removes local preferences/offline data, not the permanent fix.

## Operational limits

Smoke-test all intended routes, both languages and narrow layouts on the actual preview URL. Check policy source/method/weight versions and date disclosures. Source monitoring still fails on new outages or integrity errors; the exact previously audited/excluded Travel403 is a visible research warning, not successful source recovery. Local test success does not establish cloud workflow permissions, source recovery or site suitability. See [current handoff](../session-handoff.md) and [governance](bin-policy-v1.2-governance.md).
