# Root.esp v2.3 — guided spotlight, demo designs, themes, assistant and kids accounts

Based on `Root_esp_v2_2_continued.zip`.

## What changed

1. **Tutorial centres what it explains.** Every tour step points at a real part of the page (`<TourTarget id>` in `src/tour.js`). The overlay scrolls that part to the middle of the screen, dims everything else, outlines it and puts the explanation right beside it with an arrow, progress dots and Back/Next. Tours now cover Home, My Plants, Design, Assistant and Profile.
2. **Demo designs in Design history** (prototype, until the design API is connected):
   - **eg design** — the room photo "uploaded by user" with the prompt *"Recommend plants for the Romanian environment and design my room, knowing this is my room"*, the designer outcome image, design choices and nine plants with English/Romanian/Latin names, their role in the room and their needs.
   - **eg pot custom** — placeholder entry; drop the two images into `Frontend/assets/design/` and set `uploaded`/`outcome` in `src/designHistory.js` (same pattern as `eg design`).
3. **Colour themes.** Eight themes (Forest, Sea Glass, Sakura, Terracotta, Lavender, Sunflower, Studio neutral, High contrast), each in light and dark. Status colours keep one meaning everywhere (green healthy, amber attention, red problem, blue water/info) and are repeated with an icon so they are not colour-only. Each section has its own accent (Home brand, My Plants green, Design violet, Assistant blue, Profile slate). Theme picker with live previews in Profile > Appearance.
4. **No emoji in the interface.** All emoji were replaced with Material Community Icons through `src/Icon.js` (`@expo/vector-icons`, already part of Expo; now declared in `package.json`). Plant avatars use plant icons.
5. **Logo inside the name.** `Wordmark` renders "R", the logo, then "ot.esp". Used on splash, intro, sign-in, sidebar and the mobile header.
6. **AI assistant tab.** Chat screen with suggestions, bubbles, typing indicator, history per account and clear button. In demo mode it gives offline, rule-based answers that use the user's own plants (`src/assistant.js`). With the real backend it calls `POST /api/assistant/chat` (OpenAI Responses API, `OPENAI_API_KEY`, optional `OPENAI_CHAT_MODEL`), rate-limited, with the user's plant list as context.
7. **Plants on the front page.** Home shows the first plants as cards with status, plus Add / See all.
8. **Kids accounts.** Sign-up asks "Do you have kids?". If yes, the parent is invited right after registration to create a kids account (also available in Profile > Kids accounts). A kids account uses **the same email**, the child's name and a **different password**; the form warns not to reuse the adult password, and the API rejects a password already used by any account with that email (the password is what picks the account at sign-in).
9. **Kids interface.** Bright sky-and-grass design, big buttons and a floating tab bar: Home, **My Plants**, Me. No Design tab and no AI chat. Tapping a plant opens an animated plant buddy (drawn with views: sways, blinks, bounces, droops when thirsty, mouth moves while it "talks"; on web it can also speak aloud). Lines come from the plant's real status and species. Three mini games award stars and teach real care: *Just-right water*, *Sunshine catcher*, *Bug patrol*. Badges unlock with stars. Switching to the grown-up account needs the grown-up password, and signing a child out never drops them into an adult session.

## Backend

- `Backend/Database/migrate-kids-accounts.sql` (run once): adds `ParentUserID`, `IsKid`, `DisplayName`; replaces the unique email constraint with a filtered unique index for adult accounts only.
- Login checks the password against every account sharing the email.
- Kids accounts are read-only (`kidMayUse`): household plants, catalogue and their notifications only.
- New routes: `GET/POST /api/users/:id/kids`, `GET /api/household/plants`, `POST /api/assistant/chat`.
- Works on databases without the migration (kids features report that the migration is needed).

## Demo accounts

- Adult: `user@sera.app` / `demopassword`
- Kids (Maya): `user@sera.app` / `kidspassword`

## Tests

`node tests/redesign-run-all.cjs` — adds `tests/v2-3-feature-test.cjs` (static wiring plus behaviour of the demo data layer: shared-email login, password conflicts, household plants, assistant). All pass.

## Known limitations

- Not run on a phone or in Expo itself: npm packages could not be installed here. The web screens were checked through a lightweight React Native web stand-in, screenshots in `Graphics & Presentations/v2.3-preview/`.
- Kids stars and assistant history are stored per account on the device, not on the server.
- The real assistant and kids routes are untested against a live SQL Server / OpenAI key.
