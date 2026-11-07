# Root.esp v2.4

1. **One-tap switch to a kids account.** Profile > Kids accounts: tap the child's row to open their account. No kids password is needed when a grown-up is signed in (new route `POST /api/users/:id/kids/:kidId/session`, parent-only, own kids only). Going back to the grown-up account still needs the grown-up password.
2. **No more overlap with the phone's Home/Back/Recents buttons.** The app is wrapped in `SafeAreaProvider`; the bottom tab bar, the kids floating tab bar, sheets, kids screens, sign-in, intro and the stack pages (plant, devices, admin) all leave room for the system bars on edge-to-edge Android.
3. **New "My plants" and "Needs attention".** Plant tiles with a coloured header, the plant's picture, a "soil tank" gauge (fill = soil moisture, tick = watering threshold), status chip with icon and reading chips. Home shows plants as a swipeable row with an Add tile. Needs attention cards say what is wrong, why, and what to do next. My Plants tab adds a health bar and filters (All / Needs care / Healthy / No device).
4. **Flower 2048 (kids).** A garden version of 2048: seed → sprout → leaf → clover → tulip → daisy → poppy → big bloom → tree… Swipe, arrow buttons or keyboard. Stars: Tulip 1, Daisy 2, Poppy 3. On kids Home and in every plant buddy's game list. Rules in `src/kids/bloom2048.js`.
5. **eg pot custom example.** Input: the outcome image of *eg design*, with the user saying "Design the Monstera's pot." Output: the Root.esp pot render (`assets/design/eg-pot-custom.jpg`), with design choices and the Monstera's needs.
6. **Design history opens in the designer.** Tapping a history item fills the normal designer (workflow, photo, material, size, what the user asked, design answers) locked, with the result below. "Start from these answers" copies them into a new design.
7. **Root.esp logo is the back button.** Away from Home, an arrow appears before the logo in the header (and in the wide-screen sidebar); tapping it returns to the previous tab (tab history) or page.

Tests: `node tests/redesign-run-all.cjs` now includes `tests/v2-4-feature-test.cjs` (15 checks incl. 2048 rules and kids session).
