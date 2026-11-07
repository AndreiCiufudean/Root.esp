# Root.esp Frontend v1.3: what changed

## How to run (Windows / VS Code)
```powershell
cd Frontend
npm.cmd install          # needed once: adds expo-image-picker and async-storage
Copy-Item .env.example .env
npx.cmd expo start --web -c
```
Demo login: `user@sera.app` / `demopassword` (admin: `admin@sera.app` / same password). New accounts sign in with the password they registered with.

## Fixed
- **Password is now checked** (demo mode). Wrong password = "Wrong email or password."
- **Multiple plants**: add as many as you like; after adding you can "Add another plant". The demo database is saved in the browser/phone, so a refresh no longer loses plants, accounts or posts.
- **Community posting works**: posts, boards (create your own), likes, replies, photos, sticker + note colour.
- **Custom plant types**: "My own type" in Add plant (also supported by the real backend).
- **AI assistant**: no more "(Demo reply)". Offline helper answers water/status/light/yellow leaves/pests/fertilizer/temperature questions using your plants' data.
- **No-device warning** when adding a plant without a device.
- **Switch account** (Me tab): keep several accounts on one device, add another, switch with one tap.
- "ESP32 device" is now "Root.esp device" everywhere.

## New
- Animated **loading screen** with the logo and the Root.esp name (also used as in-app loader).
- **Navigation you understand without reading**: emoji icons with labels; left sidebar on wide screens (web/tablet), bottom tabs on phones; bell with badge for alerts; big emoji quick-action tiles on Home.
- **Plant mood** (😊 Happy, 🥺 Thirsty, 🥵 Too hot, 😴 Needs light, 📡 Offline) on every plant.
- **Personalisation**: per-plant emoji, colour and photo; avatar for your profile; coloured community notes and boards.
- 11 more built-in plant types.

## Notes
- In real-backend mode, plant looks and community posts are stored on the device (not yet in SQL). Custom plant types are stored in the SQL `PlantCatalog`.
- Photos: on the web they are shrunk and stored in the browser; on phones the picture file is referenced from the device.
- Because two packages were added, use `npm install` (not `npm ci`) the first time so the lock file is updated.
