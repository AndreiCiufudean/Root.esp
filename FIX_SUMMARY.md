# Repairs from the second deep audit

- Explicit SQL boolean, BIGINT and UTC timestamp conversion; permission checks fail closed.
- Precision-safe command/notification IDs throughout API and device acknowledgements.
- Correct certificate declaration; default and sync-enabled official ESP32 builds pass.
- Strict firmware JSON flags and floating-point soil thresholds.
- ACK status reconciliation without pump replay; persistent pre-actuation marker and reboot cooldown.
- Strict numeric form input, pristine refresh, dirty-edit preservation, conflict reload and transactional baseline checks.
- Inline command errors and accepted telemetry when optional alert generation fails.
- Password byte limit at login and early rejection of invalid plant IDs.
- Regression tests for the reproduced failures, SQL type boundaries, concurrent settings and firmware state recovery.

Read TEST_REPORT.md for results, commands, database migration notes and remaining limits. Live SQL Server and physical hardware are not verified. Frontend dependency alerts remain; an SDK migration is still needed to clear them.
