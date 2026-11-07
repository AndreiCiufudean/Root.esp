# Build an Android APK with Expo

Root.esp is an Expo (SDK 52) app, so an installable `.apk` is built with **EAS Build**. The default `apk` profile builds the **demo version** (mock data, no server needed): sign in with `user@sera.app` / `demopassword` (kids: `kidspassword`).

## 1. One-time setup (on your PC, inside `Frontend/`)

```powershell
npm install                 # installs everything, including expo-av (kids music), and updates package-lock.json
npx expo install --fix      # lines up every package with Expo SDK 52
npx eas-cli@latest login    # free Expo account: https://expo.dev/signup
npx eas-cli@latest init     # links this folder to an Expo project (adds extra.eas.projectId to app.json)
```

> v2.5 added `expo-av`. Run `npm install` once (not `npm ci`) so `package-lock.json` includes it, then commit the updated lockfile. EAS installs from the lockfile.

## 2. Build the APK in the cloud (easiest, no Android Studio needed)

```powershell
npm run apk                 # = eas build -p android --profile apk
```

It takes about 10–20 minutes. When it finishes, EAS prints a link and a QR code. Open it on the phone, download the `.apk` and install it (allow "Install unknown apps" for your browser the first time).

## 3. Other options

| Command | What it does | Needs |
|---|---|---|
| `npm run apk:local` | Same EAS build on your own computer | Linux/macOS (or WSL), JDK 17, Android SDK |
| `npm run apk:gradle` | Generates the `android/` folder and runs Gradle; APK lands in `android/app/build/outputs/apk/release/` | JDK 17, Android SDK (Android Studio), Windows OK |
| `npx eas-cli build -p android --profile apk-real-backend` | APK that talks to your Node API | Edit `EXPO_PUBLIC_API_URL` in `eas.json` to your PC's LAN IP first |

## Troubleshooting

- `Cannot read properties of undefined (reading 'extract')` in **Prebuild**, then `eas-build-inject-android-credentials.gradle` ENOENT: an `overrides.tar` entry in package.json forced tar v7, which Expo's prebuild cannot use. It was removed in v2.5.1; run `npm install` again.
- `git command not found`: install Git (git-scm.com) or set `$env:EAS_NO_VCS = "1"` for the session.

## App identity

- Name: **Root.esp**, Android package `com.rootesp.app`, version 2.5.0 (versionCode 25). Raise `versionCode` in `app.json` for every APK you hand out, so phones accept it as an update.
- Permissions: internet and photo picker only; the microphone is blocked (`expo-av` is only used to play the kids' music).
