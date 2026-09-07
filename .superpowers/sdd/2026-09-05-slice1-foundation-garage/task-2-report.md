# Task 2 Report — Android environment, AVD, first boot in Expo Go (Steps 3–6)

**Status: BLOCKED**

## Summary

Step 3 ("Boot it and confirm adb sees it") fails immediately. The Android
emulator refuses to launch the `s24proxy` AVD because that AVD uses an
**x86_64** system image, and this host machine's CPU is **ARM64** (Qualcomm
Snapdragon X), not x86_64/AMD64. x86_64 guest emulation has no hardware
acceleration path on an ARM64 Windows host, and the emulator hard-refuses to
even start without it. Steps 4–6 were not attempted because they all depend
on a booted emulator.

## Commands run and output

### Pre-checks (re-verifying Step 2, per instructions)

```
$ "$LOCALAPPDATA/Android/Sdk/emulator/emulator.exe" -list-avds
s24proxy
```

```
$ "$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" devices
* daemon not running; starting now at tcp:5037
* daemon started successfully
List of devices attached
(empty)
```

Project checked: no `app/` directory present (confirmed — only `src/__tests__`
under project root as expected for a pre-Task-3 scaffold); `docs/` exists but
has no `reference/` subdirectory yet.

### Step 3: Boot it and confirm adb sees it

Launched in background:
```
$ "$LOCALAPPDATA/Android/Sdk/emulator/emulator.exe" -avd s24proxy -no-snapshot-load
```

The background process **exited immediately with code 0** (it did not stay
resident). Captured log:

```
INFO    | Android emulator version 35.2.10.0 (build_id 12414864) (CL:N/A)
INFO    | Graphics backend: gfxstream
INFO    | Found systemPath C:\Users\Smshr\AppData\Local\Android\Sdk\system-images\android-35\google_apis_playstore\x86_64\
INFO    | Duplicate loglines will be removed, if you wish to see each individual line launch with the -log-nofilter flag.
INFO    | IPv4 server found: 192.168.1.254
INFO    | Ignore IPv6 address: 603d:9615:1002:0:f02a:9615:1002:0
WARNING | Failed to process .ini file ...\avd\s24proxy.avd\quickbootChoice.ini for reading.
ERROR   | x86_64 emulation currently requires hardware acceleration!
CPU acceleration status: Android Emulator requires an Intel/AMD processor with virtualization extension support.  (Virtualization extension is not supported)
More info on configuring VM acceleration on Windows:
https://developer.android.com/studio/run/emulator-acceleration#vm-windows
```

Follow-up checks confirming the process is really gone (not just backgrounded):
```
$ adb devices
List of devices attached
(empty)

$ tasklist /FI "IMAGENAME eq qemu*"
INFO: No tasks are running which match the specified criteria.
$ tasklist /FI "IMAGENAME eq emulator*"
INFO: No tasks are running which match the specified criteria.
```

`adb shell getprop sys.boot_completed` and `adb shell wm size` were **not
reached** — there is no device for adb to talk to.

### Root-cause investigation

```
$ whoami
sadeqslaptop\smshr

$ ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
False

$ systeminfo | Select-String "System Model","System Manufacturer","Processor(s)"
System Manufacturer:           Microsoft Corporation
System Model:                  Microsoft Surface Laptop, 7th Edition
Processor(s):                  1 Processor(s) Installed.

$ (Get-CimInstance Win32_ComputerSystem).Model
Microsoft Surface Laptop, 7th Edition
$ (Get-CimInstance Win32_BaseBoard).Manufacturer
Microsoft Corporation

$ $env:PROCESSOR_ARCHITECTURE
ARM64
$ (Get-CimInstance Win32_Processor).Name
Snapdragon(R) X 10-core X1P64100 @ 3.40 GHz
$ [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture
Arm64
$ [System.Runtime.InteropServices.RuntimeInformation]::ProcessArchitecture
Arm64
```

**This machine is an ARM64 device (Snapdragon X, Surface Laptop 7 ARM SKU),
not an Intel/AMD (x86_64) machine.**

