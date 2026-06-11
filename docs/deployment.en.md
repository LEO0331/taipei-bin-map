# Vercel Deployment Guide

## Recommended Path

Deploy this project as a Vite static frontend on Vercel.

1. Push the repository to GitHub.
2. In Vercel, choose **Add New Project**.
3. Import the GitHub repository.
4. Use these project settings:
   - Framework Preset: `Vite`
   - Root Directory: `./`
   - Install Command: `npm ci`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Environment Variables: none
5. Deploy the preview.
6. Open the preview URL on desktop and phone.
7. Run Lighthouse against the Vercel preview URL before promoting to production.

## Pre-Publish Checks

```bash
npm ci
npm run convert:bins
./init.sh
```

The app has no API keys and no backend. It loads `public/data/bins.json` and `public/data/bins.metadata.json` as static assets.

## Production URL Metadata

After the final Vercel production URL is known, add:

- canonical URL
- `og:url`
- optional sitemap using the real production URL

Do not hard-code a guessed Vercel URL before the project has its final domain.

## Offline Behavior

The service worker caches the app shell, PWA icons, and local bin JSON. OpenStreetMap tiles are external network resources and may be incomplete offline.
