// Copy this file to DeviceConfig.h ONLY when you have working HTTPS and a provisioned device.
// DeviceConfig.h is intentionally excluded from version control; never publish passwords or keys.
#pragma once
#define ROOT_ESP_ENABLE_SYNC false
#define ROOT_ESP_ENABLE_REMOTE_WATERING false  // leave off until pump + sensor calibration and safety validation
#define ROOT_ESP_WIFI_SSID "your-wifi-ssid"
#define ROOT_ESP_WIFI_PASSWORD "your-wifi-password"
// Must be HTTPS; server certificate validated against this trusted CA certificate.
#define ROOT_ESP_SERVER "https://your-server-name"
static const char ROOT_ESP_CA_CERT[] = R"CERT(-----BEGIN CERTIFICATE-----
REPLACE-WITH-YOUR-ROOT-CA-PEM
-----END CERTIFICATE-----)CERT";
#define ROOT_ESP_DEVICE_ID 0
#define ROOT_ESP_DEVICE_KEY "paste-the-one-time-device-key-from-device-registration"
