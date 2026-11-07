# Root.esp v1.7 — Phase 3 handoff and test report

**Scope:** Replace the old remote-photo/watering-bar game with an original illustrated, locally persisted garden game. Fix intro skipping, default notification status order, single-use notification actions and desktop sidebar width. **Date:** 31 October 2026.

## Changes delivered

### A. Cozy rooms, registered plant mapping and local save

- Replaced `Frontend/src/screens/GameScreen.js` with a new responsive game interface, welcome screen and skippable floating-cloud intro. The game never calls `waterNow`, changes sensor values or writes care settings.
- `Frontend/src/gameModel.cjs` implements pure virtual garden operations: room creation/renaming, two rows of selectable positions, inter-room moves and occupied-slot swapping, growth, leaf cleaning and water inventory. A game-only **Little Sprout** is included so a new account can play before adding a real plant. The starter's ID is never treated as a real PlantID.
- Real plants are fetched with `api.getPlants(user.UserID)` and converted into lightweight, non-sensitive *local snapshots* keyed by the exact stable `PlantID`. Plant names, species hints and user-custom emoji are used for consistent illustrated sprites. Registered plants are refreshed on game visits and browser reconnection; additions, renames and deletions reconcile without resetting unrelated game progress or creating duplicate plants.
- Per-account local keys: `rootesp.cozyGarden.v1:<mode><account>`, `rootesp.cozyPlantCache.v1:<mode><account>`; no SQL changes. Actions save immediately through a serialized queue (old rapid writes cannot overwrite newer ones). The screen reports local save status.
- An empty or previously unvisited offline account explicitly says no real plant list has been cached. Previously synced offline accounts play with cached names, **not live monitoring**. Both show the game-only sprout.

### B. Clouds, catching drops and virtual watering

- Illustrated outdoor/sky area with three selectable cloud characters.
- 20-second droplet-collection round with multiple falling drops, a moveable basket, score/progress, pause/resume, retry, finish, results and return-to-room. Supports pointer drag/tap plus five touch-sized lane buttons and keyboard left/right arrows. No sensor readings or physical watering commands are referenced.
- Water collected in the game is stored in virtual inventory; spending one unit to care for a selected plant raises its **virtual joy** and triggers a visible bounce and emoji reaction. An optional consolation drop is awarded for a full 20-second round with no catches, not for instantly quitting.

### C. More activity, shared controls, assets and polish

- Leaf-cleaning activity: tap three dusty leaves. One petal reward is granted only if the selected virtual plant was dusty, eliminating repetitive free rewards for already-clean plants. A virtual plant may get dusty again after several virtual watering actions; nothing expires for missed days.
- Start, help, pause, settings, credits, sound, saved-feedback and return-to-app controls; accessible, gentle transitions with reduced-motion support. The game opens the **same** app Settings and Credits popups as the main interface. App backgrounding stops game audio and pauses minigame state.
- Twelve original coherent local illustrations (room, sky, eight plant sprites, cloud and drop); original project music and six replaced, locally synthesized interface sound effects. No Unsplash/stock photography in the game. `Frontend/src/gameArt.js` is the bundled asset manifest; reproducible source scripts are in `Frontend/tools/`.
- The shared `Frontend/src/credits.js` generates `CREDITS.md`; game artwork and sounds are attributed as original, created for this project. **No third-party stock art, game sprites, sound samples or copyrighted music was used in Phase 3.** Historical Unsplash credits from older phases remain labelled as unused in this game.
- Phase 3 neutralizes legacy **daily streak pressure** in Home, Me and Sidebar game entry points. Older Phase 2 game progress remains in its original local key and is not deleted, but the new game uses separate progress.
- Intro Skip now also disables *all first-visit guided tours* for the account signing in next (or the current account if replaying). Explicit tour replay through Settings still works.
- Notifications default to **Unread → Read → All**, with Unread selected initially. Acknowledged starter alert (`Finally!`), accepted one-shot watering requests, and completed Follow-back actions have disabled completion controls; one-shot status is recorded per account at `rootesp.notifActions.v1:<account>`.
- Desktop navigation is explicitly **202 px**, not a percentage of the viewport.
- `Frontend/public/sw.js` is a same-origin **static-asset/app-shell-only** production web service worker. It pre-caches the app shell on install, receives resource and game asset URLs after the first app load, and uses network-first caching with offline fallback for static assets. It excludes auth, plant data, notification and device API endpoints. Registration is intentionally production-only; Expo's development web server is not an offline build. Browser service workers require a secure context (HTTPS or localhost).

## Verification evidence

