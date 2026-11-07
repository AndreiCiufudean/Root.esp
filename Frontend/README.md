# Root.esp — one unified frontend (Expo / React Native)

**There is only one application:** `Frontend/`. `Front1/` and `Front2/` were merged into this folder. The current app includes the original Home, Login, Plant Detail, Chat, Admin, Menu, and Community screens plus Add Plant, Devices and Notifications, real API data models, and editable plant settings.

## Quick start on Windows (web demo without SQL Server)

Open PowerShell in the **Root.esp-main** project folder:

```powershell
cd Frontend
Copy-Item .env.example .env
npm.cmd ci
npm.cmd run check
npm.cmd run web
```

Open the URL printed by Expo (usually `http://localhost:8081`). The `.env` file starts in `EXPO_PUBLIC_USE_MOCK=true`, which uses in-memory demo data. Sign in as `user@sera.app`, `dan@sera.app` or `admin@sera.app` using the exact mock password **`demopassword`**. No backend or ESP32 is required for mock mode. In mock mode, accounts, plants and demo notifications persist locally across reloads. Clear browser/app storage to start a completely fresh demo.

**Dependencies:** Expo SDK 52, React 18.3.1, React Native 0.76.9, React Native Web 0.19.13. The package-lock is from the matching Expo 52 dependency tree. Do not mix packages from the old Front2 build. After install, you can run `npx.cmd expo install --check` to check SDK compatibility. Expo Go on a modern phone may not support SDK 52; web or a compatible development build may be needed.

## Real SQL Server mode

1. Create the SQL Server database from `Backend/Database/database.sql` (run the initial script **only on a fresh database**).
2. In `Backend/Database_interface`, copy `.env.example` to `.env`, set a strong, private `JWT_SECRET`, configure `ODBC_CONNECTION_STRING`, run `npm.cmd ci` and `npm.cmd start`.
3. Open `http://localhost:3000/` to check the backend health response.
4. In `Frontend/.env`, set:

```env
EXPO_PUBLIC_USE_MOCK=false
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

5. Restart Expo and clear transforms (stop it with Ctrl+C, then run `npm.cmd run web -- --clear`). Create a new user account or log in with a user already present in SQL Server. Demo accounts and passwords do **not** apply in real mode.

If your browser uses a different hostname or port, add its full origin to the **backend** `CORS_ORIGINS` list in `Backend/Database_interface/.env` and restart the backend. For a physical phone use your PC's LAN IP, not `localhost`, in `EXPO_PUBLIC_API_URL`; both devices must be on the same network and port 3000 must be reachable.

## Folder layout

- `App.js` — navigation, authentication, home/chat/alerts/admin/menu tabs
- `src/screens/` — all nine screens
- `src/api.js` — **one** shared API layer, including bearer-token authentication
- `src/mock.js` — in-memory data for demos without SQL Server
- `src/logic.js`, `src/theme.js`, `src/ui.js`, `src/auth.js` — shared helpers
- `.env.example` — switch between mock and real modes

## Phase 2 — themes, sound, accounts and tours

The **Me** tab now opens a single shared Settings popup with **Appearance**, **Sound**, and **Tours** sections. Game → Sound opens the same popup. Choose **Sakura** (blush/pink), **Forest** (sage), or **Sea Glass** (blue-green), each with Light, Dark, and System appearances. Sounds are optional, with separate controls for UI, game music/effects and volume.

Intro is a **short, skippable pre-login sequence**, including an optional signature. For a new session requiring login, the intro may appear again; a known active account restored in demo mode opens the app directly. When using Me → Switch account → Add another account, the intro plays before that account’s login. Pledges are now private to the active account on this device, rather than shared between users. Separate Home/Plants/Notifications/Community/Game tours open on the relevant screen and can be replayed via Me → Guided tours.

**Upgrade:** Leave app/browser storage intact. The frontend migrates the old `rootesp.prefs.v1` values into `rootesp.prefs.v2` on launch and does not delete the old key. Older saved signatures are attached **only** if the previous active demo account is identifiable; an ambiguous old signature is deliberately not shown to another account. No database migration is required for this phase (existing Phase 1 migrations still apply). No new npm dependency is required.

See [`../PHASE2_REPORT.md`](../PHASE2_REPORT.md) for the implementation checklist, actual test evidence and live-browser/SQL Server limitations.

## Known limits

- Live SQL Server integration and physical ESP32 behavior remain unverified. Both official firmware build configurations have been compiled successfully; see TEST_REPORT.md. HTTPS telemetry, device authentication, command polling and acknowledgement are implemented as **opt-in code paths**, but they are disabled by default and have not been verified on real hardware. Device commands remain queued when no device is connected.
- The chat assistant is currently a **basic rule-based care helper**, not a connected generative AI or disease diagnosis system. In mock mode it provides demo replies; in real mode it uses `/api/assistant` with the same token and URL as other API calls.
- The Community feed is static sample content; no SQL table or community API exists yet.
- Real logins use an in-memory JWT; logging out or restarting the app requires signing in again.
- Never commit `.env` files or expose SQL/JWT secrets in the frontend.

## Device HTTPS provisioning (optional, advanced)

The backend stores a SHA-256 hash of a randomly generated device key and shows the key **only once** on creation or rotation. Fresh installations get `DeviceKeyHash` from `database.sql`. For an existing database run `Backend/Database/migrate-device-auth.sql`. Apply `Backend/Database/optional-unique-device-index.sql` to ensure each device is linked to at most one plant.

Configure `ENABLE_DEVICE_API=true` and keep `DEVICE_API_REQUIRE_HTTPS=true` in the backend `.env`. Use a trusted HTTPS endpoint/proxy before sharing the device key. Copy `ESP32 local code/SeraSmart/DeviceConfig.example.h` to `DeviceConfig.h` and supply Wi-Fi, HTTPS URL, trusted certificate, DeviceID and private key. Device sync and remote watering each require a separate explicit opt-in. Details and safety constraints are in the firmware README. No working cloud endpoint or TLS cert is bundled.

## Updated data contract and settings

SQL flags are actual JSON booleans. BIGINT identifiers (commands, readings and notifications) are decimal strings; preserve them as strings. Event timestamps are ISO UTC strings; calendar-only plant dates remain dates. The settings screen validates complete numeric fields, preserves unsaved edits, reloads pristine fields and detects conflicts. Saves from this UI send an original-settings baseline, checked transactionally on the backend. Command status failures appear inline without hiding sensor readings.

Use `npm.cmd run web -- --clear` after changing EXPO_PUBLIC_USE_MOCK or EXPO_PUBLIC_API_URL to avoid cached values. Read the root TEST_REPORT.md before upgrading an existing database. Remaining frontend dependency alerts are documented there.

## Phase 3 — Little Garden (v1.7)

Open **Little Garden** from the Home card, Sidebar or Me. The old stock-photo daily game was replaced with an original illustrated room-and-sky experience. A game-only **Little Sprout** welcomes you even when you have no registered plants; each registered plant appears as its own illustrated character keyed by its real **PlantID**, with its saved name and species. You can create/rename rooms, move plants between room slots, catch virtual rain from clouds in a 20-second collection round (pointer, touch lanes or keyboard), spend game-only water to raise plant joy and polish three leaves. Nothing in the game calls the real watering endpoint or modifies monitoring settings.

Your game inventory, plant positions, virtual growth, and source snapshots are stored **locally per signed-in account**; there is no cloud sync of game progress. Offline browser reloads require a **production** build and successful first precache using `public/sw.js`; development web mode does not register the service worker. Build with `npx.cmd expo export --platform web` and serve `dist` using HTTPS or localhost. All Phase 3 game illustrations and synthesized SFX are bundled locally and have original attribution in `../CREDITS.md`. Reproducible artwork and sound generation scripts are provided under `tools/`.

Intro **Skip** now skips automatic tours across **all** tabs for that account, while preserving manual replay under Settings → Tours. Notifications open on **Unread**, followed by **Read** and **All**, and completed one-time actions become disabled. Desktop sidebar width is fixed at 202 px. No database migration or new npm dependency is required. Phase 2 data and old game stats are retained untouched.

See [`../PHASE3_REPORT.md`](../PHASE3_REPORT.md) for implementation details, completed checks and manual desktop/mobile/offline acceptance tests **not yet executed** due to the unavailable Expo install/runtime in this environment.
