# Phase 1 — navigation stability, first-run flow, starter notifications, credits

## Checklist
| # | Item | Status |
|---|------|--------|
| 1 | Root cause of overlapping screens found and fixed in code | Done in code — **not verified in a browser/device** |
| 2 | Intro → optional signature → login → app; Skip on every step; remembered; returning users unaffected | Done; flow logic tested, UI not rendered |
| 3 | Tutorial skippable and replayable | Already true (Skip tour / Me → Replay); kept, now started by "Finally!" |
| 4 | Two starter notifications, once per account, demo + real backend | Done; demo path executed, backend path simulated |
| 5 | Credits popup (sidebar, Me, game, login), Escape/back/close, CREDITS.md | Done; popup not rendered |

## 1. Overlapping screens — root cause
`NavigationContainer` theme, the tab navigator (`sceneStyle`) and the stack (`contentStyle`) were all `transparent`,
while the page background was one gradient painted *behind* the whole navigator. On web, screens that stay mounted
under the active one (stack screens below the top screen, tab scenes) are therefore visible through the active scene.
Fix (no z-index tricks): every scene is opaque (`colors.bg`, derived from the theme gradient — single source of truth in
`theme.js`), and `Screen`/Login draw the gradient themselves. The only `zIndex` in `App.js` (loading overlay) was removed;
that overlay is the last child of the root so it paints on top without it. Also fixed: a late notification response from
a previous account could overwrite the current account's list after a switch (`alive` guard in `MainTabs`).

## 2. First-run flow (`src/flow.js`, `Intro.js`, `App.js`)
splash → intro (new visitor only) → login → app. **Skip ›** is on every intro step (it used to jump to the signature page);
the signature page has **Continue without signing** and says the name/signature are stored only on this device, never uploaded
or tied to an account (Me → *Remove my signature* deletes it). Signing never logs in. Any successful sign-in also marks the
intro as seen. Stored in the existing `rootesp.prefs.v1` entry (`introDone`, `pledge`).

## 3. Starter notifications
* Types: `Welcome` and new explicit `OnboardingAlert` (no plant, no device, no measurement).
* Real backend: `createUser()` inserts the user **and** both rows in one transaction; unique filtered index
  `UX_UserNotifications_Starter (UserID, NotificationType)` makes a second copy impossible. Not created at login.
* Demo: `register()` adds the same rows once (persisted with the demo database).
* The old per-device "welcome" notes (3 local items) and the automatic tour popup after sign-up were removed to avoid duplicates.
  Existing local notes of old accounts are untouched.
* **Finally!** → marks the alert read (if it fails, it stays on the screen with a message) → opens Main/Home → starts the tour.
* `OnboardingAlert` is listed under *Alerts*, counts in the unread badge and filters, but is never a red dot.

## 5. Credits
`Frontend/src/credits.js` is the single source; the popup and `CREDITS.md` come from it
(`node tests/build-credits.cjs`; the test fails if they drift apart).

## Upgrade
1. Back up the database. Run `Backend/Database/migrate-phase1-onboarding.sql` (fresh installs: already in `database.sql`).
   Existing users are **not** back-filled and nothing existing is changed.
2. Restart the backend. In `Frontend`: `npm install` (no new packages), `npx expo start --web -c`.

## Test report (what was actually run, `node tests/run-all.js`)
| Area | Kind | Result |
|------|------|--------|
| Existing 9 offline suites (+2 loaders repaired, see below) | executed | pass |
| `tests/phase1-test.cjs` — 46 checks: flow decisions, demo registration/persistence/scoping/read-state/badges, credits data + CREDITS.md sync | executed, real frontend modules in Node | 46/46 pass |
| Backend `createUser` (one transaction, rollback on failure, user-scoped rows, text identical to frontend) | **simulated** (in-memory connection stub) | pass |
| Source-contract checks (no transparent scenes/z-index, Skip, "Finally!" wiring, credits entry points) | static text checks | pass — prove the code exists, not that it renders |
| JSX syntax of all 38 frontend files; undefined identifiers | TypeScript parser | 0 errors |
| Live SQL Server, real HTTP backend + real frontend client | **not run** (no database/network here) | — |
| Browser / phone rendering (overlap fix, sidebar vs tabs, resize, back navigation, dialogs, scrolling, Escape, signature pad, account switching in the UI) | **not run** (no `node_modules`, network blocked, no browser) | — |

One bug was found and fixed by the tests: demo timestamps listed the alert above the welcome.
Pre-existing: `tests/edge-test.js` and `check-project.js` could no longer load `api.js` (missing module copies); both repaired.
`edge-test.js` exits 0 even when its own setup crashes, so it silently passed before.

## Remaining limitations / blockers
* **Manual checks needed on your machine** (please run before trusting the overlap fix): fresh-account flow, both intro paths,
  "Finally!" → Home + tour, switching between two accounts, open/close Credits on sidebar, Me and mobile width, Escape, resize across 900 px.
* Sound effects (`assets/sounds/*.wav`) have **no recorded creator/source/licence**; they are listed as such in the popup and CREDITS.md
  with a TODO. Same for the Root.esp logo licence.
* Real-backend offline alerts are stored as type `Offline`, but the app only treats `DeviceOffline` as urgent (pre-existing, not changed).
* The tour is still the existing 9-step tour; per-tab tutorials that highlight elements belong to a later phase.
* Real-mode sessions still live in memory only (pre-existing): a page refresh returns to login (the intro is not repeated).