```
$ systeminfo | Select-String "Virtualization","Hyper-V"
Virtualization-based security: Status: Running
Hyper-V Requirements:          A hypervisor has been detected. Features required for
Hyper-V will not be displayed.

$ Get-WindowsOptionalFeature -Online -FeatureName "HypervisorPlatform"
Get-WindowsOptionalFeature : The requested operation requires elevation.
```
(No admin rights available in this session — `IsInRole(Administrator)` is
`False` — so elevated Windows-feature inspection/changes are not possible
even if they were the fix, which they are not here: this isn't a
disabled-feature problem, it's an ISA mismatch.)

```
$ find "$LOCALAPPDATA/Android/Sdk/system-images" -maxdepth 2 -type d
.../Android/Sdk/system-images
.../Android/Sdk/system-images/android-35
.../Android/Sdk/system-images/android-35/google_apis_playstore
```
Only one image family is installed under `android-35/google_apis_playstore`
— no ABI subfolder was even listed at depth 2 beyond the tag dir, so let's
be precise: the AVD's own config confirms the ABI actually used:

```
$ cat "$USERPROFILE/.android/avd/s24proxy.avd/config.ini" | grep -E "abi|cpu|image.sysdir|tag"
abi.type=x86_64
hw.cpu.arch=x86_64
hw.cpu.ncore=4
image.sysdir.1=system-images\android-35\google_apis_playstore\x86_64\
tag.display=Google Play
tag.displaynames=Google Play
tag.id=google_apis_playstore
tag.ids=google_apis_playstore
```

Only the **x86_64** Google Play API 35 system image is downloaded; no
**arm64-v8a** image is present. On ARM64 Windows, the emulator can only
hardware-accelerate a guest ABI that matches the host (arm64-v8a system
images run natively-accelerated via Windows Hypervisor Platform; x86/x86_64
images have no acceleration path on ARM64 Windows and the emulator refuses
to run them un-accelerated for a Play Store image).

## Why I stopped here rather than working around it

- Fixing this requires either downloading a new (`arm64-v8a`) system image
  and pointing the AVD at it, or deleting/recreating `s24proxy` with
  `system-images;android-35;google_apis_playstore;arm64-v8a` — that is
  squarely Step 2 territory (AVD creation/selection), which my instructions
  explicitly say is "already done... do not create another."
- This is a hardware/ISA mismatch, not something fixable by retrying, waiting
  longer for boot, or polling — the emulator process exits immediately and
  deterministically every time on this ABI, on this host.
- I have no admin rights in this session, so even if a Windows-feature toggle
  were relevant (it isn't — this is an ISA mismatch, not a disabled
  hypervisor feature) I could not apply it.

Steps 4, 5, 6 were **not attempted**: Step 4 (`npx expo start --android`)
needs a running/adb-visible device; Step 5's screenshot needs a running
emulator; Step 6 is just a checkpoint statement over already-completed work.
No project files were modified, no APKs were downloaded, and no `docs/reference/`
directory was created (nothing to screenshot yet).

## Current state

- Emulator: **not running**. `adb devices` shows no devices.
- Expo Go: **not installed** (never reached Step 4).
- `docs/reference/emu-smoke.png`: **does not exist**.
- No project files were modified.

## What I need from the orchestrator/user

A decision on how to proceed, since it changes Step 2's deliverable:

1. **Recreate `s24proxy` (or add a new AVD) using an `arm64-v8a` Google Play
   API 35 system image** instead of x86_64, e.g.:
   ```
   sdkmanager "system-images;android-35;google_apis_playstore;arm64-v8a"
   avdmanager create avd -n s24proxy -k "system-images;android-35;google_apis_playstore;arm64-v8a" -d pixel_8
   ```
   (may require deleting the existing x86_64-based `s24proxy` first, or using
   a different AVD name) — then Steps 3–6 can proceed normally, likely with
   the added cost of downloading the arm64-v8a system image (multi-GB) if
   it isn't cached already.
2. Or, if there is some other x86_64-capable host available for this task,
   run Task 2 there instead.

I did not make this change unilaterally because it re-opens a step I was
told was already verified and finished, and because it has a real download
cost — the brief says only the ~100 MB Expo Go APK download was
pre-approved.
