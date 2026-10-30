# Root.esp — second audit repairs and verification

Updated 30 October 2026. One unified frontend. This repair addresses A00–A12 in Root.esp-deep-audit-2.

## Repairs

- **Permissions and database types:** `db_types.js` normalizes SQL BIT columns explicitly, BIGINT IDs as decimal strings and UTC datetime2 strings as ISO UTC timestamps. Every database query passes through this boundary. Permission checks independently use explicit true/1/"1" matching and fail closed for other representations. Express serialization also handles BIGINT safely. Nullable sensor flags remain null.
- **Large IDs:** command and notification routes validate full SQL BIGINT decimal strings without Number conversion. The firmware accepts positive command IDs through 9223372036854775807 and preserves their digits in acknowledgements.
- **Timezones:** UTC timestamps no longer depend on the client's timezone. Existing historical local-time records still require deliberate migration before using the UTC contract. Calendar-only plant dates stay calendar dates.
- **Firmware build:** the certificate placeholder uses a static const char array instead of the broken multiline macro. Both default and network-enabled firmware compile as supplied with the official toolchain; no diagnostic code correction is needed.
- **Settings:** firmware requires actual JSON booleans and retains fractional soil thresholds. The settings UI validates whole numeric inputs, preserves dirty edits, refreshes pristine settings, and offers reload when a conflicting refresh is detected. New UI saves send their original baseline; the backend locks/checks it and returns 409 if another edit won. Legacy API clients omitting ExpectedSettings retain the previous overwrite behavior for compatibility.
- **Recovery:** transient ACK failures retry only the report. Terminal conflicts are checked through an authenticated device command-status endpoint and can clear the report without replaying physical watering. Persisted watering markers are written before energizing the pump. A reboot conservatively restarts a full thirty-minute cooldown; unavailable persistent storage prevents actuation.
- **Fault isolation:** command-list failures display an inline warning without replacing plant readings. Successful telemetry stays accepted if optional notification generation fails; its response reports alertsGenerated:false and the server logs the failure.
- **Validation:** login applies bcrypt's 72-byte UTF-8 limit, and malformed plant IDs are rejected before an ODBC query.

## Executed tests

| Check | Result | Boundary |
|---|---|---|
| Bundled regression suite | All groups pass | 26 project, 7 edge, 23 route, 17 device, 5 transaction, 5 command-lifecycle, 17 sensor/timestamp assertions, 25 DB type cases and 2 settings concurrency cases; plus offline firmware checks |
| HTTP contract tests | 38/38 pass | Actual Express, bcrypt/JWT; controlled database values, including native-shaped SQL flags/IDs |
| Additional device contracts | 6/6 pass | Actual mounted device routes with controlled DB failures/values |
| DB query normalization | Pass | Actual DB module around ODBC connection adapter; includes timezone test under Europe/Bucharest |
| Concurrent settings | Pass | Same-connection lock/check/write adapter: one successful update, one conflict; stale baseline cannot write |
| Standard browser flows | 12/12 pass | Mock mode, Chromium |
| API-mode browser cases | 8/8 pass | Production frontend with intercepted API responses, including conflict handling, partial input and command outage |
| Clean frontend install | Pass | npm ci --ignore-scripts --offline; lifecycle scripts skipped |
| Production mock and API-mode exports | Pass | Expo export --clear |
| Firmware network host tests | 8 groups pass | Actual firmware functions, official ArduinoJson 7.4.2, simulated GPIO/NVS/time/HTTP; no physical actuation |
| Official default ESP32 build | Pass | Generic ESP32, core 3.0.7; 297,525 bytes flash, 20,448 bytes globals |
| Official network-enabled ESP32 build | Pass | Same core, DHT 1.4.6, Unified Sensor 1.1.15, ArduinoJson 7.4.2; 1,057,721 bytes flash, 47,236 bytes globals |

Results overlap; do not add them into one overall pass percentage. Evidence logs are in `verification/`.

## Remaining verification and limits

- **No live SQL Server/ODBC integration test was available.** Native-shaped values and actual helper code were tested through adapters. Live driver binding, SQL locking/deadlocks, migrations, constraint behavior and timestamp round trips must still be checked on SQL Server.
- **No physical ESP32 was run or flashed.** Compilation is now verified, but actual TLS/Wi-Fi, certificates, NVS persistence, sensor calibration, electrical polarity, pump flow and reboot/brownout behavior require hardware testing. Host persistence tests use a controlled storage substitute.
- Frontend dependency audit retains **14 alerts: 1 high (image-size), 9 moderate, 4 low**. Clearing them requires a compatible Expo/React Native/Metro migration; incompatible dependency overrides were not forced. The backend's dependency lock was unchanged from its zero-advisory audit. Keep development tooling private.
- UTC normalization assumes new API timestamps and already-migrated historical data are UTC. Do not reinterpret old local-time records automatically.
- Pump defaults remain disabled. The physical cycle cap remains one second and cooldown thirty minutes. A saved longer duration is a request, not proof of actual execution. After any previously recorded watering, reboot conservatively incurs a full cooldown, even if it was powered down for longer. Terminal ACK conflict recovery never triggers pump replay; a Processing result can still require owner inspection.
- Dry-soil alerts are produced on telemetry; offline alerts when notifications are retrieved, not by a continuously running scheduler. Automatic local watering is not uploaded as watering history. Static community content and the basic care helper are unchanged.
- Baseline checking protects the new UI's saves; older clients that omit the optional baseline remain compatible but do not receive compare-and-set protection.

## Run

Windows PowerShell, from the extracted Root.esp-main folder:

```powershell
cd Frontend
Copy-Item .env.example .env
npm.cmd ci
npm.cmd run check:all
npm.cmd run web
```

Demo: user@sera.app or admin@sera.app, any password of at least eight characters. Mock mode does not water real hardware. For real mode follow Frontend/README.md and provision SQL Server/backend/device explicitly.

After installing backend dependencies:

```powershell
cd Backend/Database_interface
npm.cmd run test:contracts
```

Firmware host regression (Linux/macOS with g++ and Python): set ARDUINOJSON_INCLUDE to ArduinoJson 7.4.2's src directory, then run `python3 tests/check-firmware-network-host.py`. For official board compilation use ESP32 core 3.0.7 and libraries listed above, selecting your actual board. To compile the network branch copy DeviceConfig.example.h to DeviceConfig.h and enable sync in that private test copy. Do not publish real keys.

## Existing database

No new database schema columns are required by this repair. Preserve existing data. If upgrading from versions predating authenticated devices/UTC command reliability, back up the database and follow Backend/Database/migrate-device-auth.sql and migrate-reliability.sql. Establish the original timezone of legacy timestamps and convert explicitly using AT TIME ZONE with DST handling before applying the UTC data contract. New databases use database.sql (UTF-16); the optional seed contains illustrative plant species only. Duplicate active commands require physical inspection/reconciliation before the reliability migration's unique index can be applied.
