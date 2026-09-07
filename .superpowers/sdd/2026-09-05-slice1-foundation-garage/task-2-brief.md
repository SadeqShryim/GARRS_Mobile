### Task 2: Android environment, AVD, first boot in Expo Go

**Files:** none in the repo (environment only); produces `docs/reference/emu-smoke.png`.

**Interfaces:**
- Produces: a bootable AVD `s24proxy`, `adb` reachable at `$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe`, Expo Go installed on it. Later tasks verify visuals against it.

- [ ] **Step 1: Persist `ANDROID_HOME` and PATH for the user (PowerShell)**

```powershell
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
[Environment]::SetEnvironmentVariable('ANDROID_HOME', $sdk, 'User')
$u = [Environment]::GetEnvironmentVariable('Path', 'User')
if ($u -notlike "*$sdk\platform-tools*") {
  [Environment]::SetEnvironmentVariable('Path', "$u;$sdk\platform-tools;$sdk\emulator", 'User')
}
```

Shells already open won't see this; in this session always call tools by absolute path as below.

- [ ] **Step 2: Create the AVD** — ask the user to do ONE of:

**This PC is ARM64 Windows (Snapdragon X): only `arm64-v8a` system images can run.** The first `s24proxy` was created on the x86_64 image and fails to boot; delete it and recreate on the ARM64 image (download approved by the user, ~2 GB).

(a) Android Studio → Device Manager → delete the existing `s24proxy` → **+** → **Pixel 8** → system image **API 35, arm64-v8a, Google Play** (shows a download arrow; let it download) → AVD name `s24proxy` → Finish.

(b) Android Studio → SDK Manager → SDK Tools → tick **Android SDK Command-line Tools (latest)** → Apply, then:

```bash
"$LOCALAPPDATA/Android/Sdk/cmdline-tools/latest/bin/sdkmanager.bat" "system-images;android-35;google_apis_playstore;arm64-v8a"
"$LOCALAPPDATA/Android/Sdk/cmdline-tools/latest/bin/avdmanager.bat" create avd -n s24proxy -k "system-images;android-35;google_apis_playstore;arm64-v8a" -d pixel_8 --force
```

Verify: `"$LOCALAPPDATA/Android/Sdk/emulator/emulator.exe" -list-avds` prints `s24proxy`.

- [ ] **Step 3: Boot it and confirm adb sees it**

```bash
"$LOCALAPPDATA/Android/Sdk/emulator/emulator.exe" -avd s24proxy -no-snapshot-load &
"$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" wait-for-device
"$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" shell getprop sys.boot_completed
```

Expected: `1` (retry until it is). Then `adb shell wm size` → `Physical size: 1080x2400`.

- [ ] **Step 4: Start Expo and install Expo Go** (ask the user first — downloads the Expo Go APK)

Run: `ANDROID_HOME="$LOCALAPPDATA/Android/Sdk" npx expo start --android`
Expected: Metro starts, Expo Go is installed on `s24proxy`, the app opens. With no `app/` yet it shows expo-router's "Welcome to Expo" placeholder — that is fine.

- [ ] **Step 5: Screenshot proof**

```bash
mkdir -p docs/reference
"$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" exec-out screencap -p > docs/reference/emu-smoke.png
```

Open the PNG (Read tool) and confirm it shows the emulator with the app.

- [ ] **Step 6: Checkpoint** — "chore: android emulator s24proxy boots expo go"

---

