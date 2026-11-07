# Root.esp — Final verification and corrective fixes

**Date:** 1 November 2026  
**Input:** `Root_esp-v1_7-phase3-web-hotfix(1).zip`  
**Scope:** Regression audit and corrective maintenance to the supplied v1.7 build, not a new feature phase.

## Implementation checklist

- [x] Inspected the supplied archive, real navigation layout, API/mock data model, game model, per-account local state, themes, credits and backend source.
- [x] Inspected the provided image reference: pastel, whimsical mobile garden interface with characterful plant sprites, cloud sky, bright grass and soft pill-shaped controls. This phase retained the supplied original illustrated assets rather than importing that screenshot into the app.
- [x] Confirmed bundled `assets/game/room.png` exists at the path referenced by `src/gameArt.js` (all 12 required game PNGs are bundled).
- [x] Corrected the notification **View post** action to open `Main > Community` with the post ID (the old route targeted a nonexistent root-level Community screen).
- [x] Stopped inline likes from also triggering the surrounding community post tile's click handler.
- [x] Made **Large lane buttons** actually enlarge touch targets in the droplet game; the older "Simple controls" toggle changed only its label.
- [x] Repaired duplicate plant slots when reconciling saved game progress. Preserve first position and virtual growth.
- [x] Saved garden plant snapshots now survive a missing plant-cache entry until a successful live API refresh; an authoritative empty response still removes deleted real plants.
- [x] Prevented stale/out-of-order plant refreshes from overwriting newer local game state, with serialized cache writes and cleanup after leaving the screen.
- [x] Removed the obsolete daily-streak counter from Me (existing legacy progress remains saved, untouched).
- [x] Added nine new focused Phase 3 regression checks.
- [x] Left physical ESP32 watering, sensor readings, and real care-setting endpoints entirely untouched by game code.

## Actual execution results

| Check | Result | Evidence and scope |
| --- | --- | --- |
| Full dependency-free offline suite | **PASS** | `node tests/run-all.js`, run after the fixes. Includes project consistency, edge cases, device routes, database transactions (simulated), command lifecycle, sensor boundaries, data types, settings conflicts and Phase 1–3 tests. Complete output: `verification/final-offline-tests.log`. |
| Phase 1 onboarding | **PASS — 46 checks** | Mock registration, two starter notifications, skip flow, notification isolation and simulated SQL transaction rollback. |
| Phase 2 | **PASS — 30 checks** | Theme semantics, audio behavior (mocked), account pref/source checks and tour definitions. Not a rendered UI test. |
| Phase 3 | **PASS — 44 checks** | Pure garden-model operations, sources/navigation contracts, original asset presence, simulated service-worker cache, and the newly added regression checks. |
| Firmware local stubs | **PASS** | C++ offline parser, basic sensor mapping and simulated local firmware conditions; **not** a real ESP32 build/upload or hardware run. |
| JavaScript/JSX syntax | **PASS — 64 files, 0 parse diagnostics** | Global TypeScript parser against frontend/backend/tests. `verification/final-syntax-report.json`. Not Metro bundling. |
| Expo dependency installation | **BLOCKED** | `npm ci --no-audit --no-fund --ignore-scripts --prefer-offline --fetch-retries=0 --fetch-timeout=10000` in `Frontend` failed with `EAI_AGAIN registry.npmjs.org`. There were no bundled `node_modules`. |
| Expo web/mobile build and interactive browser QA | **NOT RUN** | Expo/React Native package installation blocked. No current-project UI screenshots could be generated at 390/768/1440 px. |
| Real backend HTTP integration | **NOT RUN** | Express, bcrypt and ODBC packages unavailable. Existing HTTP-related source/adapter tests are not live HTTP evidence. |
| Live Microsoft SQL Server integration/migrations | **NOT RUN** | No SQL Server configured or credentials supplied. Database migration correctness is not proven against a live database. |
| ESP32 HTTPS, pump and sensor integration | **NOT RUN** | No connected hardware. Game's lack of pump calls checked by source inspection; it is not a hardware verification. |
| Production offline reload / autoplay | **NOT RUN in browser** | Browser service-worker behavior was **simulated** with a Node VM and stubbed cache/network only. |

