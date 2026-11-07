# Root.esp v2.1 — onboarding, design history and device-gated registration

## Implemented

- Existing guest intro retained and questionnaire answers are transferred into account-scoped local preferences on sign-in. Intro is skippable.
- Contextual two- or three-step, individually skippable, first-visit guided tours on Home, My Plants, Design and Profile. Tour completion is stored per account per device.
- One-time welcome notification for newly registered users and existing accounts on first successful login (the real database enforces it with an existence check); welcome notifications are no longer hidden from the Notifications page. A dismissible, accessible `say hello to a better world` banner is stored per account per device.
- Per-account local design archive, with an `eg` example for every existing/new account. Example has a bundled illustration, sample specifications, and questionnaire answers. Users can save preset designs and generated AI concepts. All archive data is **local to this installation**, not synchronized across devices.
- A working *illustrative* offline preset design with a bundled image and no AI dependency.
- Registration is blocked unless the backend verifies the provisioned device code plus secret setup key, and issues a 5-minute signed pairing token. Account creation and device claim use a single SQL transaction. Existing account sign-in is not gated.

## Real device provisioning

1. Back up SQL Server and apply `Backend/Database/migrate-registration-pairing.sql` after the existing base and device-auth migrations.
2. Before selling/issuing a Root.esp device, independently provision a unique `DeviceCode` and a random, secret 32-byte (64 hexadecimal character) setup key. Compute its SHA-256 digest and store `(DeviceCode, DeviceKeyHash)` in `RootDeviceProvisioning`; put the original setup key into **secure device onboarding material**, never in source control or the frontend bundle. The ESP32's device API key must be provisioned consistently with the backend key. Setup key possession is the required device credential proof here.
3. Deploy over HTTPS with `JWT_SECRET` (32+ characters), SQL Server access and API origin restrictions. Expose the API via HTTPS for remote devices. In production add strong endpoint-specific IP and device attempt limits, audit trails, secure key delivery and a physical-presence challenge for hardware live verification. **This implementation does not perform BLE/Wi-Fi discovery or cryptographic live proof from the ESP32.** The pairing screen provides manual input; claiming a pre-provisioned credential is not proof that an ESP32 is currently online.
4. A code already claimed by another user cannot create a second account. Device reclamation/transfers should be performed by a securely authorized support process, not by resetting the registration UI.

## Demo behavior

Set `EXPO_PUBLIC_USE_MOCK=true`: signing up uses `ROOT-DEMO-01` / `DEMO-SETUP-KEY`. These are simulated values and prove nothing about real hardware. Only one mock account per demo device may claim this code. To reset that demo, clear local demo app storage.

## Validation and limitations

`node tests/redesign-run-all.cjs` runs the existing regression suite. New frontend JSX was parsed with TypeScript's JSX parser, and backend source with `node --check`. No real SQL Server/ESP32 was available, so provisioning transactions and physical hardware pairing remain unverified. A production release needs integration tests with SQL Server, real ESP32 firmware and end-to-end Expo web/mobile UI runs. Locally persisted generated images may exceed browser storage limits; use private authenticated file/object storage for large production design histories. No production device discovery API is implemented.
