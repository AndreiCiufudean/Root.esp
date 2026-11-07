# Root.esp v1.9 — first-login tour, delete plant, slim sidebar, calmer PC look

## What changed
| Request | Change |
|---|---|
| Tutorial not working at first login | Cause: skipping the intro silently switched **all** tours off for the next account, and the "Finally!" alert no longer starts one. Now a **new account is offered the tour once** ("Show me around" / "Maybe later") right after sign-up, whatever happened in the intro. Accepting clears an earlier Skip and starts the Home tour; later tabs tour on first visit. "Maybe later" is remembered, and the tour stays replayable from Me → Guided tours. Automatic tours wait while the offer is open, so two dialogs never stack. Home tour copy now fits an empty garden. |
| Delete option | **Delete this plant** (bottom of a plant page, with a confirmation that says what is lost). Removes the plant, readings, watering history, care notes, disease reports, photos and its notifications. The Root.esp device **stays registered and becomes free**; pending (not yet picked up) watering commands for it are cancelled; nothing is ever watered. Demo mode and the real backend (`DELETE /api/plants/:id`, one SQL transaction, owner-checked, CORS now allows DELETE). |
| Sidebar = half the screen | Cause: `flex: 1` on the sidebar wrapper overrode its width inside the row layout (reproduced in Chromium: 700 px of a 1400 px window). Now a fixed **176 px** rail (was 202), label-only, smaller icons, no hint lines, no hover zoom. |
| Header logo white background | The tab header was a solid near-white bar. It is now transparent and paints the same colours as the top edge of the page gradient (no seam); the logo image also has an explicit transparent background. |
| Less visually stimulating | Smaller hero/tiles/emoji, one fewer large promo card on Home (Little Garden and Discover stay one tap away in the tiles and sidebar), the solid green tip card is now a soft card, softer light-theme gradients, lighter tour dim. Rail colours, palettes and the cute pastel look are unchanged. |

## Tests (run from `Root.esp-main`: `node tests/run-all.js`)
- Whole offline suite: **ALL AVAILABLE OFFLINE CHECKS PASSED** (14 scripts incl. new `phase4-test.cjs`, 22 checks).
- New: demo-API delete (owner-only, cascades, other plants untouched, device freed, no watering afterwards); backend route (401 / 404 for another user / 200 + owner-scoped call; CORS advertises DELETE); SQL transaction stub (children before plant, device kept, pending commands cancelled, rollback on error, nothing deleted for non-owner); source contracts for the welcome offer, sidebar width, header; JSX/JS parse of every touched file.
- Updated: `phase3-test.cjs` sidebar-width check (202 → 176).

## NOT verified (needs your machine)
The sandbox could not install npm packages, so **the app was never launched**. Not proven: how the offer, sidebar, transparent header and delete dialog actually look; Expo web bundling; a real SQL Server run of the delete (it follows the schema's foreign keys but is only tested against a stub); `headerBackground` on your exact navigation version.

## Manual checklist
1. Sign up a new account (try once with intro **Skip**, once without) → offer appears → "Show me around" starts the Home tour; repeat with "Maybe later" → no tour, Me → Guided tours still replays.
2. Window ≥ 900 px: sidebar ≈ 176 px wide, content fills the rest; resize across 900 px.
3. Home header: no white bar behind the logo in Sakura, Forest and Sea Glass, light and dark.
4. Plant page → Delete this plant → Cancel keeps it; Delete removes it, device appears free in Devices; repeat against the real backend.

## Not done
Deleting a device, a discovery-journal entry, a notification or the whole account (account/data deletion and retention are still open from v1.8).
