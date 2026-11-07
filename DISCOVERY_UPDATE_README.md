# Root.esp — v1.8 discovery / game / onboarding update

This ZIP contains an implementation in the **existing** Expo / React Native frontend and Node / Express / SQL Server backend. It is a prototype, not a claim that the app was deployed to a physical device.

## What changed

- **Game safety:** prominent welcome warning, a required acknowledgement **before** the new four-step game tutorial and story intro, and an additional reminder during the intro. Game water is **virtual only**. No game action calls a watering API or drives a physical pump. The in-game tutorial is replayable and independent of the registration `Finally!` alert.
- **Onboarding:** a new introductory slide explains physical device linking. Selecting **Set up a device after signing in** remembers the user's choice, then sends the signed-in user to the existing Devices screen. Device registration and physical linking cannot happen before the account exists. Skipping the intro remains possible.
- **Root.esp promotion prototype:** local promotional cards appear on Home and the game welcome if the account has no **active Root.esp device attached to a plant**. They link to the existing Devices page. There are no external advertisements, marketing APIs, trackers, payments, or third-party content.
- **Discover:** replaces the *visible* Community tab. Take/select a photo, confirm it, optionally request AI identification with explicit opt-in, or enter/correct the species manually. Private Nature Journal, NatureDex, optional daily/weekly prompts, achievements, Nature Points, and game cosmetics are included. The new notification categories show discoveries/achievements; historical community notices are hidden but not deleted.
- **Offline:** a per-account observation queue and journal metadata cache keep manual discoveries during network outages, with later sync. Small images are retained as **local thumbnails**, never automatically uploaded to the server. The user sees a warning if a large image cannot be persisted. Only metadata, notes, names, confirmation, and confidence are saved in SQL Server; an actual photo is sent externally **only if the user explicitly agrees to AI identification**.
- **Preservation:** existing user accounts, plants, IoT monitoring/watering operations, device replacement, settings, and historical Community data are left untouched. New discovery tables are additive.

## Run in demo/mock mode (no backend or hardware needed)

From the ZIP's `Root.esp-main/Frontend` directory:

```powershell
npm.cmd ci
$env:EXPO_PUBLIC_USE_MOCK='true'
npx.cmd expo start --web
```

The same app can be started on Android using Expo with compatible SDK tooling. The demo includes simulated monitoring/watering and **does not water physical plants**. Camera access depends on browser/device permissions and support. If the browser is not running on a secure origin, camera access may be unavailable; choose an existing image instead.

## Enable real backend discovery

1. Create the original SQL Server schema from `Backend/Database/database.sql` if it does not exist, then apply existing project migrations in the project's documented order. Back up an existing database first.
2. Execute `Backend/Database/migrate-nature-discovery.sql` against the same database. The migration is additive and uses idempotent guards for its schema/tables; it does not remove existing community records.
3. Configure `Backend/Database_interface/.env` using its `.env.example` without committing secrets. Optional: `PLANTNET_API_KEY=...` enables server-side Pl@ntNet species suggestions. Do not put this key in Expo or browser code.
4. Start the Node backend from `Backend/Database_interface` (`npm ci`, then the existing run command; see `README.md`). Configure the frontend `EXPO_PUBLIC_USE_MOCK=false` and `EXPO_PUBLIC_API_URL` to point to the correct **reachable** backend URL, and restart Expo.
5. In the app, sign in, open **Discover**, take/select a photo, use manual identification or deliberately consent to Pl@ntNet, and confirm to save. New users may choose device setup during intro; hardware linking occurs **after login** through Devices.

The backend uses a protected `/api/discovery` route and an optional `/api/discovery/identify` route. The metadata write is transactional and idempotent per `(UserID, ClientID)`, preventing repeat awards when a request is retried.

## Tests and what they establish

From `Root.esp-main`:

```powershell
node tests/run-all.js
```

The offline suite checks gameplay logic, user/device ownership and watering route simulations, frontend module behavior, sources/assets, notification state, caching, and discovery data-model rules. `tests/nature-test.cjs` checks the new integration contracts and optionally parses JSX source when TypeScript is available.

**Not proven by those tests:** Android camera permissions, Expo web bundling, browser layout, a running SQL Server/migration, real MQTT/ESP32 communication, live pump operation, or external Pl@ntNet responses. These require the corresponding deployed systems and manual integration checks. Never infer that an ESP32 waters plants because the game shows water.

## Prototype limitations / privacy notes

- The optional AI needs a valid Pl@ntNet key and network access; in demo mode or without the key, manual entry works. Identification is probabilistic and must be user-confirmed.
- NatureDex taxonomy is user-supplied and is not botanically verified. Progress and cosmetics are intended for low-stakes participation, not rankings or competitive streaks.
- The local journal's photos are kept in device/browser storage, which is **not end-to-end encrypted** by this prototype. Browser storage limits can prevent photo persistence; keep backups. The photos do not automatically synchronize to a new device. Avoid storing sensitive location information in notes.
- Offline discoveries are provisional until synchronized with the backend. Nature Points cannot be redeemed for goods or services; promotions are illustrative only.
- Community has been removed from visible navigation, while historical records remain for safe migration/retention. A finished production release still needs a defined export/deletion workflow and retention policy; those have **not** been implemented here.
- No geolocation or route tracking is enabled by Discover. Never touch, taste, pick, or disturb an unfamiliar plant.

## Main modified paths

`Frontend/App.js`, `Frontend/src/Intro.js`, `Frontend/src/screens/GameScreen.js`, `Frontend/src/screens/DiscoverScreen.js`, `Frontend/src/RootPromo.js`, `Frontend/src/naturePhotos.js`, `Frontend/src/natureQueue.js`, `Frontend/src/discoveryModel.cjs`, `Frontend/src/api.js`, `Backend/Database_interface/discovery_routes.js`, and `Backend/Database/migrate-nature-discovery.sql`.
