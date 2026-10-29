# SeraSmart app (React Native + Expo)

## Run
    npm install
    npx expo install --fix
    npx expo start          (press w for web, a for Android emulator, or scan the QR with Expo Go)

Demo logins (mock mode): `admin@sera.app` (admin) or `user@sera.app` (has plants). Any password of 6+ characters.
Any other email creates a new empty account.

## What the app shows (matches the SQL script and SeraSmart.ino)
- Login / sign up -> Users (Username, Email, IsAdmin, IsActive)
- Home: plant stats, daily tip (from PlantCatalog.WateringAdvice), plant cards with latest SensorMeasurements and device online status
- Plant page: live readings, 24-reading soil chart, "Water now", editable PlantCareSettings, WateringHistory, PlantDiseaseReports, species info
- Add plant: UserPlants + default PlantCareSettings, species from PlantCatalog, device from EspDevices
- My devices: EspDevices (online = LastSeenAt within 5 minutes)
- Alerts: UserNotifications with unread badge
- Admin: enable/disable users (IsActive), browse PlantCatalog and DiseaseCatalog
- AI assistant: sends your question plus a snapshot of your plants' readings
- Community on Home is still mock data: the SQL script has no table for it yet

Thresholds in `src/logic.js` are copied from SeraSmart.ino: soil dry < 30, ideal 45, too wet > 70; light 50 / 500 / 2000;
fan on above 28 C and off at or below 24 C.

## Connecting to the real database
The app cannot talk to SQL Server directly. You need a small backend (for example Node.js + Express + the `mssql` package):

    ESP32  --HTTP POST-->  backend  --SQL-->  SQL Server  <--SQL--  backend  <--HTTP--  app

1. In `src/api.js` set `USE_MOCK = false` and `BASE_URL` to your backend (your PC's IP when testing on a phone).
2. The backend must return JSON with the same column names as the tables. Endpoints used by the app:

| Method | Path | Does |
|---|---|---|
| POST | /auth/login, /auth/register | returns the Users row (never the hash) |
| GET | /users/:id/plants | UserPlants + species, device, settings, latest measurement |
| POST | /users/:id/plants | creates plant + default PlantCareSettings |
| GET | /plants/:id | plant detail, history (24 readings), watering, activities, reports, possibleDiseases |
| PUT | /plants/:id/settings | updates PlantCareSettings (validate like the CHECK constraints) |
| POST | /plants/:id/water | inserts a DeviceCommands row (see db/fixes.sql) |
| GET / POST | /users/:id/devices | EspDevices |
| GET | /users/:id/notifications, POST /notifications/:id/read, POST /users/:id/notifications/read-all | UserNotifications |
| GET | /catalog | { species, diseases } |
| GET / PUT | /admin/users, /admin/users/:id | list users, set IsActive |
| POST | /assistant | { question, plants } -> { answer } (calls the AI API from the server) |

3. ESP32 side (not done yet in SeraSmart.ino): connect to Wi-Fi, then every ~30 s POST the readings
   (device code, soil %, temperature, humidity, light, fan state) to the backend, which inserts into SensorMeasurements
   and updates EspDevices.LastSeenAt. Also poll for pending DeviceCommands and read PlantCareSettings, so the
   thresholds in the app replace the constants in the sketch.

## SQL changes
`db/fixes.sql`: filtered unique index for UserPlants.DeviceID, and a DeviceCommands table for "Water now".
