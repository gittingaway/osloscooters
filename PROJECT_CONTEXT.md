# Project Context

This project was built as a personal, mobile-first map for finding available shared e-scooters near a location in Oslo. The primary workflow is intentionally map-only: the map fills the entire screen, a floating address/provider HUD sits on top of it, tapping a scooter opens a bottom drawer, and the drawer links out to the scooter's provider app.

## Current Product

- Shows Voi, Bolt, and Ryde scooters within 300 metres of a location.
- The map is full-bleed (fills the whole viewport). There is no header or app logo — all controls float directly over the map as a borderless, shadowed HUD.
- Location is opt-in with an explainer: the app never calls the browser's native geolocation prompt on load. It shows an in-app "Find scooters near you" card with an **Enable location** button first; only clicking it triggers the real permission prompt. If permission is denied, the same button lets the user retry, and the address search bar is always available as a fallback regardless of location state.
- Address search is a permanent rounded pill input (not a toggle-to-expand control) docked at the top of the HUD. A large circular GPS icon button sits inside its left edge: outlined normally, filled solid with the brand color while GPS/current-location is the active source, and reverts to outline the moment the user picks a searched address. Typing shows a live suggestions dropdown (debounced, minimum 3 characters, via Geonorge) without changing the input's own size; selecting a suggestion clears the text back to empty.
- The provider filter (All / Voi / Bolt / Ryde) sits on its own row directly below the address bar, always stacked (never side-by-side, at any screen width).
- Refresh is a standalone floating control pinned to the bottom-right corner of the screen: a small pill showing "Updated X sec ago" sits above a circular refresh button.
- Uses CARTO Voyager map tiles through Leaflet with clustering while zoomed out, revealing individual markers when zoomed in.
- Shows battery percentage inside provider-coloured markers when supplied by GBFS.
- The map only recenters when the location itself changes (new address chosen, or a fresh GPS fix) or when a scooter is explicitly selected. It intentionally does **not** recenter on a data refresh (poll tick) or when changing the provider filter — this was a fixed bug where the map used to jump back to the user's blue dot on every 60-second refresh.
- Opens a swipeable bottom drawer with provider, distance, battery, and a provider-app deep link when tapping a scooter marker.
- A toast reports provider failures (e.g. a 429) without blocking the rest of the app.
- Outside Oslo's scooter operating hours (23:00–05:00, computed in the `Europe/Oslo` timezone via `Intl.DateTimeFormat`, DST-aware), the map is shown blurred with a "Closed for the night" overlay instead of an unexplained empty result set. This is a real, ongoing scheduled closure for Voi/Bolt/Ryde, not a provider outage.
- Uses a plain, flat-gray full-map skeleton while the first scooter request is loading (no road/dot decorations — just gray, with a gray placeholder in the zoom-control's usual position).
- Installable as a Progressive Web App: manifest + generated icon set (192/512, maskable, Apple touch icon) + a service worker that precaches the app shell only (scooter data always requires a live network request, by design).

## Data And API Decisions

Scooter availability comes from Entur's GBFS 3.0 Mobility feeds. Each provider is fetched independently so one unavailable provider does not prevent the others from working. Reserved, disabled, and malformed vehicles are removed before distance filtering.

All Entur requests include `ET-Client-Name`. Set `VITE_ENTUR_CLIENT_NAME` to a unique lowercase `<company>-<application>` value in deployed environments. The local fallback is `jonatan-e_scooter`.

The app polls once every 60 seconds while visible, stops polling while hidden, and deduplicates concurrent refreshes. A 429 response pauses manual and automatic refreshes until `Retry-After` or `Rate-Limit-Expiry-Time`. If Entur supplies neither header, the app waits 60 seconds.

Address search uses Geonorge's address API (`ws.geonorge.no/adresser/v1/sok`) via `searchAddresses()` in `src/services/geocoding.ts`, returning up to 5 fuzzy-matched candidates per query for the type-ahead dropdown (minimum 3 characters, 250ms debounce).

## Known Limitations

- Ryde currently provides `current_range_meters` but no battery percentage in its Entur vehicle feed. Ryde markers therefore show `--`, and the drawer says `Battery unavailable`.
- Entur and Geonorge are called directly from the browser. Production deployment depends on their CORS policies continuing to allow the deployed origin.
- Provider reservation, payment, and unlocking remain inside the provider applications.
- Does not persist locations (no Home/Work saved locations yet) or scooter data between sessions.
- Dismissing the provider-failure toast hides the warning entirely until the failure set changes again — there is no longer a persistent secondary status indicator repeating it, since the header (which used to show it) was removed.

## PWA

- `vite-plugin-pwa` is configured in `vite.config.ts` with a manifest (name, icons, `standalone` display, theme colors) and an auto-generated service worker (`registerType: 'autoUpdate'`) that precaches only the app shell.
- Icon sources (a solid-background version for regular icons, a padded version for Android's maskable safe zone) live in `assets-source/pwa-icons/`, generated from the brand mark. Regenerate the PNGs in `public/` with:
  ```sh
  node assets-source/pwa-icons/generate.mjs
  ```
- `npm run build && npm run preview` serves a real production build so the install prompt and service worker can be tested (`vite dev` does not register a production service worker).

## Local Workflow

```sh
npm install
npm run dev
```

Quality checks:

```sh
npm test
npm run lint
npm run build
```

## Deployment

The application is a static Vite build and can be hosted on Cloudflare Pages using:

- Build command: `npm run build`
- Output directory: `dist`
- Recommended Node.js version: 22
- Build variable: `VITE_ENTUR_CLIENT_NAME=<company>-<application>`

HTTPS is required for browser geolocation outside localhost, and for the service worker to register. `VITE_ENTUR_CLIENT_NAME` is a public identifier compiled into the client bundle, not a secret.

## Recent Session Notes

The most recent working session made these changes, roughly in order:

1. **Removed the hardcoded dev-mode default location** (previously always started at Waldemar Thranes gate 1A in development, bypassing geolocation).
2. **Added an opt-in location flow**: `useLocation` now exposes a `prompt` status and only calls `getCurrentPosition` when a `request()` function is explicitly invoked, so the native browser permission dialog never appears unannounced.
3. **Fixed a map-recentering bug**: the map used to jump back to the user's location on every 60-second poll and on every provider-filter change. `ScooterMap`'s viewport effect now keys off primitive `location.latitude`/`location.longitude` instead of object/array identity, and scooter-selection recentering is a separate effect from location recentering.
4. **Added an overnight closure overlay**: `src/utils/operatingHours.ts` computes whether it's currently outside 23:00–05:00 in the `Europe/Oslo` timezone; `src/hooks/useOperatingHours.ts` polls this every 60s; the map blurs with a "Closed for the night" message during that window, since all three providers actually park their fleets then (this was initially mistaken for a Voi-specific bug during testing).
5. **Rebuilt address search from scratch** twice: first from a toggle-button-that-expands-into-a-form into a proper type-ahead (`searchAddresses` replacing the old single-result `geocodeAddress`), then again into a permanent rounded input with an embedded GPS icon button (outlined/filled to reflect whether GPS or a searched address is the active location source).
6. **Removed the app header/logo entirely** and moved to a full-bleed, edge-to-edge map with a floating, borderless (shadow-only) HUD: address search + provider filter stacked at the top, and a standalone "seconds since update" + refresh button pinned to the bottom-right corner.
7. **Simplified the loading skeleton** to a flat gray block (removed the animated road/marker placeholder shapes), keeping just a gray placeholder where the zoom control sits.
8. Added PWA installability (manifest, service worker, icon set) and general repo polish (LICENSE decision: none; README rewrite; removed unused scaffold assets; fixed a transitive `sharp` CVE via a `package.json` override) in an earlier part of the same session, before the UI work above.

All changes are covered by the existing Vitest suite (51 tests passing as of this writing), `eslint`, `tsc -b`, and a production build — all verified clean after each change. Browser-based visual verification (Chrome automation) was declined this session, so the rendered layout has not been screenshot-checked; a manual look via `npm run dev` is recommended before treating the HUD spacing/sizing as final.