| Milestone / test | Result | What was actually tested |
|---|---|---|
| A — pure model actions | PASS | New account state, IDs, custom classification, create/rename room, move and swap, duplicates, rename/remove/reconnect, preserved unrelated growth |
| B — game-resource model | PASS | Collected-water addition, virtual watering consumption/joy, no water below zero, cleaning rewards and one-time clean limitation |
| C — source integration | PASS | No device watering calls, room/cloud/helper/popup routes exist, local assets are bundled, shared credits are complete, account keys and save logic exist |
| Existing frontend/backend/firmware offline suite | PASS | `node tests/run-all.js` — all available suites passed, including 35 Phase 3 checks and offline firmware simulator |
| JS/JSX/CJS parse check | PASS | 43 files parsed, zero syntax diagnostics (TypeScript parser available on tester, independent of app dependencies) |
| Offline web caching behavior | SIMULATED PASS | Service-worker install/precache, offline app-shell response, cached sprite, and bypass of a live plant endpoint exercised with a Node VM mocked browser |
| Expo dependency install | BLOCKED | `npm ci --offline` failed with `ENOTCACHED`; a normal `npm ci` failed with DNS `EAI_AGAIN` resolving registry.npmjs.org |
| Real Expo web/mobile rendering, desktop/mobile screenshots | NOT RUN | React Native/Expo runtime dependencies unavailable in this environment |
| Real browser service-worker offline reload | NOT RUN | Requires a working production web export served via HTTPS/localhost |
| Real SQL Server + ESP32 integration | NOT RUN | No live database or device attached; firmware source checks are **not** live hardware tests |
| Physical mouse/keyboard/touch acceptance session | NOT RUN | Layout and controls implemented, but real pointer/touch testing requires Expo running in a browser/device |

**Do not interpret simulated service-worker tests or JS parser checks as a successful Expo build or completed mobile screenshot QA.**

## Upgrade instructions

No SQL migration. Do not clear browser or device app storage when upgrading; all Phase 1/2 accounts, signatures, preferences, tour completion, devices, and registered plants remain unchanged. Phase 3 creates new namespaced **local** keys on first game visit. No additional npm dependencies have been introduced.

Windows PowerShell, from `Root.esp-main`:

```powershell
cd Frontend
Copy-Item .env.example .env  # only when you do not already have your own .env
npm.cmd ci
npm.cmd run check:all
npm.cmd run web -- --clear
```

For a **production web offline test** after dependencies install:

```powershell
npx.cmd expo export --platform web
npx.cmd serve dist
```

Serve `dist` on localhost or HTTPS, visit once while online, let the service worker install and precache assets, and then test an offline browser reload. Do **not** assume offline support from development (`expo start --web`), or before the first production precache completes.

## Manual acceptance checklist (not yet checked on actual devices)

- [ ] On desktop, compare the sidebar width and verify screen content fills the remaining viewport.
- [ ] On mobile (Android/iOS or responsive web), inspect room art/labels, cloud controls, buttons, safe areas, portrait and landscape layouts.
- [ ] Intro Skip before login: sign in and visit Home, Plants, Community, Notifications and Game; confirm no auto tours. Verify deliberate Settings → Tours replay still opens a tour.
- [ ] On Notifications, confirm status order Unread/Read/All and starter `Finally!` disables after successful acknowledgement, even after reload/account switching.
- [ ] Real demo & API accounts: verify proper plant IDs, names, custom appearances, new plant arrivals, renames and removals; disconnect/reconnect; ensure no duplicates or cross-account garden state.
- [ ] Create and rename a room, reposition a plant, swap places, move between rooms; reload and verify every change persists.
- [ ] From clouds, use mouse drag, touch lane buttons and keyboard arrows; pause during a round; collect droplets; return, spend water on a virtual plant, confirm bounce/joy, clean three leaves and replay.
- [ ] With zero registered plants, interact with Little Sprout and follow the Add plant route. Test first-time offline versus previously cached offline.
- [ ] With production web assets warmed, disable network and hard-refresh. Verify artwork, music, UI, game and local progress load. Confirm a live API error is not served from a static response cache.
- [ ] Test Sakura/Forest/Sea Glass in light/dark/system, mute/volume persistence, settings from game, Credits from game, reduced motion, focus/background audio pause and return-to-app action.
- [ ] Verify via device/network logs that **no game action sends real ESP32 watering commands or sensor writes**.

## Files changed / added

- Replaced `Frontend/src/screens/GameScreen.js`; added `Frontend/src/gameModel.cjs`, `Frontend/src/gameArt.js`, `Frontend/assets/game/*`, `Frontend/tools/draw_game_art.py`, `Frontend/tools/make_game_sounds.py`, `Frontend/public/sw.js`.
- Updated `Frontend/App.js`, `Frontend/src/Intro.js`, `Frontend/src/prefs.js`, `Frontend/src/Tour.js`, `Frontend/src/Sidebar.js`, `Frontend/src/screens/NotificationsScreen.js`, `Frontend/src/screens/HomeScreen.js`, `Frontend/src/screens/MenuScreen.js`, `Frontend/src/tourDefinitions.js`, `Frontend/src/credits.js` and generated `CREDITS.md`.
- Replaced six sound effects in `Frontend/assets/sounds/` with original, sourced synthesis, retained original `game-loop.wav`.
- Added `tests/phase3-test.cjs`; updated `tests/run-all.js`, `Frontend/package.json`, lockfile and `Frontend/app.json` to v1.7.

## Known limitations / non-goals

- New game state is local to each account on **this device/browser**; there is no cross-device/cloud synchronization for game rooms or inventory. Real plant data stays in SQL Server as before.
- Custom plant photo uploads are not used as game sprites (intentionally: game uses coherent illustrations); the original app plant appearance controls remain available. Game reflects custom emoji when it selects a species illustration.
- Interactive arrangement uses accessible slot selection, room choice and arrow buttons rather than a freeform physics drag editor.
- Performance and accessibility in an actual running React Native app need the manual tests above, including any layout issues visible only in a native/mobile browser environment.
