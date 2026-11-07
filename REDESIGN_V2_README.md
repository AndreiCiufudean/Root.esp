# Root.esp v2.0 — Take your life slow.

This upgrade uses `Root_esp-v1_9-update.zip` as the starting point. It retains the existing Expo/React Native app, Express + ODBC/SQL Server plant/device services and original ESP32 firmware. No destructive migration or table drops are included.

## Implemented

- Four main destinations, shared across web/mobile: **Home, My Plants, Design, Profile**. Mobile has a fixed bottom bar; desktop has a 216px left rail. Discovery, Game, Credits, social and tutorial screens are no longer part of the app. Their old runtime modules/assets have been removed. Old discovery rows in existing databases are **not deleted** by this migration.
- Neutral light/dark UI theme, text-led navigation, dashboard counts, device statuses and actionable alerts; reduced audio and animation.
- Short pre-login `Life can be stressful.` screen followed by six skippable personalization questions. Responses are currently stored locally on the device and used by the Design studio; they are not synced to the user's account yet.
- Existing plant list, plant detail, available readings/history, care settings, registered ESP32 devices, linking/replacing, water commands and automatic threshold settings retained. Existing sensor and watering services/firmware are unchanged; the dashboard does **not** fabricate readings.
- Optional authenticated OpenAI Design studio. User photo -> optional vision description -> image-edit concept using backend-only `OPENAI_API_KEY`. Supports interior and existing-plant reference images, user preferences and material choices. The API returns **AI-proposed concepts**, never verified production CAD.
- Authenticated manual manufacturing-review requests stored in SQL Server with image, requested material, size, notes and concept specs, plus a user's list of request statuses. No checkout, manufacturer dispatch or claim of production approval is performed.
- Optional AI endpoints have a per-account 60-second cooldown. A production deployment also needs perimeter rate limits, AI spend budgets, secure TLS, account authorization reviews and storage/retention policies.

## Run in real mode

1. Back up the existing database. Run the **additive** SQL migration `Backend/Database/migrate-premium-design.sql` against the existing database. Review SQL permissions for the user running the API.
2. In `Backend/Database_interface/`, create `.env` from `.env.example` and set `JWT_SECRET` (32+ random characters) and `ODBC_CONNECTION_STRING`. Optionally add `OPENAI_API_KEY` and `OPENAI_IMAGE_MODEL=gpt-image-1`; **never** put that key in `Frontend/.env` or any `EXPO_PUBLIC_*` value.
3. Install backend dependencies: `cd Backend/Database_interface`, `npm ci`, `npm start`.
4. In `Frontend/`, create `.env` from `.env.example`. Set `EXPO_PUBLIC_USE_MOCK=false`, and `EXPO_PUBLIC_API_URL=http://localhost:3000/api` for local web testing, or your reachable **TLS-secured** API host for mobile/production use. Then run `npm ci`, `npx expo start --web` (or `npx expo start --android`). The real ESP32 still requires its usual secure registration/network/device provisioning.
5. For demo UI only, set `EXPO_PUBLIC_USE_MOCK=true`. AI design and manufacturing submissions are deliberately unavailable in demo mode. Device values in this mode are **demonstration data**, not real measurements.

## Manufacturing workflow

- Design concepts and a preliminary description are generated on demand by the configured AI provider.
- User may submit a concept + material/size/notes for human review; the server inserts a `pending_review` row.
- Request status is visible to the submitting account. A production manager can review/handle these SQL records manually for now. There is no admin reviewer GUI, external partner API, payment integration, export of CAD, or automated production dispatch.
- Ceramic fit, sensor placement, drainage, electronic isolation, reservoir seal, print tolerance and food/soil/material safety require human engineering and factory validation before manufacturing.

## Tests and caveats

Run `node tests/redesign-run-all.cjs` from the repository root (or `npm run check:all` in `Frontend/`). Checks cover 4-tab architecture, API isolation, device routes, water command concurrency, sensor boundaries, SQL types and offline C++ firmware compilation (when g++ exists).

**Not verified here:** no physical ESP32 or SQL Server was connected; OpenAI API calls were not executed because no credentials were provided; no third-party ceramic factory was contacted. A complete Expo web/Android build was not possible in the inspection environment because the original project's npm dependencies are not cached (`npm ci --offline` reports `ENOTCACHED`). JSX/module syntax and import resolution were verified statically. Legacy pre-v2 tests for intentionally deleted game/discovery/onboarding behavior remain historical and have been replaced in the active test command.

**Future development required:** organizational multi-tenancy, persistent cloud-backed personalization, production-ready device provisioning/deployment and security audits, image retention controls, manufacturer review/export portal and partner integration, paid services, volume/enterprise installation management and validated CAD/manufacturing specifications.
