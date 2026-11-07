# Root.esp v1.4

1. **Devices** – plants can now be linked, changed or unlinked after creation (plant page → "Root.esp device"; Devices → "Link to a plant"). New backend route `PUT /api/plants/:plantID/device`.
2. **Onboarding** – emotional micro-intro ending in a signature pledge; Root.esp wordmark with the logo inside the first "o"; 9-step tutorial after registration (replayable from Me).
3. **Look & feel** – green gradients, 6 themes + Auto, full dark mode (Forest, Midnight), richer sidebar on wide screens, soft sound effects (switch in Me), loading overlay on slow requests.
4. **Notifications** – bell: red dot = urgent alerts, green = social. Alerts/Social tabs, Read/Unread filter, Mark all as read, action buttons (Water plant now, Go to plant…), welcome notifications on sign-up.
5. **Community** – Instagram-style grid, inline likes, comment counts, post detail (comment/share/delete with confirmation), Follow, profiles, Following filter.
6. **Daily watering game** – hold-to-pour mini-game with Unsplash stock photos; credits in the sidebar, Me and the game screen.

## Upgrade
In `Frontend`: `npm.cmd install` (new packages: expo-av, expo-linear-gradient, expo-image-picker, async-storage), then `npx.cmd expo start --web -c`.

## Known limits
- Follows, social notifications, plant looks, community posts and game progress are stored on the device (not SQL yet).
- Sounds, gradients, image picker and the native sidebar were checked with a web shim, not on a real phone.
- Game photos load from Unsplash at runtime (emoji fallback offline).
