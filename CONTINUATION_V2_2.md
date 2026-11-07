# Root.esp v2.2 — continuation and hardening

Based on the v2.1 onboarding/hardware/design ZIP.

## Changes

1. **Pairing-token privacy:** pairing JWTs no longer contain the device setup-key hash. The server signs a short-lived device-code claim only. The SQL transaction checks that the provisioned device exists and remains unclaimed under an update lock; it copies its hashed device credential from the database directly into `EspDevices`. This avoids exposing the device authentication hash inside a decodable JWT payload. Existing unclaimed pairing tokens issued by older versions remain usable until they expire (up to five minutes).
2. **Expired pairing:** registration UI clears verified pairing state when the backend-provided TTL runs out and requests re-verification. Switching between sign-in and sign-up also clears the pairing and setup key.
3. **Tutorial UX:** the guided tour now supports *Skip this page* and *Skip all tours*. The global skip choice is account-scoped and the user can use Profile > Replay guided tours to restart all four sections.
4. **Design archive controls:** user-created concepts can be deleted with explicit inline confirmation. The built-in `eg` example stays available.
5. **Preference isolation:** design studio no longer falls back to anonymous, device-wide legacy questionnaire answers when the signed-in user has no account-specific answers.
6. Added v2.1/v2.2 assertions to the default test runner.

## How to test

```bash
node tests/redesign-run-all.cjs
cd Frontend
npm install
npm run web
```

For a live backend, configure SQL Server, apply the existing v2.1 device-provisioning migration, and test pre-provisioned devices over HTTPS. No new SQL migration is required by v2.2.

## Known limitations

Hardware pairing is still manual proof of possession of provisioned setup credentials, **not** physical BLE/Wi-Fi scanning or live ESP32 attestation. The real SQL Server and ESP32 integration are untested in this environment. Design history and tour progress remain per-account **on this installation** rather than synchronized server-side. An actual Expo web/mobile render was not run in this continuation; the modified JSX passed parser checks and the Node regression suite passed. Production requires endpoint rate limiting, credential lifecycle policies, robust persistence for generated images and on-device testing.
