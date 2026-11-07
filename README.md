> **v2.5:** fair kids badges, kids music, uncropped design gallery, optional questionnaire in Design, transitions + loading page, link-a-device prompt with Root.esp prototype ads, APK build. See [CHANGES_v2.5.md](CHANGES_v2.5.md) and [Frontend/BUILD_APK.md](Frontend/BUILD_APK.md). Run `npm install` in Frontend once.

> **v2.3:** spotlight tours, demo designs, 8 colour themes, AI assistant tab, kids accounts and a kids interface. See [CHANGES_v2.3.md](CHANGES_v2.3.md). Run `Backend/Database/migrate-kids-accounts.sql` on existing databases.

> **v1.6 Phase 2:** Theme rebuild, account-scoped signatures, shared sound settings, contextual tours. See [PHASE2_REPORT.md](PHASE2_REPORT.md).
> v1.3 UI update: see CHANGES_v1.3.md (new navigation, community, custom plants, switch account).
> Updated repair: read TEST_REPORT.md first for current tests, migration steps and remaining limitations.

# Root.esp — Smart plant care / micro-greenhouse

Root.esp combines a React Native/Expo plant dashboard, a Node.js API for Microsoft SQL Server, and an ESP32 micro-greenhouse prototype. The app can be explored with mock sensor data, independent of SQL Server and hardware.

## Project layout

```text
Root.esp-main/
├── Frontend/                        ONE Expo app (merged Front1 + Front2)
│   ├── App.js
│   ├── src/
│   │   ├── screens/                9 app screens
│   │   ├── api.js                  real + mock data integration
│   │   └── ...
│   ├── package.json
│   ├── package-lock.json
│   └── .env.example
├── Backend/
│   ├── Database/database.sql       SQL Server schema (UTF-16)
│   ├── Database/optional-unique-device-index.sql
│   └── Database_interface/         Node.js API + .env.example
├── ESP32 local code/SeraSmart/      local sensors + optional secure sync
├── 3D model/                       printable enclosure models
├── Graphics & Presentations/
└── tests/check-project.js          offline smoke tests
```

## Start the frontend demo (Windows PowerShell)

```powershell
cd Frontend
Copy-Item .env.example .env
npm.cmd install
npm.cmd run check
npm.cmd run web
```

Mock login: `user@sera.app` or `admin@sera.app`; the exact password `demopassword`. The frontend ships with mock mode enabled, so SQL Server/ESP32 are not needed for the demo. Read [Frontend/README.md](Frontend/README.md) for real database setup and API configuration.

## What was merged and repaired

- Front1 and Front2 combined into one **Frontend** app (Front2 was the functional superset). No duplicate app or broken Front1 imports remain.
- Expo SDK and React Native versions aligned to Expo 52 + React Native 0.76.9 using the existing compatible lockfile.
- Chat uses the same authenticated backend API configuration as the other screens; no hardcoded LAN IP. Backend has a basic care-helper endpoint (not generative AI).
- Configurable browser CORS for the Expo web app; real backend API retains JWT and plant ownership checks.
- Device watering commands now use the SQL schema's permitted command type `Water` (the previous `WaterNow` violated its CHECK constraint).
- Optional unique-device index relocated to `Backend/Database/`.
- Offline tests exercise frontend imports/config, mock user flows, request authentication and API URL routing.

## Verification and limits

Some earlier releases had clean web exports, API contract probes, browser flows and ESP32 board builds; those results do not establish that the current ZIP has passed the same checks. For the **current package (1 November 2026)**, see FINAL_VERIFICATION_2026-11-01.md for exactly what was rerun and what remains unverified. Live SQL Server integration and physical ESP32/TLS/calibration tests remain necessary. Frontend dependency alerts require a compatible SDK migration. A queued command is not proof of completed watering.

### Safety note (device commands)
Device sync requires opt-in HTTPS and a private per-device key. Run `Backend/Database/migrate-device-auth.sql` when updating an existing database, and see `ESP32 local code/SeraSmart/README.md`. The ESP32 firmware leaves remote pump control off unless explicitly enabled after hardware calibration. A queued watering request is **not** proof the pump ran.

### Running the extended checks
On systems with Node.js: `node tests/check-project.js`, `node tests/edge-test.js`, `node tests/route-test.js`, `node tests/device-routes-test.js` and `node tests/db-transactions-test.js`. On Linux/macOS with g++, `bash tests/check-firmware-offline.sh` verifies the local firmware branch with simulated Arduino headers (not a board build). The verified results are recorded in `TEST_REPORT.md`.

### 3D model units
The original STL files have no embedded unit metadata; some coordinates appear consistent with meters. Verify expected **millimetre** dimensions in your slicer before printing. Models were deliberately left unchanged.