## User journeys — verification boundaries

The tests exercised portions of registration/notifications, cross-account data-key prefixes, mock plant/device methods, command lifecycle, local game-state reconciliation, water rewards and settings/tour contracts. They **did not execute** the complete clickable user journeys (1–16) from the request in a running browser, phone or connected database. In particular, full guided tours on scroll/resize, screen/modal overlap, post sharing dialogs, switch-account visual isolation, game pointer/touch input, offline browser refresh, dark-mode visuals, keyboard interaction and real device replacement/history preservation still require interactive acceptance testing. Previous phase reports' historical browser results are not substituted for the current project's runtime checks.

**Responsive acceptance still needed:** render at ~390, 768 and 1440 px and verify safe areas, horizontal overflow, scrollable dialogs, theme colors (especially pink Sakura), tabs/overlays, reduced motion, tour spotlight location, and game touch targets. Check DevTools console for unresolved assets, warnings, unhandled promises and audio/timer leaks.

## Windows PowerShell — run and verify

From the extracted `Root.esp-main` directory:

```powershell
cd Frontend
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd ci
npm.cmd run check:all
npm.cmd run web -- --clear
```

The `.env.example` defaults to **mock mode**. Demo login: `user@sera.app` / `demopassword`. For a fresh-session intro test, use a separate browser profile or explicitly clear local site storage **only in that test profile**; do not clear storage containing real data or valued demo progress.

For production offline testing after installation succeeds:

```powershell
npx.cmd expo export --platform web
npx.cmd serve dist
```

Visit once online on localhost, verify service-worker activation and all assets in the cache, then use DevTools Offline and reload. This is not a passing result until performed.

### Real SQL Server setup (separate from demo mode)

1. Back up existing SQL Server data. Only on **new** databases, execute `Backend/Database/database.sql` in SQL Server Management Studio (the source is encoded UTF-16). **Never rerun the initial schema on an existing production database.**
2. On older schemas, review/apply in the documented migration order where needed: `Backend/Database/migrate-device-auth.sql`, `migrate-reliability.sql`, and `migrate-phase1-onboarding.sql`; inspect existing duplicate rows and any active watering commands before adding unique indexes. Review `optional-unique-device-index.sql` only after checking ownership/link duplicates. None of the fixes in this verification adds new SQL schema requirements.
3. In `Backend/Database_interface`, copy `.env.example` to `.env` if it does not already exist; configure private `ODBC_CONNECTION_STRING`, strong `JWT_SECRET` (32+ characters), permitted `CORS_ORIGINS`, and the intended device-API security flags; then run `npm.cmd ci` and `npm.cmd start`.
4. In `Frontend/.env`, set `EXPO_PUBLIC_USE_MOCK=false` and `EXPO_PUBLIC_API_URL=http://localhost:3000/api` for development on the same Windows PC, restart Expo using `npm.cmd run web -- --clear`. Do not expose secrets to the frontend or enable real pump commands for the mini-game.
5. Retest all role/ownership, rollback, device-link and re-link cases against a disposable real database before connecting physical hardware. Legacy timestamp conversion must be planned using the data's original timezone; see `TEST_REPORT.md`.

## Attribution / asset licenses

See the bundled **`CREDITS.md`** for origin, licensing and modifications for each asset group. The 12 game illustrations and replacement SFX/music are credited as project-original; the user's external game screenshot is a visual reference **only** and is **not** reproduced, copied or redistributed as an app asset. No additional packages, external music, copyrighted game art or new SQL migrations were introduced by this verification.

## Remaining blockers

A new hands-on verification run is required on a Windows machine with Expo dependencies, a browser and—if testing the real API—a SQL Server test instance. A working physical ESP32 is also required for hardware behavior verification; the game itself should be tested **without enabling** pump control. This ZIP is a code-corrected package with a passing offline suite, **not** a fully end-to-end-tested release.
