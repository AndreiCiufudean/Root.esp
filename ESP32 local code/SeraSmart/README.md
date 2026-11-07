# ESP32 firmware — calibration, safety, optional HTTPS sync

- Light sensor bug fixed: analog input is now correctly converted into **estimated 0–100%** (not measured lux). Light classification uses that scale in both firmware and frontend.
- Soil moisture mapping corrected (wet=100%, dry=0%). Sample ADC endpoints in `SenzorUmiditateSol.h` are **placeholders**: calibrate against the actual sensor (wiring polarity can invert readings).
- DHT11 is sampled every 2.5 seconds and invalid readings disable the fan.
- **Local pump automation defaults to OFF**. Even when manually enabled in firmware, there is a hard 1-second run limit and 30-minute cooldown. Check the power supply, sensor calibration, output polarity, water level and physical overflow protection on real hardware.

## Opt-in ESP32 ↔ backend sync

1. Complete SQL setup and run `Backend/Database/migrate-device-auth.sql` **only if upgrading an old database**.
2. Ensure HTTPS access to your backend with a valid certificate (or a trusted test CA). Do **not** use insecure TLS bypass.
3. Register a new ESP32 under Devices in the app. The backend returns a one-time 64-character secret. Existing devices can rotate their key. Save it privately.
4. Copy `DeviceConfig.example.h` to `DeviceConfig.h`. Supply your Wi-Fi credentials, HTTPS server name, trusted CA, device ID and one-time key. Set `ROOT_ESP_ENABLE_SYNC true` only after provisioning. **Never commit `DeviceConfig.h`**.
5. Set `ENABLE_DEVICE_API=true` on the backend. Leave `DEVICE_API_REQUIRE_HTTPS=true` (default), and enable TLS on the API or via a correctly configured trusted local reverse proxy.
6. In Arduino IDE install the Espressif ESP32 board package, Adafruit DHT sensor library and ArduinoJson 7; select your actual board. Build and upload, then test telemetry and command acknowledgements on actual hardware.
7. `ROOT_ESP_ENABLE_REMOTE_WATERING` defaults to false. A remote water request will be reported as `Failed` until you explicitly enable and validate hardware operation. Even if enabled, each command runs **at most one second** and cannot execute if the soil is flagged wet or cooling down. If an acknowledgement is lost, the command stays `Processing` to prevent automatic repeated watering.

Existing offline/default firmware works without Wi-Fi, ArduinoJson or a config header. The optional network code is unverified on real ESP32 hardware: TLS certificate, network, calibration and actuator operation still require physical testing. No working internet endpoint or certificate is included.

## Updated synchronization behavior
Saved care settings are fetched every 30 seconds. They expire after two minutes without a valid response; automatic controls are disabled until a fresh config arrives. Pump hardware opt-ins and one-second cap remain in effect. ACK failures retry only the saved acknowledgement while the process stays running, never the pump action. After reboot the server's Processing command requires owner inspection and manual closure in the plant screen after ten minutes. See root TEST_REPORT.md.

## Second-audit repairs and verified build

The CA placeholder is now a static char array, and both default and sync-enabled configurations compile with official ESP32 core 3.0.7, DHT 1.4.6, Unified Sensor 1.1.15 and ArduinoJson 7.4.2. Do not confuse compilation with successful physical/TLS testing.

Configuration flags must be actual JSON booleans; other values disable automatic controls. Fractional soil thresholds are preserved. Command IDs are positive decimal strings up to SQL BIGINT maximum and are never converted through a 32-bit integer.

ACK retries never repeat actuation. A terminal conflict queries the authenticated command-status endpoint and clears an already completed/failed/missing report before allowing later polls. The pump's persistent watering marker is written through Preferences before actuation; storage failure prevents the pump from starting. On reboot, a prior marker restarts a full thirty-minute cooldown conservatively. The marker remains set: even a long power-off incurs this cooldown. Both pump opt-ins remain disabled, the one-second cap remains in effect, and real NVS/brownout/calibration tests are still required.
