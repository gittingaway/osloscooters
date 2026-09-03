# Oslo Scooters

A small, installable, mobile-first web app that shows nearby available Voi, Bolt, and Ryde e-scooters in Oslo — in one place, on one map.

It exists to answer one question in a few seconds: **is there a scooter near me right now?**

<!-- TODO: add a deployed URL once hosted, e.g.: -->
<!-- **Live app:** https://your-deployment.pages.dev -->

## Features

- Shows Voi, Bolt, and Ryde scooters within 300 metres of a location.
- Exact Norwegian address search, or browser geolocation for "current location".
- Interactive map (Leaflet + CARTO Voyager tiles) with clustering while zoomed out.
- Provider-coloured markers showing battery percentage when the feed supplies it.
- Swipeable bottom drawer with provider, distance, battery, and a deep link into the provider's app.
- Filter by provider: All, Voi, Bolt, Ryde.
- Automatic refresh every 60 seconds while the tab is visible, paused while hidden.
- Graceful degradation: one provider failing does not take down the others.
- Installable as a Progressive Web App on mobile and desktop.

## Tech stack

React 19, TypeScript, Vite, Leaflet / react-leaflet, and [Entur's GBFS 3.0](https://developer.entur.org/pages-mobility-docs-mobility-gbfs) shared mobility feeds. No backend, no database, no accounts.

## Run locally

Requirements: a current Node.js release and npm.

```sh
npm install
npm run dev
```

Set `VITE_ENTUR_CLIENT_NAME` to a unique `<company>-<application>` identifier for deployed environments. It must be lowercase and contain no spaces. The local development fallback is `jonatan-e_scooter`.

Browser geolocation works on `localhost`. Testing from another device normally requires serving the app over HTTPS.

The app always asks before requesting location: it shows an in-app explainer with an **Enable location** button first, and only triggers the browser's permission prompt when that button is clicked. Use the search bar's GPS button or the address input to switch between current location and a searched address at any time.

Voi, Bolt, and Ryde scooters are unavailable overnight (23:00-05:00 Oslo time), and the map shows a blurred "Closed for the night" overlay during that window. To keep developing/looking at the map without that overlay regardless of the real time, start the dev server with:

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

The production build is installable:

- A web app manifest and generated icon set (192/512, maskable, Apple touch icon) are wired up via [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/) in `vite.config.ts`.
- A generated service worker precaches the app shell so the UI itself loads instantly on repeat visits. Scooter availability always requires a live network request — this is intentionally not an offline data cache.
- `npm run build && npm run preview` serves the production build locally so install prompts and the service worker can be tested (`vite dev` does not register a production service worker by default).

Icon sources live in `assets-source/pwa-icons/` (a solid-background version for regular icons, and a padded version for Android's maskable safe zone). Regenerate the PNGs in `public/` with:

```sh
node assets-source/pwa-icons/generate.mjs
```

## Data flow

The app discovers each provider's `vehicle_status` feed through Entur and sends an `ET-Client-Name` header on every request. `src/services/entur.ts` converts GBFS responses into a shared `Scooter` model and keeps provider failures independent. Reserved, disabled, and malformed vehicles are removed before the UI receives the data.

Voi, Bolt, and Ryde are fetched concurrently with `Promise.allSettled`. A failed provider produces a warning while the other providers remain usable. Availability refreshes every 60 seconds while the page is visible and refreshes immediately after returning to stale data. Overlapping manual, polling, and visibility-triggered refreshes share the active request instead of issuing duplicate Entur calls. Responses with status 429 pause all refresh triggers until `Retry-After` or `Rate-Limit-Expiry-Time`; when neither header is present, the app waits 60 seconds.

## Browser access

Entur and Geonorge (for address search) are called directly from the browser. Confirm the production origin is accepted by their CORS policies before deployment. If it is not, add a minimal proxy for the selected hosting provider rather than introducing a general backend.

## Deployment

The app is a static Vite build and can be hosted on Cloudflare Pages using:

- Build command: `npm run build`
- Output directory: `dist`
- Recommended Node.js version: 22
- Build variable: `VITE_ENTUR_CLIENT_NAME=<company>-<application>`

HTTPS is required for browser geolocation outside `localhost`, and for the service worker to register.

## Privacy

Location stays in browser memory and is only used to calculate local distances. The app does not persist coordinates, keep location history, use analytics, or require an account. `VITE_ENTUR_CLIENT_NAME` is a public identifier compiled into the client bundle, not a secret.

## Known limitations

- Ryde currently provides `current_range_meters` but no battery percentage in its Entur vehicle feed, so Ryde markers show `--` and the drawer says "Battery unavailable".
- Provider reservation, payment, and unlocking remain inside the provider apps — this app only helps you find a scooter.
- Saved Home/Work locations are not implemented yet.

## Real-device checklist

- Grant and deny location permission, then verify retry behavior.
- Confirm Voi, Bolt, and Ryde vehicles appear together within 300 m.
- Compare the closest vehicles and distances with the provider apps.
- Verify All, Voi, Bolt, and Ryde filters update the map together.
- Tap map markers and inspect provider, distance, and app action in the drawer.
- Refresh manually and confirm the last-updated status advances.
- Leave the page hidden for more than 60 seconds and confirm it refreshes on return.
- Simulate one unavailable provider and confirm the other remains usable.
- Install the app to the home screen and confirm it opens standalone, without browser chrome.
- Check narrow-screen text wrapping, touch controls, map gestures, and scrolling.
