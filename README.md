# Oslo Scooters

A small, installable, mobile-first map showing nearby available Voi, Bolt, and Ryde e-scooters in Oslo, so you can check before you leave without opening three apps.

**Live app:** https://gittingaway.github.io/osloscooters/

## Features

- Full-bleed map with a floating HUD (address search, provider filter, refresh) — no header competing with the map.
- Opt-in location: asks in-app before triggering the browser's permission prompt, with address search as a fallback.
- Battery-gauge markers (fill height = charge, provider colour); Ryde shows a full marker since it has no battery data, just range.
- Swipeable, drag-to-dismiss bottom drawer with provider, distance, battery/range, and a deep link into the provider's app.
- Filter by provider, auto-refresh every 60s while visible, and a "closed for the night" overlay during Oslo's 23:00-05:00 scooter downtime.
- One provider failing doesn't take down the others. Installable as a PWA.

## Tech stack

React 19, TypeScript, Vite, Leaflet, [Entur's GBFS 3.0](https://developer.entur.org/pages-mobility-docs-mobility-gbfs). No backend, no database, no accounts.

## Run locally

```sh
npm install
npm run dev
```

Set `VITE_ENTUR_CLIENT_NAME` to a unique lowercase `<company>-<application>` identifier for deployed environments (falls back to `jonatan-e_scooter` locally). Geolocation needs `localhost` or HTTPS.

To skip the overnight closure overlay while developing, regardless of the real time:

```sh
VITE_DISABLE_CLOSURE_OVERLAY=true npm run dev
```

## Checks

```sh
npm test        # vitest
npm run lint    # eslint
npm run build   # typecheck + production build
```

## Progressive Web App

`vite-plugin-pwa` (in `vite.config.ts`) generates the manifest, icons, and a service worker that precaches the app shell only — scooter data always needs a live request. Test installability with `npm run build && npm run preview` (`vite dev` doesn't register a production service worker).

Icon sources live in `assets-source/pwa-icons/`; regenerate with `node assets-source/pwa-icons/generate.mjs`.

## Data flow

`src/services/entur.ts` fetches Voi, Bolt, and Ryde concurrently, normalizes GBFS responses into a shared `Scooter` model, and keeps provider failures independent. A 429 pauses all refreshes until `Retry-After` (or 60s if absent).

## Deployment

Static Vite build, deployable anywhere. Cloudflare Pages: build command `npm run build`, output `dist`, Node 22, env var `VITE_ENTUR_CLIENT_NAME`.

GitHub Pages: `.github/workflows/deploy-pages.yml` deploys on push to `main` (enable once via **Settings → Pages → Source: GitHub Actions**). It builds with `VITE_BASE_PATH=/osloscooters/` for the project subpath — update that if the repo is renamed, or drop it for a custom domain.

Entur and Geonorge are called directly from the browser; confirm their CORS policies accept your deployed origin.

## Privacy

Location stays in browser memory, used only for distance calculations. No history, analytics, or accounts. `VITE_ENTUR_CLIENT_NAME` is public, not a secret.

## Known limitations

- Ryde reports range but not battery percentage.
- Reservation, payment, and unlocking happen in the provider apps.
- No saved Home/Work locations yet.
