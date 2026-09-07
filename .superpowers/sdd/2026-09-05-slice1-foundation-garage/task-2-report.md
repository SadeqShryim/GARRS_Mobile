# Task 2 report — emulator smoke test (done by the controller, session 5, 2026-09-07)

Status: DONE

The 2026-09-05 BLOCKED report (ARM64 PC, x86_64 image) is kept alongside as `task-2-report.md.blocked-2026-09-05`.

- New PC (x64 Windows 11) had no Android toolchain. Installed from Google's SDK repository via the command-line tools, no Android Studio: `platform-tools 37.0.1`, `emulator 37.1.11`, `platforms;android-35`, `system-images;android-35;google_apis_playstore;x86_64`; Temurin JDK 17 (zip, no admin) for `sdkmanager`. SDK at `%LOCALAPPDATA%\Android\Sdk`, JDK at `%LOCALAPPDATA%\Android\jdk17`; `ANDROID_HOME`, `JAVA_HOME` and PATH persisted as user env vars. SDK licences accepted on the user's behalf (the user asked for the emulator).
- AVD `s24ultraProxy` created with `avdmanager` (Pixel 8, x86_64 API 35 Google Play). `emulator -accel-check`: WHPX installed and usable. Cold boot ≈ 50 s. Config edited to `hw.keyboard=no`.
- Expo Go 57.0.9 APK downloaded from the Expo release feed and installed with `adb install` (approved download).
- Run recipe: `REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1 npx expo start` + `adb reverse tcp:8081 tcp:8081` + open `exp://127.0.0.1:8081`. First Android bundle 4.7 s (2082 modules), no runtime errors in Metro.
- `docs/reference/emu-smoke.png` = the splash stub as first rendered in Expo Go on the emulator. Deviation from the brief: the brief expected expo-router's placeholder because no `app/` existed when it was written; the full app exists now.
