# Root.esp — Phase 2 implementation & verification

## Scope completed in source

| Request | Implementation |
|---|---|
| Account switching / login | `Frontend/App.js`: session selection restores the selected token, clears stale alerts, resets the navigation state, and remounts the appropriate account stack using `authEpoch` and the user ID. Add-account login now occurs after the optional pre-login intro. |
| Signatures isolated by account | `src/prefs.js`: stores `pledges` under namespaced user IDs (mock vs real), with independent introduction records. `MenuScreen` only reads the current user's pledge. v1 settings are non-destructively migrated. |
| Existing welcome/alert notifications | The Phase 1 database and demo registrations keep their exact-once starter notifications. They do not recreate them on login or switching. |
| Full themes | `src/theme.js`, `Sidebar.js`, `SettingsModal.js`: Sakura (pink/blush), Forest (sage), Sea Glass (blue-green), with independent rail, background, cards, fields, dialogs, text and semantic colors for light/dark. A System option follows device mode; v1 theme names are mapped to the new palette names. |
| Dedicated shared sound | `src/sound.js`, `prefs.js`, `SettingsModal.js`: master mute, UI feedback, game music/effects, independent music/effects volumes, previews, safe optional audio playback, background pausing. The Game opens exactly this same settings popup. The original `game-loop.wav` is bundled and credited. |
| Short, interactive intro | `src/Intro.js`: three brief animated scenes, interactive flower action, Back/Next/Skip, reduced-motion support, optional pledge and login flow. |
| Contextual tours | `src/Tour.js`, `tourDefinitions.js`, five screens: anchored live-component spotlights, Next/Back/Skip, first-visit completion per account and tab, delayed target retry, scrolling attempts, mobile/desktop sizing and replay from Settings. Handles empty plant/notification/feed states. |
| Real device safety | The game remains a self-contained simulation (`recordGame`, local scores only). No game path calls `api.waterNow`, changes readings or saves physical care settings. Existing device controls outside the game are not changed. |

## Test results: what was actually executed

- `node tests/run-all.js`: **PASS**. Includes project structure, offline mock account/device/plant/notification flows, backend/firmware simulation, Phase 1 and the new Phase 2 checks. Detailed records are in `verification/phase2-offline-tests.log`.
- `node tests/phase2-test.cjs`: **30/30 PASS** — all six light/dark theme palettes, distinct rails, simulated sound mute/UI/game channels/music pause, and source contracts for account isolation and five actual anchor integrations. The sound test uses a fake `expo-av` implementation and is **not** a device audio playback test.
- Frontend JS/JSX syntax: **0 parse errors** using TypeScript's parser available in this execution environment. Existing dependency-free backend checks and firmware offline stub build pass.
- Previous registration tests: demo user creation generates two notifications exactly once; different mock users have separate notifications; read/mark-all persists. SQL `createUser` transaction and rollback are **simulated** using stubbed database calls; a live SQL Server was not available.
- Expo/React Native build and browser/mobile screenshots: **NOT RUN**. Frontend packages were not installed here (`npm ci` timed out; `npm ci --offline` reported `ENOTCACHED`). Thus I have **not** verified actual mobile/desktop render, overlay offsets, scroll behavior, or keyboard focus in a running web/phone app.
- Live Node/SQL Server HTTP tests: **NOT RUN successfully**. `tests/http-contract-test.cjs` and `tests/deep-http.cjs` could not start because backend dependency `express` was not installed. This is an environment dependency issue, **not** evidence of a passing or failing database test. No SQL Server credentials or ESP32 hardware were supplied.

## Upgrade and run (Windows PowerShell)

1. **Back up the existing ZIP**, SQL database, and local app/browser data. Unzip this phase over a working **copy**, not the only original. Do not overwrite your `.env`/device secrets with sample files.
2. No Phase 2 SQL migration is needed; schema and backend files were left unchanged. If upgrading from pre-Phase-1, apply the separate Phase 1 migration (`Backend/Database/migrate-phase1-onboarding.sql`) after backing up the SQL Server database.
3. From `Root.esp-main/Frontend`: `Copy-Item .env.example .env` **only if you do not already have `.env`**; `npm.cmd ci`; `npm.cmd run check:all`; `npm.cmd run web -- --clear`.
4. For real backend, install its own dependencies: `cd ../Backend/Database_interface; npm.cmd ci; npm.cmd start`, with a configured private `.env` and working SQL Server. In `Frontend/.env`, use `EXPO_PUBLIC_USE_MOCK=false` and a valid `EXPO_PUBLIC_API_URL`. Never use `localhost` for the phone's server URL.
5. The v1 preference key is retained. A v1 signature migrates to the old active **demo** account only when its identity is known. If that previous account is unknown, the old entry remains untouched rather than being shown under the wrong account. The user can sign a new pledge from Me → Replay the intro.

## Manual acceptance checklist — still needs a running Expo build

- [ ] Use both desktop (wide sidebar) and phone-sized web/mobile; take actual screenshots of Home, Me/Settings, Game and each tour.
- [ ] Inspect Sakura, Forest and Sea Glass in Light/Dark/System; switch live and resize across 900 px. Check buttons, text contrast, sidebar, tab bar, modals, fields and saved preference after reload.
- [ ] Complete and Skip the intro; check optional signature, replay and reduced-motion accessibility setting.
- [ ] Register account A, create B through Switch → Add another account, sign in, switch back/forth, refresh (demo), sign out and repeat (live API). Confirm per-account pledge and exact-once initial notifications.
- [ ] Visit Home, Plants, Notifications, Community and Game with a fresh account, both with data and empty lists; check targets, scrolling into view, Back/Next/Skip and completion persistence. Replay all via Me → Guided tours.
- [ ] Adjust master mute, UI SFX, game music/effects and volumes; navigate away/background; check blocked browser autoplay does not break navigation or cause overlapping sounds.
- [ ] Verify credentials, token expiry, devices and HTTP errors on a **real database**. Do not send real watering commands during game testing.

## Remaining limitations

The Phase 2 implementation is **source-complete but not fully validated on physical devices or a running Expo app**. Responsive tour spotlight placement, `ScrollView` scrolling on all native platforms, popup keyboard behavior, actual audio decoding/autoplay and real-account JWT switching need on-device/web testing. SQL Server community functionality and real-mode JWT persistence are unchanged from v1.5; real sessions still require login after refresh.
