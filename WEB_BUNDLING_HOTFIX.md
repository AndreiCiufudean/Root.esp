# Root.esp Phase 3 — Expo Web bundling hotfix

## Cause of the reported error

Expo Metro failed with:

```
Unable to resolve "../../assets/game/room.png" from "src/gameArt.js"
```

`src/gameArt.js` lives in `Frontend/src/`, whereas the bundled illustrations live in `Frontend/assets/game/`. Eleven `require()` references incorrectly pointed two levels upward (`../../assets/game/`), outside `Frontend/`. All eleven were corrected to `../assets/game/`.

The image files were included in the original Phase 3 ZIP; they were not missing. The `tomato.png` path, already correct, was left unchanged.

## Regression prevention

`tests/check-project.js` now validates static relative `require()` paths (including image, sound, and local CommonJS dependencies), in addition to `import` paths. It also checks that the locally bundled PNG and WAV resources have the expected file headers. This catches broken Metro `require()` references without needing a completed npm installation.

## Verification actually performed

- Static asset path resolution: PASS. All twelve game illustrations are referenced from their correct relative locations.
- Full `node tests/run-all.js` offline regression suite: PASS, including Phase 1/2/3, backend contract simulations, and firmware C++ checks.
- Direct `node tests/check-project.js`: PASS, 49 checks.
- Actual Expo web Metro bundle: **not run successfully in this environment** because dependencies are unavailable and `npm ci --offline` fails with `ENOTCACHED`. Rebuild on a computer with installed dependencies to confirm.

## Install / restart (Windows PowerShell)

Unzip to a **new folder** or overwrite the original Phase 3 project, then open the `Root.esp-main/Frontend` folder in a terminal:

```
npm.cmd ci
npm.cmd run web -- --clear
```

If dependencies are already installed, `npm.cmd ci` can be skipped; the `--clear` flag is recommended after updating the files. If Metro is already running, stop it with Ctrl+C first.

If another error appears, capture its first `Unable to resolve` line and the importing filename; do not assume the web app is fully verified until Metro has successfully bundled on your machine.

No database migration or other application changes are included in this focused bundling hotfix.
