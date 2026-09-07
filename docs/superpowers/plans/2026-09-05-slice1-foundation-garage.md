# Slice 1 — Foundation + Garage Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Expo/React Native port of the Recall Hub prototype and ship the Garage tab pixel-faithfully — theme, fixtures, store, effect primitives, hump tab bar, overlays, and the verification loop — running in Expo Go on a Samsung S24 Ultra.

**Architecture:** expo-router Tabs with a custom hump tab bar; the vehicle-stats screen is a no-animation stack route inside the garage tab; one zustand store mirrors the design's state field-for-field; sheets, toast, VIN-help, and the splash stub render as absolutely-positioned overlays above the navigator (never RN `<Modal>`). Screens are router-free and take navigation callbacks as props; only `app/` route files and `OverlayHost` touch the router.

**Tech Stack:** Expo SDK 57 (RN ≥ 0.76, New Architecture), TypeScript, expo-router, zustand 5, react-native-reanimated, react-native-svg, expo-blur, expo-linear-gradient, @react-native-masked-view/masked-view, @expo-google-fonts/geist + geist-mono, Remixicon 4.5.0 (TTF via `createIconSet`), jest-expo + @testing-library/react-native, Playwright (dev, for baking assets and reference screenshots).

**Spec:** `docs/superpowers/specs/2026-09-05-slice1-foundation-garage-design.md` — every measurement in this plan comes from it; the spec cites `design_handoff_recall_hub/design/GaragePrototype.dc.html` line numbers, which win over both documents.

## Global Constraints

- **Git is on hold by the user's instruction.** Every task ends with a **Checkpoint** step (typecheck + tests) instead of a commit. When the user lifts the hold, commit task-by-task using the checkpoint messages as commit messages.
- **Fidelity first.** Values are the design's, in dp, unscaled. Never "improve" spacing, copy, colours, or timing. Where a platform cannot match, match intent and record the gap in `docs/reference/verification.md`.
- **Target device:** Samsung S24 Ultra — Android 14+, ~412 dp wide, 120 Hz. Emulator proxy: AVD `s24proxy`, Pixel 8 profile (411 dp), `system-images;android-35;google_apis_playstore;x86_64`.
- **Layout derives from `useWindowDimensions().width`**, never from the 430 design width. Rail padding = `(width − 318) / 2`.
- **Fonts:** Geist 300/400/500/600, Geist Mono 400/500. Every `Text` uses `allowFontScaling={false}` and `includeFontPadding: false`.
- **Icons:** Remixicon 4.5.0 glyphs only, by name without the `ri-` prefix (`'menu-2-line'`). Never substitute another icon set.
- **Overlays** (sheet, VIN help, toast, splash stub) render in `OverlayHost` as absolute siblings of the navigator. Never RN `<Modal>`.
- **`expo-blur`:** use `blurMethod="dimezisBlurViewSdk31Plus"` (`experimentalBlurMethod` is deprecated) and always pass `blurTarget`.
- **Package manager:** npm. Install Expo-managed packages with `npx expo install`.
- **Downloads that need the user's OK before running:** Playwright's Chromium (~150 MB), Expo Go onto the emulator (~100 MB), any Android system image or cmdline-tools.
- **Not in this slice:** Skia, `expo-glass-effect`, Instrument Serif, the real Splash/Auth, Recalls/Service/Hub/Profile content, iOS.

## File map

```
app/_layout.tsx                    fonts, providers, DotPattern, BlurTargetView, <Slot/>, OverlayHost
app/(tabs)/_layout.tsx             Tabs + HumpTabBar
app/(tabs)/garage/_layout.tsx      Stack, animation 'none'
app/(tabs)/garage/index.tsx        GarageScreen route
app/(tabs)/garage/[id].tsx         VehicleStatsScreen route
app/(tabs)/{recalls,service,hub,profile}.tsx   TabStub routes
src/theme/tokens.ts                colours, fonts, easings, durations, blur, layout
src/lib/gradient.ts                cssAngleToPoints
src/lib/derive.ts                  fleetLine, counter, vinOk, maskVin, decodeVin, statsFor, isOpenRecall, recallCount
src/lib/rail.ts                    rail geometry + tripled-list index math
src/fixtures/types.ts              Vehicle, Recall, TabId
src/fixtures/{vehicles,decode,tabs,vinHelp,recallSheet}.ts
src/store/useAppStore.ts           zustand store + resetAppStore
src/ui/{Icon,Txt,DotPattern,MetalButton,GlowCard,HumpTabBar,Sheet,SlideUpScreen,Toast,HealthGauge,OutlinePill}.tsx
src/overlays/blurTarget.tsx        AppBlurTarget context
src/overlays/OverlayHost.tsx
src/screens/{GarageScreen,VehicleStatsScreen,AddVehicleSheet,VinHelpScreen,RecallSheet,TabStub,SplashStub}.tsx
src/screens/garage/{VehicleCard,Rail,Pager}.tsx
src/assets/fonts/remixicon.ttf     copied by scripts/build-remix-glyphmap.mjs
src/assets/remixicon.glyphmap.json generated
src/assets/images/{metal-blue,metal-mix,metal-default,glow-blob}.png   generated
scripts/{build-remix-glyphmap,bake-assets,reference-shots}.mjs
jest.setup.ts
docs/reference/*.png, docs/reference/verification.md
```

---

### Task 1: Scaffold the Expo project and test tooling

**Files:**
- Create (via template, then trimmed): `package.json`, `app.json`, `tsconfig.json`, `babel.config.js`, `assets/`
- Create: `jest.setup.ts`, `src/__tests__/smoke.test.tsx`
- Delete from template: `app/`, `components/`, `hooks/`, `constants/`, `scripts/reset-project.js`

**Interfaces:**
- Produces: a runnable Expo app (`npm run android`), `npm test`, `npm run typecheck`, and a jest environment where Reanimated, safe-area, expo-blur, masked-view, linear-gradient and `@expo/vector-icons` are mocked (see `jest.setup.ts`). Every later test relies on this setup.

- [ ] **Step 1: Generate the template beside the repo and move it in**

```bash
cd /c/GARRS_Mobile
npx create-expo-app@latest recall-hub-tmp --template default --no-install
shopt -s dotglob
mv recall-hub-tmp/* .
rmdir recall-hub-tmp
rm -rf app components hooks constants scripts/reset-project.js
```

- [ ] **Step 2: Set `app.json`**

Replace the `expo` object's identity fields (keep the template's `plugins`, `experiments`, `web` entries):

```json
{
  "expo": {
    "name": "Recall Hub",
    "slug": "recall-hub",
    "scheme": "recallhub",
    "version": "0.1.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "android": {
      "package": "com.garrs.recallhub",
      "edgeToEdgeEnabled": true,
      "softwareKeyboardLayoutMode": "resize",
      "adaptiveIcon": { "foregroundImage": "./assets/images/adaptive-icon.png", "backgroundColor": "#08080A" }
    },
    "ios": { "supportsTablet": false }
  }
}
```

In the `expo-splash-screen` plugin entry set `"backgroundColor": "#08080A"`.

- [ ] **Step 3: Install dependencies**

```bash
npm install
npx expo install expo-blur expo-linear-gradient react-native-svg @react-native-masked-view/masked-view @expo-google-fonts/geist @expo-google-fonts/geist-mono
npm install zustand@5 remixicon@4.5.0
npx expo install jest-expo jest @testing-library/react-native -- --save-dev
npm install --save-dev pngjs @types/jest
```

- [ ] **Step 4: Add scripts and jest config to `package.json`**

```json
"scripts": {
  "start": "expo start",
  "android": "expo start --android",
  "test": "jest",
  "typecheck": "tsc --noEmit",
  "build-glyphmap": "node scripts/build-remix-glyphmap.mjs",
  "bake-assets": "node scripts/bake-assets.mjs",
  "serve-design": "node scripts/serve-design.mjs"
},
"jest": {
  "preset": "jest-expo",
  "setupFilesAfterEnv": ["<rootDir>/jest.setup.ts"],
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)"
  ]
}
```

- [ ] **Step 5: Write `jest.setup.ts`**

```ts
import React from 'react';
import { Text, View } from 'react-native';

require('react-native-reanimated').setUpTests();

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock'));

jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true, loadAsync: jest.fn() }));

jest.mock('@expo/vector-icons', () => ({
  createIconSet: () => (props: { name: string; size?: number; color?: string; style?: unknown }) =>
    React.createElement(Text, { testID: `icon-${props.name}`, style: props.style }, props.name),
}));

jest.mock('expo-blur', () => ({
  BlurView: (p: Record<string, unknown>) => React.createElement(View, p),
  BlurTargetView: React.forwardRef<View, Record<string, unknown>>((p, ref) => React.createElement(View, { ...p, ref })),
}));

jest.mock('@react-native-masked-view/masked-view', () => ({
  __esModule: true,
  default: ({ children, style }: { children: React.ReactNode; style?: unknown }) => React.createElement(View, { style }, children),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: (p: { children?: React.ReactNode; style?: unknown }) => React.createElement(View, { style: p.style }, p.children),
}));
```

- [ ] **Step 6: Write the smoke test**

`src/__tests__/smoke.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

function Fader() {
  const v = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ opacity: v.value }));
  return <Animated.View testID="fader" style={style} />;
}

describe('toolchain', () => {
  it('renders plain text', () => {
    const { getByText } = render(<Text>hello</Text>);
    expect(getByText('hello')).toBeTruthy();
  });
  it('renders a reanimated view', () => {
    const { getByTestId } = render(<Fader />);
    expect(getByTestId('fader')).toBeTruthy();
  });
});
```

- [ ] **Step 7: Run the smoke test**

Run: `npm test -- src/__tests__/smoke.test.tsx`
Expected: 2 passing. If the Reanimated test fails with an error mentioning `react-native-worklets`, add this line to the top of `jest.setup.ts` and re-run: `jest.mock('react-native-worklets', () => require('react-native-worklets/mock'));`

- [ ] **Step 8: Typecheck and doctor**

Run: `npm run typecheck && npx expo-doctor`
Expected: no TypeScript errors; expo-doctor reports no failures (warnings about unversioned packages like `zustand`/`remixicon` are acceptable).

- [ ] **Step 9: Checkpoint** — "chore: scaffold Expo SDK 57 app with jest tooling"

---

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

### Task 3: Reference screenshots of the design

**Files:**
- Create: `scripts/serve-design.mjs`
- Produces: `docs/reference/{garage-idle,garage-card2,stats-taycan,stats-model-s,sheet-add-empty,sheet-add-sample,vin-help,sheet-recall,garage-added-toast,tab-recalls,tab-profile}.png`

**Interfaces:**
- Produces: the reference PNGs every visual verification step compares against, 430 × 932 logical px. Captured with the **Playwright MCP server attached to this session** (`mcp__plugin_playwright_playwright__browser_*`) — no npm Playwright, no Chromium download. The user declined the Playwright download; if the MCP cannot launch a browser either, fall back to the Claude-in-Chrome extension (`mcp__claude-in-chrome__*`) for *live* comparison in Task 22 — its screenshots land in the conversation, not on disk — and write `reference: live (Chrome extension)` in `verification.md`.

- [ ] **Step 1: Write `scripts/serve-design.mjs`** — a dependency-free static server so the design loads over `http://` (browser access to `file://` is inconsistent)

```js
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = resolve('design_handoff_recall_hub/design');
const PORT = Number(process.env.PORT ?? 4173);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css' };

createServer((req, res) => {
  const path = normalize(decodeURIComponent((req.url ?? '/').split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  const file = join(ROOT, path === '/' || path === '\\' ? 'GaragePrototype.dc.html' : path);
  if (!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`design served at http://localhost:${PORT}/GaragePrototype.dc.html`));
```

Add to `package.json` scripts: `"serve-design": "node scripts/serve-design.mjs"`.

- [ ] **Step 2: Start it in the background**

Run (Bash, `run_in_background`): `npm run serve-design`
Expected: `design served at http://localhost:4173/GaragePrototype.dc.html`. The page needs internet for its CDN fonts, Remixicon and React.

- [ ] **Step 3: Load the browser tools** (one call)

ToolSearch: `select:mcp__plugin_playwright_playwright__browser_navigate,mcp__plugin_playwright_playwright__browser_resize,mcp__plugin_playwright_playwright__browser_snapshot,mcp__plugin_playwright_playwright__browser_find,mcp__plugin_playwright_playwright__browser_click,mcp__plugin_playwright_playwright__browser_wait_for,mcp__plugin_playwright_playwright__browser_take_screenshot,mcp__plugin_playwright_playwright__browser_evaluate,mcp__plugin_playwright_playwright__browser_close`

- [ ] **Step 4: Open the design at the frame size**

`browser_navigate` → `http://localhost:4173/GaragePrototype.dc.html`; `browser_resize` → width 430, height 932; `browser_evaluate` → `document.body.style.margin='0'; document.body.style.background='#fff'; document.fonts.ready.then(()=>'fonts ok')`. If launching fails with a "browser not installed" error, this is the fallback trigger described in Interfaces — stop and use the Chrome extension path.

- [ ] **Step 5: Capture the states** — for each row: reach the state, `browser_wait_for` the listed time, then `browser_take_screenshot` with `filename` = `docs/reference/<name>.png` (viewport only, no `fullPage`). To click, `browser_snapshot` (or `browser_find` with the text) and click the matching `ref`.

| # | Get there | wait | name |
|---|---|---|---|
| 1 | After navigate, wait 8 s (splash timeline 7.1 s), click the **Google** pill | 0.7 s | `garage-idle` |
| 2 | Click the **Taycan 4S** card | 0.7 s | `garage-card2` |
| 3 | Click **Taycan 4S** again | 1.8 s | `stats-taycan` |
| 4 | Click the back arrow (`ri-arrow-left-line`), click **Model S Plaid** twice (second after 0.7 s) | 1.8 s | `stats-model-s` |
| 5 | Back arrow; click **Add Vehicle** | 0.5 s | `sheet-add-empty` |
| 6 | Click **Use sample VIN** | 0.4 s | `sheet-add-sample` |
| 7 | Click the info button (aria-label *Where do I find my VIN?*) | 0.6 s | `vin-help` |
| 8 | Click **Close** (top-left), click **Add to garage** | 0.6 s | `garage-added-toast` |
| 9 | Wait 2.2 s; click **Rear camera image failure** | 0.5 s | `sheet-recall` |
| 10 | Click the scrim (top of the page, e.g. `browser_evaluate` → `document.querySelector('[style*="rgba(23,22,26,0.28)"]').click()`); click tab **RECALLS** (aria-label) | 0.8 s | `tab-recalls` |
| 11 | Click tab **PROFILE** | 0.8 s | `tab-profile` |

- [ ] **Step 6: Check the PNGs with the Read tool**

Expected: `garage-idle` shows the header, "3 VEHICLES · 1 RECALL", the Model S card with a pink/red glow; `stats-model-s` shows the gauge at 65 "Fair"; `sheet-add-sample` shows the "F-150 Lightning" preview; `sheet-recall` shows four rows and the blue "Schedule Repair". A wrong state means a click landed elsewhere — redo that row; do not keep a wrong reference.

- [ ] **Step 7: Close the browser and stop the server** — `browser_close`; kill the background `serve-design` task.

- [ ] **Step 8: Checkpoint** — "chore: reference screenshots of the design's garage states"

---

### Task 4: Bake effect assets and build the Remixicon glyph map

**Files:**
- Create: `scripts/bake-assets.mjs`, `scripts/build-remix-glyphmap.mjs`
- Create (generated): `src/assets/images/{metal-blue,metal-mix,metal-default,glow-blob}.png`, `src/assets/remixicon.glyphmap.json`, `src/assets/fonts/remixicon.ttf`
- Test: `src/assets/__tests__/assets.test.ts`

**Interfaces:**
- Produces: `metal-*.png` — 1536 × 1536 RGBA: the 8-stop conic ramp (`from 0deg`, clockwise from 12 o'clock, ending on the first colour) with a Gaussian blur of σ = 1.5 logical px baked in, rendered at 768 logical px × 2. `glow-blob.png` — 612 × 612 RGBA: a 210 px circle filled with `linear-gradient(90deg,#ec4899,#ef4444,#eab308)`, blurred σ = 16 logical px, with a 48 px bleed on every side, × 2. Constants consumers use: bezel logical 768, blob baked 210, bleed 48 (`layout.*` in tokens). `remixicon.glyphmap.json` — `{ [name]: codePoint }` keyed WITHOUT the `ri-` prefix. Rasterised in pure Node with `pngjs` — no browser. CSS `filter: blur(r)` is a Gaussian with standard deviation `r`, so σ below equals the CSS radius.

- [ ] **Step 1: Write `scripts/build-remix-glyphmap.mjs`**

```js
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';

const src = JSON.parse(readFileSync('node_modules/remixicon/fonts/remixicon.glyph.json', 'utf8'));
const map = {};
for (const [name, v] of Object.entries(src)) {
  const m = /&#x([0-9A-Fa-f]+);/.exec(v.unicode);
  if (m) map[name] = parseInt(m[1], 16);
}
mkdirSync('src/assets/fonts', { recursive: true });
writeFileSync('src/assets/remixicon.glyphmap.json', JSON.stringify(map));
copyFileSync('node_modules/remixicon/fonts/remixicon.ttf', 'src/assets/fonts/remixicon.ttf');
console.log(`wrote ${Object.keys(map).length} glyphs`);
```

- [ ] **Step 2: Write `scripts/bake-assets.mjs`**

```js
import { mkdirSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const OUT = 'src/assets/images';
mkdirSync(OUT, { recursive: true });

const SCALE = 2;              // output device px per logical px
const BEZEL = 768;            // logical px; MetalButton scales this to width * 2.4
const BLOB = 210;             // logical px; GlowCard scales to the card's blob size
const BLEED = 48;             // logical px of room for the blur to spill
const RAMPS = {
  default: ['#6F8EA3', '#D6EAF6', '#243642', '#A8C6D8', '#101B24', '#E8F6FF', '#3E5B6B', '#8FB2C6'],
  blue: ['#1B6E96', '#8ACEFF', '#E8F6FF', '#B8E2FF', '#0E5378', '#F4FBFF', '#4E9DC4', '#A7DAFF'],
  mix: ['#8A8A8A', '#EDEDED', '#2B2B2B', '#8ACEFF', '#141414', '#E8F6FF', '#3E5B6B', '#A6A6A6'],
};

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const lerp = (a, b, t) => a + (b - a) * t;

// conic-gradient(from 0deg, ...ramp, ramp[0]) — 0deg at 12 o'clock, clockwise.
function conic(ramp, size) {
  const stops = [...ramp, ramp[0]].map(hex);
  const segs = stops.length - 1;
  const png = new PNG({ width: size, height: size });
  const c = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let a = Math.atan2(x + 0.5 - c, -(y + 0.5 - c));     // clockwise from up
      if (a < 0) a += Math.PI * 2;
      const t = (a / (Math.PI * 2)) * segs;
      const i = Math.min(segs - 1, Math.floor(t));
      const f = t - i;
      const o = (y * size + x) * 4;
      for (let k = 0; k < 3; k++) png.data[o + k] = Math.round(lerp(stops[i][k], stops[i + 1][k], f));
      png.data[o + 3] = 255;
    }
  }
  return png;
}

// A circle of diameter d centred in a (d + 2*bleed) canvas, filled left→right with the three-stop gradient, anti-aliased edge.
function blobDisc(d, bleed) {
  const size = d + 2 * bleed;
  const png = new PNG({ width: size, height: size });
  const stops = ['#ec4899', '#ef4444', '#eab308'].map(hex);
  const r = d / 2;
  const cx = bleed + r;
  const cy = bleed + r;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const cover = Math.max(0, Math.min(1, r - dist + 0.5));
      const u = Math.max(0, Math.min(1, (x + 0.5 - bleed) / d));   // 90deg gradient across the circle's box
      const seg = u < 0.5 ? 0 : 1;
      const f = (u - seg * 0.5) / 0.5;
      const o = (y * size + x) * 4;
      for (let k = 0; k < 3; k++) png.data[o + k] = Math.round(lerp(stops[seg][k], stops[seg + 1][k], f));
      png.data[o + 3] = Math.round(cover * 255);
    }
  }
  return png;
}

// Separable Gaussian blur on premultiplied RGBA; edges are treated as transparent (like CSS filter on an element).
function blur(png, sigma) {
  const { width: w, height: h, data } = png;
  const rad = Math.ceil(sigma * 3);
  const k = [];
  let sum = 0;
  for (let i = -rad; i <= rad; i++) { const v = Math.exp(-(i * i) / (2 * sigma * sigma)); k.push(v); sum += v; }
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  const pre = new Float32Array(w * h * 4);
  for (let p = 0; p < w * h; p++) {
    const a = data[p * 4 + 3] / 255;
    pre[p * 4] = data[p * 4] * a; pre[p * 4 + 1] = data[p * 4 + 1] * a; pre[p * 4 + 2] = data[p * 4 + 2] * a; pre[p * 4 + 3] = a;
  }
  const tmp = new Float32Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let i = -rad; i <= rad; i++) {
      const xx = x + i; if (xx < 0 || xx >= w) continue;
      const s = (y * w + xx) * 4, kv = k[i + rad];
      r += pre[s] * kv; g += pre[s + 1] * kv; b += pre[s + 2] * kv; a += pre[s + 3] * kv;
    }
    const d = (y * w + x) * 4; tmp[d] = r; tmp[d + 1] = g; tmp[d + 2] = b; tmp[d + 3] = a;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let i = -rad; i <= rad; i++) {
      const yy = y + i; if (yy < 0 || yy >= h) continue;
      const s = (yy * w + x) * 4, kv = k[i + rad];
      r += tmp[s] * kv; g += tmp[s + 1] * kv; b += tmp[s + 2] * kv; a += tmp[s + 3] * kv;
    }
    const d = (y * w + x) * 4;
    data[d] = a > 0 ? Math.round(r / a) : 0; data[d + 1] = a > 0 ? Math.round(g / a) : 0; data[d + 2] = a > 0 ? Math.round(b / a) : 0;
    data[d + 3] = Math.round(Math.min(1, a) * 255);
  }
}

for (const [tint, ramp] of Object.entries(RAMPS)) {
  const png = conic(ramp, BEZEL * SCALE);
  blur(png, 1.5 * SCALE);
  writeFileSync(`${OUT}/metal-${tint}.png`, PNG.sync.write(png));
  console.log(`metal-${tint}.png ${png.width}x${png.height}`);
}
const disc = blobDisc(BLOB * SCALE, BLEED * SCALE);
blur(disc, 16 * SCALE);
writeFileSync(`${OUT}/glow-blob.png`, PNG.sync.write(disc));
console.log(`glow-blob.png ${disc.width}x${disc.height}`);
```

Note the bezel is opaque and gets clipped to a 2 px rim at runtime, so treating its outer edge as transparent during the blur only darkens the outermost 1–2 device pixels, which never show.

- [ ] **Step 3: Write the test** `src/assets/__tests__/assets.test.ts`

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import glyphs from '../remixicon.glyphmap.json';

const USED_ICONS = [
  'menu-2-line', 'notification-3-line', 'sparkling-2-line', 'more-fill', 'close-circle-fill', 'checkbox-circle-fill',
  'shield-check-line', 'arrow-right-up-line', 'error-warning-line', 'arrow-right-s-line', 'arrow-left-line',
  'alarm-warning-fill', 'calendar-2-line', 'shield-check-fill', 'pulse-line', 'dashboard-3-line', 'oil-line',
  'loader-2-line', 'battery-charge-line', 'information-line', 'file-list-3-line', 'camera-line', 'close-line',
  'window-line', 'car-line', 'file-text-line', 'settings-3-line', 'keyboard-line', 'checkbox-circle-line',
  'inbox-fill', 'inbox-line', 'error-warning-fill', 'tools-fill', 'tools-line', 'book-2-fill', 'book-2-line',
  'user-fill', 'user-line', 'restart-line',
];

function png(file: string) {
  const b = readFileSync(resolve(__dirname, '..', 'images', file));
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colorType: b[25] };
}

describe('remixicon glyph map', () => {
  it('maps names without the ri- prefix to code points', () => {
    expect(typeof (glyphs as Record<string, number>)['menu-2-line']).toBe('number');
    expect((glyphs as Record<string, number>)['ri-menu-2-line']).toBeUndefined();
  });
  it.each(USED_ICONS)('has %s', (name) => {
    expect((glyphs as Record<string, number>)[name]).toBeGreaterThan(0);
  });
});

describe('baked assets', () => {
  it.each(['metal-blue.png', 'metal-mix.png', 'metal-default.png'])('%s is 1536x1536 RGBA', (f) => {
    expect(png(f)).toEqual({ w: 1536, h: 1536, colorType: 6 });
  });
  it('glow-blob.png is 612x612 RGBA', () => {
    expect(png('glow-blob.png')).toEqual({ w: 612, h: 612, colorType: 6 });
  });
});
```

- [ ] **Step 4: Run the test to see it fail**

Run: `npm test -- src/assets`
Expected: FAIL — cannot find `../remixicon.glyphmap.json`.

- [ ] **Step 5: Generate everything**

Run: `npm run build-glyphmap && npm run bake-assets`
Expected: "wrote 3020 glyphs", then four lines ending in `1536x1536` ×3 and `612x612`. Baking takes a few seconds.

- [ ] **Step 6: Run the test to see it pass, then look at the PNGs**

Run: `npm test -- src/assets` → all pass. Open `src/assets/images/metal-blue.png` and `glow-blob.png` with the Read tool: the bezel is a chrome colour wheel starting with deep blue at 12 o'clock sweeping clockwise through light blue, near-white, blue, deep blue, white, mid-blue, light blue and back; the blob is a soft pink→red→amber disc fading to transparent well inside the canvas edge.

- [ ] **Step 7: Checkpoint** — "feat: bake metal bezels and glow blob in pure node; build remixicon glyph map"

---

### Task 5: Theme tokens and the CSS-angle gradient helper

**Files:**
- Create: `src/theme/tokens.ts`, `src/lib/gradient.ts`
- Test: `src/lib/__tests__/gradient.test.ts`

**Interfaces:**
- Produces: `color`, `font`, `ease`, `dur`, `blur`, `layout` constants and `bez(e)`; `cssAngleToPoints(deg, w, h): { start: {x,y}, end: {x,y} }` for `expo-linear-gradient`.

- [ ] **Step 1: Write the failing gradient test**

```ts
import { cssAngleToPoints } from '../gradient';

const close = (a: number, b: number) => Math.abs(a - b) < 1e-6;

describe('cssAngleToPoints', () => {
  it('180deg is top to bottom', () => {
    const { start, end } = cssAngleToPoints(180, 100, 50);
    expect(close(start.x, 0.5) && close(start.y, 0) && close(end.x, 0.5) && close(end.y, 1)).toBe(true);
  });
  it('90deg is left to right', () => {
    const { start, end } = cssAngleToPoints(90, 100, 50);
    expect(close(start.x, 0) && close(start.y, 0.5) && close(end.x, 1) && close(end.y, 0.5)).toBe(true);
  });
  it('160deg on a 132x44 box extends past the box like CSS does', () => {
    const { start, end } = cssAngleToPoints(160, 132, 44);
    expect(start.y).toBeLessThan(0);
    expect(end.y).toBeGreaterThan(1);
    expect(end.x).toBeGreaterThan(start.x);
  });
});
```

- [ ] **Step 2: Run it** — `npm test -- gradient` → FAIL (module not found).

- [ ] **Step 3: Write `src/lib/gradient.ts`**

```ts
// CSS linear-gradient angle → expo-linear-gradient start/end points.
// The gradient line runs through the centre at angle θ (0 = to top, clockwise)
// and its length is |w·sinθ| + |h·cosθ| per the CSS spec.
export function cssAngleToPoints(deg: number, w: number, h: number) {
  const t = (deg * Math.PI) / 180;
  const dx = Math.sin(t);
  const dy = -Math.cos(t);
  const len = Math.abs(w * dx) + Math.abs(h * dy);
  const cx = w / 2;
  const cy = h / 2;
  return {
    start: { x: (cx - (dx * len) / 2) / w, y: (cy - (dy * len) / 2) / h },
    end: { x: (cx + (dx * len) / 2) / w, y: (cy + (dy * len) / 2) / h },
  };
}
```

- [ ] **Step 4: Write `src/theme/tokens.ts`**

```ts
import { Easing } from 'react-native-reanimated';

export const color = {
  blue: '#0CB8E9', blueDeep: '#0F638F', blueInk: '#0B4E73',
  red: '#D0021B', amber: '#c98a1f', amberBright: '#ffb741', teal: '#01a08c',
  ink: '#17161A', ink2: '#3a3941', ink3: '#57565e', ink4: '#63626a', ink5: '#6b6a72', ink7: '#9a99a2',
  bar: '#17181A', surface: '#FFFFFF', sunken: '#F2F1EE', sunken2: '#EDECE8', input: '#F7F6F4',
  disabled: '#E7E6E3', disabledInk: '#9a99a2', handle: '#dcdbd8', shellDark: '#232228', splash: '#08080A',
  textOnDark: '#F4F3F5',
  hair: 'rgba(0,0,0,0.09)', hair08: 'rgba(0,0,0,0.08)', hair07: 'rgba(0,0,0,0.07)', hair13: 'rgba(0,0,0,0.13)',
  hair14: 'rgba(0,0,0,0.14)', tint02: 'rgba(0,0,0,0.02)', tint05: 'rgba(0,0,0,0.05)',
  scrim: 'rgba(23,22,26,0.28)',
} as const;

export const font = {
  sans300: 'Geist_300Light', sans400: 'Geist_400Regular', sans500: 'Geist_500Medium', sans600: 'Geist_600SemiBold',
  mono400: 'GeistMono_400Regular', mono500: 'GeistMono_500Medium',
} as const;

export const ease = {
  standard: [0.2, 0.8, 0.2, 1], hump: [0.2, 0.9, 0.2, 1], sheet: [0.2, 0.85, 0.2, 1],
  gauge: [0.43, 0.13, 0.23, 0.96], press: [0.4, 0, 0.2, 1], cssEaseOut: [0, 0, 0.58, 1],
} as const;
export const bez = (e: readonly [number, number, number, number]) => Easing.bezier(e[0], e[1], e[2], e[3]);

export const dur = {
  press: 150, fade: 200, dim: 250, sheet: 280, color: 300, screen: 340, health: 500, hump: 550, bar: 800,
  gauge: 1400, toast: 2200, metalIdle: 7000, metalPressed: 2333, blob: 5000, ripple: 600,
} as const;

export const blur = { face: 40, scrim: 8 } as const;   // tuned in Task 22

export const layout = { card: 318, railGap: 14, humpW: 61, humpH: 13.7, bezelBaked: 768, blobBaked: 210, blobBleed: 48 } as const;
```

- [ ] **Step 5: Run** `npm test -- gradient && npm run typecheck` → PASS, no type errors.

- [ ] **Step 6: Checkpoint** — "feat: design tokens and css-angle gradient helper"

---

### Task 6: Fixtures and types (verbatim from the design)

**Files:**
- Create: `src/fixtures/types.ts`, `src/fixtures/vehicles.ts`, `src/fixtures/decode.ts`, `src/fixtures/tabs.ts`, `src/fixtures/vinHelp.ts`, `src/fixtures/recallSheet.ts`
- Test: `src/fixtures/__tests__/fixtures.test.ts`

**Interfaces:**
- Produces: `Vehicle`, `Recall`, `TabId`; `SEED_VEHICLES: Vehicle[]`; `DECODE`, `DEMO_VIN`; `TABS: { id: TabId; label: string; on: string; off: string }[]`; `VIN_SPOTS`; `RECALL_ROWS: [string, string][]`.

- [ ] **Step 1: Write the failing test**

```ts
import { SEED_VEHICLES } from '../vehicles';
import { DECODE, DEMO_VIN } from '../decode';
import { TABS } from '../tabs';
import { VIN_SPOTS } from '../vinHelp';
import { RECALL_ROWS } from '../recallSheet';

describe('fixtures', () => {
  it('seeds three vehicles, only the Model S with a recall', () => {
    expect(SEED_VEHICLES.map((v) => v.name)).toEqual(['Model S Plaid', 'Taycan 4S', 'Civic Type R']);
    expect(SEED_VEHICLES[0].recall).toEqual({ code: 'NHTSA 24V-137', title: 'Rear camera image failure' });
    expect(SEED_VEHICLES[1].recall).toBeNull();
  });
  it('decodes the demo VIN to the F-150 Lightning', () => {
    expect(DEMO_VIN).toBe('1FTVW1EL5NWG00001');
    expect(DECODE[DEMO_VIN].name).toBe('F-150 Lightning');
  });
  it('lists the five tabs in order', () => {
    expect(TABS.map((t) => t.id)).toEqual(['garage', 'recalls', 'service', 'hub', 'profile']);
    expect(TABS[0]).toEqual({ id: 'garage', label: 'GARAGE', on: 'inbox-fill', off: 'inbox-line' });
  });
  it('has four VIN spots and four recall rows', () => {
    expect(VIN_SPOTS).toHaveLength(4);
    expect(VIN_SPOTS[0].tag).toBe('MOST COMMON');
    expect(RECALL_ROWS).toEqual([
      ['SEVERITY', 'Safety recall'], ['REMEDY', 'Software update, free'],
      ['DEALER', 'Tesla Service — 6.2 mi'], ['EST. TIME', '45 minutes'],
    ]);
  });
});
```

- [ ] **Step 2: Run it** — `npm test -- fixtures` → FAIL.

- [ ] **Step 3: Write the fixtures**

`src/fixtures/types.ts`:
```ts
export type Recall = { code: string; title: string };
export type Vehicle = {
  id: number; name: string; meta: string; health: number; range: string; vin: string; sync: string;
  recall: Recall | null; odo: number; oilIn: number; tireIn: number; brakeIn: number; regDays: number; psi: string; battery: number;
};
export type TabId = 'garage' | 'recalls' | 'service' | 'hub' | 'profile';
```

`src/fixtures/vehicles.ts` (source line 1247):
```ts
import type { Vehicle } from './types';
export const SEED_VEHICLES: Vehicle[] = [
  { id: 1, name: 'Model S Plaid', meta: '2024 Tesla · 42,000 mi', health: 65, range: '340 mi', vin: '···· F12345', sync: 'SYNCED 2 MIN AGO', recall: { code: 'NHTSA 24V-137', title: 'Rear camera image failure' }, odo: 42000, oilIn: 1200, tireIn: 3400, brakeIn: 9000, regDays: 42, psi: '42 / 40', battery: 92 },
  { id: 2, name: 'Taycan 4S', meta: '2022 Porsche · 17,680 mi', health: 91, range: '227 mi', vin: '···· K88201', sync: 'SYNCED 12 MIN AGO', recall: null, odo: 17680, oilIn: 4300, tireIn: 900, brakeIn: 12000, regDays: 190, psi: '41 / 41', battery: 97 },
  { id: 3, name: 'Civic Type R', meta: '2021 Honda · 31,905 mi', health: 88, range: '402 mi', vin: '···· R55019', sync: 'SYNCED 1 HR AGO', recall: null, odo: 31905, oilIn: 300, tireIn: 2100, brakeIn: 5200, regDays: 12, psi: '38 / 36', battery: 88 },
];
```

`src/fixtures/decode.ts` (lines 1010–1014):
```ts
export type Decoded = { name: string; meta: string; health: number; range: string };
export const DECODE: Record<string, Decoded> = {
  '5YJ3E1EA7KF317726': { name: 'Model 3 Long Range', meta: '2019 Tesla · 61,240 mi', health: 78, range: '310 mi' },
  '1FTVW1EL5NWG00001': { name: 'F-150 Lightning', meta: '2023 Ford · 8,410 mi', health: 94, range: '320 mi' },
};
export const DEMO_VIN = '1FTVW1EL5NWG00001';
```

`src/fixtures/tabs.ts` (line 1132):
```ts
import type { TabId } from './types';
export type TabDef = { id: TabId; label: string; on: string; off: string };
export const TABS: TabDef[] = [
  { id: 'garage', label: 'GARAGE', on: 'inbox-fill', off: 'inbox-line' },
  { id: 'recalls', label: 'RECALLS', on: 'error-warning-fill', off: 'error-warning-line' },
  { id: 'service', label: 'SERVICE', on: 'tools-fill', off: 'tools-line' },
  { id: 'hub', label: 'HUB', on: 'book-2-fill', off: 'book-2-line' },
  { id: 'profile', label: 'PROFILE', on: 'user-fill', off: 'user-line' },
];
```

`src/fixtures/vinHelp.ts` (line 2312 — keep the curly apostrophes):
```ts
export const VIN_SPOTS = [
  { icon: 'window-line', tag: 'MOST COMMON', title: 'Base of the windshield', body: 'Stand outside on the driver’s side and look through the glass at the far corner of the dashboard. A small metal plate is riveted there.' },
  { icon: 'car-line', tag: 'DOOR JAMB', title: 'Driver’s door frame', body: 'Open the driver’s door and check the sticker on the B-pillar or the edge of the door itself, usually beside the tyre pressure label.' },
  { icon: 'file-text-line', tag: 'PAPERWORK', title: 'Registration or insurance', body: 'The VIN is printed on your registration card, title and insurance documents — often the fastest place to read it from.' },
  { icon: 'settings-3-line', tag: 'IN-CAR', title: 'Vehicle software', body: 'Many newer cars list the VIN under Settings, Software or Service info on the centre display.' },
] as const;
```

`src/fixtures/recallSheet.ts` (line 2259):
```ts
export const RECALL_ROWS: [string, string][] = [
  ['SEVERITY', 'Safety recall'],
  ['REMEDY', 'Software update, free'],
  ['DEALER', 'Tesla Service — 6.2 mi'],
  ['EST. TIME', '45 minutes'],
];
```

- [ ] **Step 4: Run** `npm test -- fixtures && npm run typecheck` → PASS.

- [ ] **Step 5: Checkpoint** — "feat: typed demo fixtures copied verbatim from the design"

---

### Task 7: Derivations

**Files:**
- Create: `src/lib/derive.ts`
- Test: `src/lib/__tests__/derive.test.ts`

**Interfaces:**
- Consumes: `Vehicle`, `DECODE`, `Decoded`.
- Produces: `isOpenRecall(v, scheduled)`, `recallCount(vs, scheduled)`, `fleetLine(vs, scheduled)`, `counter(idx, n)`, `vinOk(raw)`, `maskVin(raw)`, `decodeVin(raw): Decoded`, `statsFor(v, scheduled): Stats` where
  `Stats = { name, metaUpper, hasRecall, recallCode, recallTitle, clearTitle, clearMeta, word, gaugeColor, summary, tiles: { icon, tone, label, value, note }[], service: { key, label, due, pct: number, tone, meta }[] }`.

- [ ] **Step 1: Write the failing tests**

```ts
import { SEED_VEHICLES } from '../../fixtures/vehicles';
import { DEMO_VIN } from '../../fixtures/decode';
import { counter, decodeVin, fleetLine, maskVin, statsFor, vinOk } from '../derive';

const [modelS, taycan, civic] = SEED_VEHICLES;

describe('fleetLine / counter', () => {
  it('counts open recalls', () => expect(fleetLine(SEED_VEHICLES, false)).toBe('3 VEHICLES · 1 RECALL'));
  it('is all clear once scheduled', () => expect(fleetLine(SEED_VEHICLES, true)).toBe('3 VEHICLES · ALL CLEAR'));
  it('singular vehicle', () => expect(fleetLine([taycan], false)).toBe('1 VEHICLE · ALL CLEAR'));
  it('zero-pads the counter', () => expect(counter(0, 3)).toBe('01 / 03'));
});

describe('vin helpers', () => {
  it('vinOk needs 11+ chars', () => {
    expect(vinOk('')).toBe(false);
    expect(vinOk('1234567890')).toBe(false);
    expect(vinOk('12345678901')).toBe(true);
  });
  it('masks to the last six', () => expect(maskVin(DEMO_VIN)).toBe('···· G00001'));
  it('decodes known and falls back', () => {
    expect(decodeVin(DEMO_VIN).name).toBe('F-150 Lightning');
    expect(decodeVin('ABCDEFGHIJK')).toEqual({ name: 'New Vehicle', meta: 'Decoded from VIN', health: 90, range: '—' });
  });
});

describe('statsFor — Model S (open recall)', () => {
  const s = statsFor(modelS, false);
  it('header + recall', () => {
    expect(s.metaUpper).toBe('2024 TESLA · 42,000 MI · VIN ···· F12345');
    expect(s.hasRecall).toBe(true);
    expect(s.recallCode).toBe('NHTSA 24V-137');
    expect(s.word).toBe('Fair');
    expect(s.gaugeColor).toBe('#0F638F');
    expect(s.summary).toBe('One open safety recall is holding this score down. Everything else is inside spec.');
  });
  it('tiles', () => {
    expect(s.tiles.map((t) => [t.label, t.value, t.note, t.tone])).toEqual([
      ['ODOMETER', '42,000 mi', 'Read 2 min ago', '#57565e'],
      ['NEXT OIL CHANGE', '1,200 mi', 'On schedule', '#c98a1f'],
      ['TIRE ROTATION', '3,400 mi', 'Pressure 42 / 40 psi', '#01a08c'],
      ['BATTERY HEALTH', '92%', 'Registration in 42 days', '#01a08c'],
    ]);
  });
  it('service rows', () => {
    expect(s.service.map((m) => [m.label, m.due, m.pct, m.tone, m.meta])).toEqual([
      ['Oil & filter', 'in 1,200 mi', 80, '#c98a1f', 'LAST DONE AT 37,200 MI'],
      ['Tire rotation', 'in 3,400 mi', 43, '#01a08c', 'LAST DONE AT 39,400 MI'],
      ['Brake fluid', 'in 9,000 mi', 63, '#01a08c', 'LAST DONE AT 27,000 MI'],
    ]);
  });
  it('scheduled flips to the clear row', () => {
    const t = statsFor(modelS, true);
    expect(t.hasRecall).toBe(false);
    expect(t.clearTitle).toBe('Recall remedy scheduled');
    expect(t.clearMeta).toBe('THU 10:30 AM · NHTSA 24V-137');
  });
});

describe('statsFor — Taycan and Civic', () => {
  it('taycan is excellent and clear', () => {
    const s = statsFor(taycan, false);
    expect([s.word, s.gaugeColor, s.clearTitle, s.clearMeta]).toEqual(['Excellent', '#01a08c', 'No open recalls', '12 MIN AGO']);
    expect(s.summary).toBe('All monitored systems are inside spec for a 2022 at this mileage.');
    expect(s.tiles[2].tone).toBe('#c98a1f');
  });
  it('civic flags oil and registration', () => {
    const s = statsFor(civic, false);
    expect([s.word, s.gaugeColor]).toEqual(['Good', '#01a08c']);
    expect(s.tiles[1]).toMatchObject({ note: 'Overdue soon', tone: '#D0021B' });
    expect(s.tiles[3]).toMatchObject({ note: 'Registration due in 12 days', tone: '#c98a1f' });
  });
});
```

- [ ] **Step 2: Run** `npm test -- derive` → FAIL.

- [ ] **Step 3: Write `src/lib/derive.ts`** (mirrors `renderVals` line 2330 and `statsFor` line 1380)

```ts
import { DECODE, type Decoded } from '../fixtures/decode';
import type { Vehicle } from '../fixtures/types';

export const isOpenRecall = (v: Vehicle, scheduled: boolean) => !!v.recall && !scheduled;
export const recallCount = (vs: Vehicle[], scheduled: boolean) => vs.filter((v) => isOpenRecall(v, scheduled)).length;

export function fleetLine(vs: Vehicle[], scheduled: boolean) {
  const n = vs.length;
  const rc = recallCount(vs, scheduled);
  return n + (n === 1 ? ' VEHICLE · ' : ' VEHICLES · ') + (rc ? rc + ' RECALL' : 'ALL CLEAR');
}

export const counter = (idx: number, n: number) => String(idx + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0');
export const vinOk = (raw: string) => raw.length >= 11;
export const maskVin = (raw: string) => '···· ' + raw.slice(-6);
export const decodeVin = (raw: string): Decoded => DECODE[raw] ?? { name: 'New Vehicle', meta: 'Decoded from VIN', health: 90, range: '—' };

const mi = (n: number) => n.toLocaleString('en-US') + ' mi';
const tone = (n: number, warn: number, bad: number) => (n <= bad ? '#D0021B' : n <= warn ? '#c98a1f' : '#01a08c');

export type StatTile = { icon: string; tone: string; label: string; value: string; note: string };
export type ServiceRow = { key: string; label: string; due: string; pct: number; tone: string; meta: string };
export type Stats = {
  name: string; metaUpper: string; hasRecall: boolean; recallCode: string; recallTitle: string;
  clearTitle: string; clearMeta: string; word: string; gaugeColor: string; summary: string;
  tiles: StatTile[]; service: ServiceRow[];
};

export function statsFor(v: Vehicle, scheduled: boolean): Stats {
  const open = isOpenRecall(v, scheduled);
  const word = v.health >= 90 ? 'Excellent' : v.health >= 80 ? 'Good' : v.health >= 65 ? 'Fair' : 'Needs work';
  const gaugeColor = v.health >= 80 ? '#01a08c' : v.health >= 65 ? '#0F638F' : '#D0021B';
  const due = [
    { key: 'oil', label: 'Oil & filter', in: v.oilIn, span: 6000, warn: 1500, bad: 500 },
    { key: 'tire', label: 'Tire rotation', in: v.tireIn, span: 6000, warn: 1500, bad: 500 },
    { key: 'brake', label: 'Brake fluid', in: v.brakeIn, span: 24000, warn: 6000, bad: 2000 },
  ];
  return {
    name: v.name,
    metaUpper: v.meta.toUpperCase() + ' · VIN ' + v.vin,
    hasRecall: open,
    recallCode: open && v.recall ? v.recall.code : '',
    recallTitle: open && v.recall ? v.recall.title : '',
    clearTitle: v.recall ? 'Recall remedy scheduled' : 'No open recalls',
    clearMeta: v.recall ? 'THU 10:30 AM · ' + v.recall.code : v.sync.replace('SYNCED ', ''),
    word,
    gaugeColor,
    summary: open
      ? 'One open safety recall is holding this score down. Everything else is inside spec.'
      : 'All monitored systems are inside spec for a ' + v.meta.split(' ')[0] + ' at this mileage.',
    tiles: [
      { icon: 'dashboard-3-line', tone: '#57565e', label: 'ODOMETER', value: mi(v.odo), note: 'Read ' + v.sync.replace('SYNCED ', '').toLowerCase() },
      { icon: 'oil-line', tone: tone(v.oilIn, 1500, 500), label: 'NEXT OIL CHANGE', value: mi(v.oilIn), note: v.oilIn <= 500 ? 'Overdue soon' : 'On schedule' },
      { icon: 'loader-2-line', tone: tone(v.tireIn, 1500, 500), label: 'TIRE ROTATION', value: mi(v.tireIn), note: 'Pressure ' + v.psi + ' psi' },
      { icon: 'battery-charge-line', tone: tone(v.battery, 90, 80), label: 'BATTERY HEALTH', value: v.battery + '%', note: v.regDays <= 30 ? 'Registration due in ' + v.regDays + ' days' : 'Registration in ' + v.regDays + ' days' },
    ],
    service: due.map((d) => ({
      key: d.key,
      label: d.label,
      due: 'in ' + d.in.toLocaleString('en-US') + ' mi',
      pct: Math.max(4, Math.min(100, Math.round(100 - (d.in / d.span) * 100))),
      tone: tone(d.in, d.warn, d.bad),
      meta: 'LAST DONE AT ' + mi(v.odo - (d.span - d.in)).toUpperCase(),
    })),
  };
}
```

- [ ] **Step 4: Run** `npm test -- derive && npm run typecheck` → PASS.

- [ ] **Step 5: Checkpoint** — "feat: pure derivations mirroring renderVals and statsFor"

---

### Task 8: Rail geometry and tripled-list index math

**Files:**
- Create: `src/lib/rail.ts`
- Test: `src/lib/__tests__/rail.test.ts`

**Interfaces:**
- Produces: `CARD_W = 318`, `GAP = 14`, `STEP = 332`, `railPadding(width)`, `slotForOffset(x)`, `liveIndex(slot, n)`, `middleSlot(i, n)`, `recenterSlot(slot, n)`. Slots index the tripled list (`0 … 3n−1`); the middle copy is `n … 2n−1`.

- [ ] **Step 1: Write the failing test**

```ts
import { liveIndex, middleSlot, railPadding, recenterSlot, slotForOffset, STEP } from '../rail';

describe('rail math', () => {
  it('centres a 318 card on any width', () => {
    expect(railPadding(430)).toBe(56);
    expect(railPadding(412)).toBe(47);
  });
  it('snaps offsets to slots', () => {
    expect(STEP).toBe(332);
    expect(slotForOffset(0)).toBe(0);
    expect(slotForOffset(340)).toBe(1);
    expect(slotForOffset(3 * 332 + 100)).toBe(3);
  });
  it('maps slots to live vehicle indices', () => {
    expect(liveIndex(4, 3)).toBe(1);
    expect(liveIndex(8, 3)).toBe(2);
    expect(middleSlot(0, 3)).toBe(3);
    expect(middleSlot(2, 3)).toBe(5);
  });
  it('recentres into the middle copy', () => {
    expect(recenterSlot(0, 3)).toBe(3);
    expect(recenterSlot(2, 3)).toBe(5);
    expect(recenterSlot(4, 3)).toBe(4);
    expect(recenterSlot(6, 3)).toBe(3);
    expect(recenterSlot(8, 3)).toBe(5);
  });
});
```

- [ ] **Step 2: Run** `npm test -- rail` → FAIL.

- [ ] **Step 3: Write `src/lib/rail.ts`**

```ts
export const CARD_W = 318;
export const GAP = 14;
export const STEP = CARD_W + GAP;

export const railPadding = (width: number) => (width - CARD_W) / 2;
export const slotForOffset = (x: number) => Math.round(x / STEP);
export const liveIndex = (slot: number, n: number) => ((slot % n) + n) % n;
export const middleSlot = (i: number, n: number) => n + i;
export function recenterSlot(slot: number, n: number) {
  if (slot < n) return slot + n;
  if (slot >= 2 * n) return slot - n;
  return slot;
}
```

- [ ] **Step 4: Run** `npm test -- rail` → PASS.

- [ ] **Step 5: Checkpoint** — "feat: rail geometry and infinite-rail index math"

---

### Task 9: The store

**Files:**
- Create: `src/store/useAppStore.ts`
- Test: `src/store/__tests__/useAppStore.test.ts`

**Interfaces:**
- Consumes: `Vehicle`, `TabId`, `SEED_VEHICLES`, `decodeVin`, `maskVin`.
- Produces: `useAppStore` (zustand hook) with state `{ tab, idx, sheet, screen, scheduled, toast, vin, splash, vehicles }` and actions `switchTab(tab)`, `setIdx(i)`, `openSheet('add'|'recall')`, `closeSheet()`, `openVinHelp()`, `closeVinHelp()`, `setVin(v)`, `addVehicle()`, `schedule()`, `flash(msg)`, `dismissSplash()`; plus `resetAppStore()` for tests. `openVinHelp` leaves `sheet` untouched (the design keeps the add sheet mounted under VIN help).

- [ ] **Step 1: Write the failing tests**

```ts
import { DEMO_VIN } from '../../fixtures/decode';
import { resetAppStore, useAppStore } from '../useAppStore';

const s = () => useAppStore.getState();

beforeEach(() => { resetAppStore(); jest.useFakeTimers(); });
afterEach(() => jest.useRealTimers());

describe('store', () => {
  it('starts on garage with the splash up', () => {
    expect(s().tab).toBe('garage');
    expect(s().splash).toBe(true);
    expect(s().vehicles).toHaveLength(3);
  });
  it('flash shows a toast for 2200ms and cancels the previous timer', () => {
    s().flash('one');
    expect(s().toast).toBe('one');
    jest.advanceTimersByTime(2199);
    expect(s().toast).toBe('one');
    jest.advanceTimersByTime(1);
    expect(s().toast).toBeNull();
    s().flash('a'); jest.advanceTimersByTime(1000); s().flash('b'); jest.advanceTimersByTime(1500);
    expect(s().toast).toBe('b');
  });
  it('addVehicle decodes the sample VIN, appends, selects it, closes the sheet, toasts', () => {
    s().openSheet('add'); s().setVin(DEMO_VIN); s().addVehicle();
    const v = s().vehicles[3];
    expect(s().vehicles).toHaveLength(4);
    expect(v).toMatchObject({ name: 'F-150 Lightning', vin: '···· G00001', sync: 'SYNCED JUST NOW', recall: null, odo: 8410, oilIn: 4800, tireIn: 2600, brakeIn: 21000, regDays: 240, psi: '40 / 40', battery: 99 });
    expect(s().idx).toBe(3);
    expect(s().sheet).toBeNull();
    expect(s().vin).toBe('');
    expect(s().toast).toBe('F-150 Lightning added · monitoring for recalls');
  });
  it('addVehicle falls back for unknown VINs and uppercases', () => {
    s().setVin(' abcdefghijk '); s().addVehicle();
    expect(s().vehicles[3]).toMatchObject({ name: 'New Vehicle', meta: 'Decoded from VIN', health: 90, range: '—', vin: '···· FGHIJK' });
  });
  it('switchTab clears overlays', () => {
    s().openSheet('add'); s().openVinHelp();
    expect(s().sheet).toBe('add'); expect(s().screen).toBe('vinhelp');
    s().switchTab('recalls');
    expect(s()).toMatchObject({ tab: 'recalls', sheet: null, screen: null });
  });
  it('schedule and dismissSplash', () => {
    s().schedule(); expect(s().scheduled).toBe(true);
    s().dismissSplash(); expect(s().splash).toBe(false);
  });
});
```

- [ ] **Step 2: Run** `npm test -- useAppStore` → FAIL.

- [ ] **Step 3: Write `src/store/useAppStore.ts`**

```ts
import { create } from 'zustand';
import { SEED_VEHICLES } from '../fixtures/vehicles';
import type { TabId, Vehicle } from '../fixtures/types';
import { decodeVin, maskVin } from '../lib/derive';

export type SheetId = 'add' | 'recall';
export type ScreenId = 'vinhelp';

type State = {
  tab: TabId; idx: number; sheet: SheetId | null; screen: ScreenId | null; scheduled: boolean;
  toast: string | null; vin: string; splash: boolean; vehicles: Vehicle[];
};
type Actions = {
  switchTab: (tab: TabId) => void; setIdx: (i: number) => void;
  openSheet: (s: SheetId) => void; closeSheet: () => void;
  openVinHelp: () => void; closeVinHelp: () => void;
  setVin: (v: string) => void; addVehicle: () => void; schedule: () => void;
  flash: (msg: string) => void; dismissSplash: () => void;
};

const initial = (): State => ({
  tab: 'garage', idx: 0, sheet: null, screen: null, scheduled: false, toast: null, vin: '', splash: true,
  vehicles: SEED_VEHICLES.map((v) => ({ ...v })),
});

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useAppStore = create<State & Actions>((set, get) => ({
  ...initial(),
  switchTab: (tab) => set({ tab, sheet: null, screen: null }),
  setIdx: (idx) => set({ idx }),
  openSheet: (sheet) => set({ sheet }),
  closeSheet: () => set({ sheet: null }),
  openVinHelp: () => set({ screen: 'vinhelp' }),
  closeVinHelp: () => set({ screen: null }),
  setVin: (vin) => set({ vin }),
  schedule: () => set({ scheduled: true }),
  dismissSplash: () => set({ splash: false }),
  flash: (msg) => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: msg });
    toastTimer = setTimeout(() => set({ toast: null }), 2200);
  },
  addVehicle: () => {
    const raw = get().vin.trim().toUpperCase();
    const d = decodeVin(raw);
    const v: Vehicle = {
      id: Date.now(), name: d.name, meta: d.meta, health: d.health, range: d.range,
      vin: maskVin(raw), sync: 'SYNCED JUST NOW', recall: null,
      odo: 8410, oilIn: 4800, tireIn: 2600, brakeIn: 21000, regDays: 240, psi: '40 / 40', battery: 99,
    };
    const vehicles = [...get().vehicles, v];
    set({ vehicles, sheet: null, vin: '', idx: vehicles.length - 1 });
    get().flash(d.name + ' added · monitoring for recalls');
  },
}));

export function resetAppStore() {
  if (toastTimer) clearTimeout(toastTimer);
  useAppStore.setState(initial());
}
```

- [ ] **Step 4: Run** `npm test -- useAppStore && npm run typecheck` → PASS.

- [ ] **Step 5: Checkpoint** — "feat: zustand store mirroring the design's state"

---

### Task 10: Root layout — fonts, `Icon`, `Txt`, `DotPattern`, blur-target context

**Files:**
- Create: `src/ui/Icon.tsx`, `src/ui/Txt.tsx`, `src/ui/DotPattern.tsx`, `src/overlays/blurTarget.tsx`, `app/_layout.tsx`, `app/index.tsx` (temporary, replaced in Task 13)
- Test: `src/ui/__tests__/Txt.test.tsx`, `src/ui/__tests__/DotPattern.test.tsx`

**Interfaces:**
- Produces: `Icon({ name, size?, color?, style? })` with `IconName = keyof glyph map`; `Sans` / `Mono` text components with props `{ size, lh?, ls?, color?, weight?: 300|400|500|600, center?, ...TextProps }`; `DotPattern()` absolute full-bleed; `AppBlurTarget` context and `useAppBlurTarget(): RefObject<View|null>`; the root layout that later tasks extend by adding `<OverlayHost />`.

- [ ] **Step 1: Write the failing tests**

`src/ui/__tests__/Txt.test.tsx`:
```tsx
import { render } from '@testing-library/react-native';
import { Mono, Sans } from '../Txt';

describe('Txt', () => {
  it('Sans picks the Geist face by weight and disables font scaling', () => {
    const { getByText } = render(<Sans size={14} weight={600}>Garage</Sans>);
    const el = getByText('Garage');
    expect(el.props.allowFontScaling).toBe(false);
    expect(el.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ fontFamily: 'Geist_600SemiBold', fontSize: 14, includeFontPadding: false })]));
  });
  it('Mono uses Geist Mono and letter spacing', () => {
    const { getByText } = render(<Mono size={11} ls={2.6} color="#6b6a72">RECALL HUB</Mono>);
    expect(getByText('RECALL HUB').props.style).toEqual(expect.arrayContaining([expect.objectContaining({ fontFamily: 'GeistMono_400Regular', letterSpacing: 2.6, color: '#6b6a72' })]));
  });
});
```

`src/ui/__tests__/DotPattern.test.tsx`:
```tsx
import { render } from '@testing-library/react-native';
import { DotPattern } from '../DotPattern';

it('renders the dot pattern without crashing', () => {
  const { getByTestId } = render(<DotPattern />);
  expect(getByTestId('dot-pattern')).toBeTruthy();
});
```

- [ ] **Step 2: Run** `npm test -- src/ui` → FAIL.

- [ ] **Step 3: Write `src/ui/Icon.tsx`**

```tsx
import { createIconSet } from '@expo/vector-icons';
import type { TextStyle } from 'react-native';
import glyphMap from '../assets/remixicon.glyphmap.json';

export type IconName = keyof typeof glyphMap;
const Remix = createIconSet(glyphMap as Record<string, number>, 'remixicon', require('../assets/fonts/remixicon.ttf'));

export function Icon({ name, size = 16, color = '#17161A', style }: { name: IconName | string; size?: number; color?: string; style?: TextStyle }) {
  return <Remix name={name as IconName} size={size} color={color} style={style} />;
}
```

- [ ] **Step 4: Write `src/ui/Txt.tsx`**

```tsx
import { Text, type TextProps } from 'react-native';
import { color as C, font } from '../theme/tokens';

export type TxtProps = TextProps & { size: number; lh?: number; ls?: number; color?: string; weight?: 300 | 400 | 500 | 600; center?: boolean };
const SANS = { 300: font.sans300, 400: font.sans400, 500: font.sans500, 600: font.sans600 } as const;
const MONO = { 300: font.mono400, 400: font.mono400, 500: font.mono500, 600: font.mono500 } as const;

function make(faces: typeof SANS | typeof MONO) {
  return function Txt({ size, lh, ls, color = C.ink, weight = 400, center, style, ...rest }: TxtProps) {
    return (
      <Text
        allowFontScaling={false}
        {...rest}
        style={[{ fontFamily: faces[weight], fontSize: size, lineHeight: lh, letterSpacing: ls, color, includeFontPadding: false, textAlign: center ? 'center' : undefined }, style]}
      />
    );
  };
}
export const Sans = make(SANS);
export const Mono = make(MONO);
```

- [ ] **Step 5: Write `src/ui/DotPattern.tsx`** (source `dots()`, line 2182)

```tsx
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';

const FADE = ['transparent', '#000', '#000', 'transparent'] as const;

export function DotPattern() {
  return (
    <MaskedView
      testID="dot-pattern"
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      maskElement={<LinearGradient colors={[...FADE]} locations={[0, 0.1, 0.9, 1]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />}
    >
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={<LinearGradient colors={[...FADE]} locations={[0, 0.14, 0.86, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />}
      >
        <Svg width="100%" height="100%">
          <Defs>
            <Pattern id="dots" width={16} height={16} patternUnits="userSpaceOnUse">
              <Circle cx={1} cy={1} r={1} fill="rgba(120,120,120,0.48)" />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#dots)" />
        </Svg>
      </MaskedView>
    </MaskedView>
  );
}
```

- [ ] **Step 6: Write `src/overlays/blurTarget.tsx`**

```tsx
import { createContext, useContext, type RefObject } from 'react';
import type { View } from 'react-native';

export const AppBlurTarget = createContext<RefObject<View | null> | null>(null);
export const useAppBlurTarget = () => useContext(AppBlurTarget) ?? undefined;
```

- [ ] **Step 7: Write `app/_layout.tsx`** and a temporary `app/index.tsx`

```tsx
// app/_layout.tsx
import { Geist_300Light, Geist_400Regular, Geist_500Medium, Geist_600SemiBold } from '@expo-google-fonts/geist';
import { GeistMono_400Regular, GeistMono_500Medium } from '@expo-google-fonts/geist-mono';
import { BlurTargetView } from 'expo-blur';
import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppBlurTarget } from '../src/overlays/blurTarget';
import { color } from '../src/theme/tokens';
import { DotPattern } from '../src/ui/DotPattern';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    Geist_300Light, Geist_400Regular, Geist_500Medium, Geist_600SemiBold, GeistMono_400Regular, GeistMono_500Medium,
    remixicon: require('../src/assets/fonts/remixicon.ttf'),
  });
  const target = useRef<View>(null);
  useEffect(() => { if (loaded) SplashScreen.hideAsync(); }, [loaded]);
  if (!loaded) return null;
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppBlurTarget.Provider value={target}>
          <View style={styles.app}>
            <BlurTargetView ref={target} style={styles.app}>
              <DotPattern />
              <Slot />
            </BlurTargetView>
            {/* OverlayHost is mounted here in Task 14 */}
          </View>
          <StatusBar style="dark" />
        </AppBlurTarget.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
const styles = StyleSheet.create({ root: { flex: 1 }, app: { flex: 1, backgroundColor: color.surface } });
```

```tsx
// app/index.tsx  (temporary — deleted in Task 13)
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../src/ui/Icon';
import { Mono, Sans } from '../src/ui/Txt';

export default function Index() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, paddingTop: insets.top + 40, alignItems: 'center', gap: 12 }}>
      <Icon name="shield-check-fill" size={26} color="#0CB8E9" />
      <Sans size={38} lh={42} weight={600} ls={-1.2}>Garage</Sans>
      <Mono size={11} ls={2.6} color="#6b6a72">RECALL HUB</Mono>
    </View>
  );
}
```

- [ ] **Step 8: Run tests and typecheck** — `npm test -- src/ui && npm run typecheck` → PASS.

- [ ] **Step 9: Verify on the emulator**

Run: `ANDROID_HOME="$LOCALAPPDATA/Android/Sdk" npx expo start --android` (emulator already booted), then `adb exec-out screencap -p > docs/reference/t10-fonts.png` and Read it.
Expected: a white screen with the faded dot grid, a blue shield icon (Remixicon glyph, not a box), "Garage" in Geist SemiBold and "RECALL HUB" in Geist Mono with wide tracking. If any glyph renders as a box, the font key `remixicon` in `useFonts` does not match the family passed to `createIconSet` — they must be identical.

- [ ] **Step 10: Checkpoint** — "feat: root layout with Geist fonts, Remixicon, dot pattern"

---

### Task 11: `MetalButton`

**Files:**
- Create: `src/ui/MetalButton.tsx`
- Test: `src/ui/__tests__/MetalButton.test.tsx`

**Interfaces:**
- Consumes: `cssAngleToPoints`, `Icon`, `Sans`, tokens, `metal-*.png`.
- Produces: `MetalButton({ tint?: 'blue'|'mix'|'default', label, icon, iconSize?=15, fontSize?=13, gap?=6, width?: number|'auto' = 132, height?=44, radius?=100, flex?, iconRight?, onPress?, testID? })`. Source: `metalPill`, line 2131.

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { MetalButton } from '../MetalButton';

describe('MetalButton', () => {
  it('renders the label and icon and fires onPress', () => {
    const onPress = jest.fn();
    const { getByText, getByTestId, getByLabelText } = render(<MetalButton label="Add Vehicle" icon="sparkling-2-line" onPress={onPress} />);
    expect(getByText('Add Vehicle')).toBeTruthy();
    expect(getByTestId('icon-sparkling-2-line')).toBeTruthy();
    fireEvent.press(getByLabelText('Add Vehicle'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  it('uses the blue ink on the blue tint and grey ink otherwise', () => {
    const blue = render(<MetalButton tint="blue" label="A" icon="calendar-2-line" />);
    expect(blue.getByText('A').props.style).toEqual(expect.arrayContaining([expect.objectContaining({ color: '#EAF7FF' })]));
    const mix = render(<MetalButton tint="mix" label="B" icon="calendar-2-line" />);
    expect(mix.getByText('B').props.style).toEqual(expect.arrayContaining([expect.objectContaining({ color: '#8A8F94' })]));
  });
});
```

- [ ] **Step 2: Run** `npm test -- MetalButton` → FAIL.

- [ ] **Step 3: Write `src/ui/MetalButton.tsx`**

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import { type GestureResponderEvent, type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { cssAngleToPoints } from '../lib/gradient';
import { bez, dur, ease } from '../theme/tokens';
import { Icon } from './Icon';
import { Sans } from './Txt';

export type MetalTint = 'blue' | 'mix' | 'default';
const BEZEL = {
  blue: require('../assets/images/metal-blue.png'),
  mix: require('../assets/images/metal-mix.png'),
  default: require('../assets/images/metal-default.png'),
} as const;
const FACE_BLUE = { colors: ['#2E93C4', '#0F638F', '#0B4E73'], locations: [0, 0.55, 1], angle: 160 };
const FACE_DARK = { colors: ['#202020', '#000000'], locations: [0, 1], angle: 180 };
const SHADOW_IDLE = '0 0 0 1px rgba(0,0,0,0.3), 0 14px 10px rgba(0,0,0,0.08), 0 3px 6px rgba(0,0,0,0.16)';
const SHADOW_PRESSED = '0 0 0 1px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)';
const TEXT_SHADOW = { textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 } as const;

export type MetalButtonProps = {
  tint?: MetalTint; label: string; icon: string; iconSize?: number; fontSize?: number; gap?: number;
  width?: number | 'auto'; height?: number; radius?: number; flex?: number; iconRight?: boolean; onPress?: () => void; testID?: string;
};

type Ripple = { id: number; x: number; y: number };

export function MetalButton({ tint = 'blue', label, icon, iconSize = 15, fontSize = 13, gap = 6, width = 132, height = 44, radius = 100, flex, iconRight, onPress, testID }: MetalButtonProps) {
  const [pressed, setPressed] = useState(false);
  const [box, setBox] = useState({ w: typeof width === 'number' ? width : 320, h: height });
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rot = useSharedValue(0);
  const press = useSharedValue(0);

  useEffect(() => {
    const from = rot.value % 360;
    rot.value = from;
    rot.value = withRepeat(withTiming(from + 360, { duration: pressed ? dur.metalPressed : dur.metalIdle, easing: Easing.linear }), -1, false);
  }, [pressed, rot]);
  useEffect(() => { press.value = withTiming(pressed ? 1 : 0, { duration: dur.press, easing: bez(ease.press) }); }, [pressed, press]);

  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  const wrapStyle = useAnimatedStyle(() => ({ transform: [{ translateY: press.value }, { scale: 1 - 0.02 * press.value }] }));

  const spin = (typeof width === 'number' ? width : 320) * 2.4;
  const face = tint === 'blue' ? FACE_BLUE : FACE_DARK;
  const ink = tint === 'blue' ? '#EAF7FF' : '#8A8F94';
  const pts = cssAngleToPoints(face.angle, box.w, box.h);

  const onLayout = useCallback((e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height }), []);
  const onPressIn = useCallback((e: GestureResponderEvent) => {
    setPressed(true);
    const id = Date.now() + Math.random();
    setRipples((r) => [...r, { id, x: e.nativeEvent.locationX, y: e.nativeEvent.locationY }]);
    setTimeout(() => setRipples((r) => r.filter((x) => x.id !== id)), dur.ripple);
  }, []);

  return (
    <Animated.View onLayout={onLayout} testID={testID} style={[{ width: typeof width === 'number' ? width : undefined, height, flex }, wrapStyle]}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden', boxShadow: pressed ? SHADOW_PRESSED : SHADOW_IDLE }]}>
        <Animated.Image source={BEZEL[tint]} style={[{ position: 'absolute', left: box.w / 2 - spin / 2, top: box.h / 2 - spin / 2, width: spin, height: spin }, spinStyle]} />
        <View style={{ position: 'absolute', left: 2, right: 2, top: 2, bottom: 2, borderRadius: radius, overflow: 'hidden', boxShadow: pressed ? 'inset 0 2px 4px rgba(0,0,0,0.4)' : undefined }}>
          <LinearGradient colors={face.colors as [string, string, ...string[]]} locations={face.locations as [number, number, ...number[]]} start={pts.start} end={pts.end} style={StyleSheet.absoluteFill} />
        </View>
        {ripples.map((r) => <RippleDot key={r.id} x={r.x} y={r.y} />)}
      </View>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { flexDirection: iconRight ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', gap }]}>
        <Icon name={icon} size={iconSize} color={ink} style={TEXT_SHADOW} />
        <Sans size={fontSize} color={ink} style={TEXT_SHADOW} numberOfLines={1}>{label}</Sans>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPressIn={onPressIn} onPressOut={() => setPressed(false)} onPress={onPress} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

function RippleDot({ x, y }: { x: number; y: number }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withTiming(1, { duration: dur.ripple, easing: bez(ease.cssEaseOut) }); }, [p]);
  const style = useAnimatedStyle(() => ({ opacity: 0.5 * (1 - p.value), transform: [{ scale: 4 * p.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x - 10, top: y - 10, width: 20, height: 20 }, style]}>
      <Svg width={20} height={20}>
        <Defs>
          <RadialGradient id="rip" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#fff" stopOpacity={0.45} />
            <Stop offset="0.7" stopColor="#fff" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={10} cy={10} r={10} fill="url(#rip)" />
      </Svg>
    </Animated.View>
  );
}
```

- [ ] **Step 4: Run** `npm test -- MetalButton && npm run typecheck` → PASS.

- [ ] **Step 5: Verify on the emulator** — temporarily add `<MetalButton label="Add Vehicle" icon="sparkling-2-line" />` to `app/index.tsx`, reload, screenshot to `docs/reference/t11-metal.png`, and compare with the "Add Vehicle" button in `docs/reference/garage-idle.png`.
Expected: a pill with a thin rotating chrome rim, blue gradient face, light-blue label with a soft shadow, a layered drop shadow beneath. Press: it dips 1 px, the rim spins ~3× faster, a ripple blooms from the touch point. If the outer shadow is clipped, the parent that clips is the culprit — the shadowed view must not be inside an `overflow: 'hidden'` ancestor. Remove the temporary button afterwards.

- [ ] **Step 6: Checkpoint** — "feat: liquid-metal button with pre-baked rotating bezel"

---

### Task 12: `GlowCard`

**Files:**
- Create: `src/ui/GlowCard.tsx`
- Test: `src/ui/__tests__/GlowCard.test.tsx`

**Interfaces:**
- Produces: `GlowCard({ shell, radius, glow, blobSize, faceOpacity, faceRadius, faceStyle?, outline?='rgba(0,0,0,0.09)', style?, children, testID? })`. Renders `testID="glow-blob"` only when `glow`. Sources: vehicle card line 65, stats recall card line 287.

- [ ] **Step 1: Write the failing test**

```tsx
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { GlowCard } from '../GlowCard';

const base = { shell: '#F2F1EE', radius: 18, blobSize: 190, faceOpacity: 0.82, faceRadius: 16 };

describe('GlowCard', () => {
  it('renders children and no blob when not glowing', () => {
    const { getByText, queryByTestId } = render(<GlowCard {...base} glow={false}><Text>inner</Text></GlowCard>);
    expect(getByText('inner')).toBeTruthy();
    expect(queryByTestId('glow-blob')).toBeNull();
  });
  it('renders the blob when glowing', () => {
    const { getByTestId } = render(<GlowCard {...base} glow><Text>inner</Text></GlowCard>);
    expect(getByTestId('glow-blob')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run** `npm test -- GlowCard` → FAIL.

- [ ] **Step 3: Write `src/ui/GlowCard.tsx`**

```tsx
import { BlurTargetView, BlurView } from 'expo-blur';
import { type ReactNode, useEffect, useRef } from 'react';
import { Image, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { blur, dur, layout } from '../theme/tokens';

const BLOB = require('../assets/images/glow-blob.png');

export type GlowCardProps = {
  shell: string; radius: number; glow: boolean; blobSize: number; faceOpacity: number; faceRadius: number;
  faceStyle?: ViewStyle; outline?: string; style?: ViewStyle; children: ReactNode; testID?: string;
};

export function GlowCard({ shell, radius, glow, blobSize, faceOpacity, faceRadius, faceStyle, outline = 'rgba(0,0,0,0.09)', style, children, testID }: GlowCardProps) {
  const target = useRef<View>(null);
  return (
    <View testID={testID} style={[{ backgroundColor: shell, borderRadius: radius, overflow: 'hidden' }, style]}>
      <BlurTargetView ref={target} style={StyleSheet.absoluteFill}>
        {glow && <Blob size={blobSize} />}
      </BlurTargetView>
      <View style={{ margin: 2, borderRadius: faceRadius, overflow: 'hidden' }}>
        {glow && <BlurView intensity={blur.face} tint="light" blurMethod="dimezisBlurViewSdk31Plus" blurTarget={target} style={StyleSheet.absoluteFill} />}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(255,255,255,${faceOpacity})` }]} />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: faceRadius, borderWidth: 1, borderColor: outline }]} />
        <View style={faceStyle}>{children}</View>
      </View>
    </View>
  );
}

// blob3 keyframes (line 17): translate (-100%,-100%) → (0,-100%) → (0,0) → (-100%,0) → back, 5 s linear, infinite.
function Blob({ size }: { size: number }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withRepeat(withTiming(1, { duration: dur.blob, easing: Easing.linear }), -1, false); }, [p]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(p.value, [0, 0.25, 0.5, 0.75, 1], [-size, 0, 0, -size, -size]) },
      { translateY: interpolate(p.value, [0, 0.25, 0.5, 0.75, 1], [-size, -size, 0, 0, -size]) },
    ],
  }));
  const scale = size / layout.blobBaked;
  const img = (layout.blobBaked + 2 * layout.blobBleed) * scale;
  const off = layout.blobBleed * scale;
  return (
    <Animated.View testID="glow-blob" pointerEvents="none" style={[{ position: 'absolute', left: '50%', top: '50%', width: size, height: size }, style]}>
      <Image source={BLOB} style={{ position: 'absolute', left: -off, top: -off, width: img, height: img }} />
    </Animated.View>
  );
}
```

- [ ] **Step 4: Run** `npm test -- GlowCard && npm run typecheck` → PASS.

- [ ] **Step 5: Checkpoint** — "feat: glow card with drifting pre-baked blob and blurred glass face"

---

### Task 13: `HumpTabBar`, tab layout, `TabStub`, garage route skeleton

**Files:**
- Create: `src/ui/HumpTabBar.tsx`, `src/screens/TabStub.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/garage/_layout.tsx`, `app/(tabs)/garage/index.tsx`, `app/(tabs)/recalls.tsx`, `app/(tabs)/service.tsx`, `app/(tabs)/hub.tsx`, `app/(tabs)/profile.tsx`
- Delete: `app/index.tsx`
- Test: `src/ui/__tests__/HumpTabBar.test.tsx`, `src/screens/__tests__/TabStub.test.tsx`

**Interfaces:**
- Consumes: `TABS`, `useAppStore.switchTab`, `Icon`, tokens.
- Produces: `HumpTabBar(props: BottomTabBarProps)`, `humpXFor(itemLeft, itemWidth)`, `HUMP_PATH`; `TabStub({ tab: TabId })`. `app/(tabs)/garage/index.tsx` renders a placeholder until Task 16 replaces its body with `GarageScreen`.

- [ ] **Step 1: Write the failing tests**

`src/ui/__tests__/HumpTabBar.test.tsx`:
```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { HumpTabBar, humpXFor } from '../HumpTabBar';
import { resetAppStore, useAppStore } from '../../store/useAppStore';

beforeEach(resetAppStore);

function props(index = 0) {
  const names = ['garage', 'recalls', 'service', 'hub', 'profile'];
  return {
    state: { index, routes: names.map((name, i) => ({ key: `${name}-${i}`, name })) },
    navigation: { navigate: jest.fn(), emit: jest.fn() },
    descriptors: {},
    insets: { top: 0, bottom: 24, left: 0, right: 0 },
  } as unknown as Parameters<typeof HumpTabBar>[0];
}

describe('HumpTabBar', () => {
  it('centres the 61px hump on the item', () => {
    expect(humpXFor(100, 82.8)).toBeCloseTo(110.9);
  });
  it('renders five tabs and marks the active one selected', () => {
    const { getByLabelText } = render(<HumpTabBar {...props(0)} />);
    expect(getByLabelText('GARAGE').props.accessibilityState).toEqual({ selected: true });
    expect(getByLabelText('PROFILE').props.accessibilityState).toEqual({ selected: false });
  });
  it('tapping a tab switches the store tab and navigates', () => {
    const p = props(0);
    useAppStore.getState().openSheet('add');
    const { getByLabelText } = render(<HumpTabBar {...p} />);
    fireEvent.press(getByLabelText('RECALLS'));
    expect(useAppStore.getState().tab).toBe('recalls');
    expect(useAppStore.getState().sheet).toBeNull();
    expect(p.navigation.navigate).toHaveBeenCalledWith('recalls', undefined);
  });
  it('tapping garage returns the garage stack to its root', () => {
    const p = props(1);
    const { getByLabelText } = render(<HumpTabBar {...p} />);
    fireEvent.press(getByLabelText('GARAGE'));
    expect(p.navigation.navigate).toHaveBeenCalledWith('garage', { screen: 'index' });
  });
});
```

`src/screens/__tests__/TabStub.test.tsx`:
```tsx
import { render } from '@testing-library/react-native';
import { TabStub } from '../TabStub';

it('renders the design stub for an unported tab', () => {
  const { getByText, getByTestId } = render(<TabStub tab="recalls" />);
  expect(getByText('Recalls')).toBeTruthy();
  expect(getByText('NOT IN THIS PROTOTYPE YET')).toBeTruthy();
  expect(getByTestId('icon-error-warning-line')).toBeTruthy();
});
```

- [ ] **Step 2: Run** `npm test -- HumpTabBar TabStub` → FAIL.

- [ ] **Step 3: Write `src/ui/HumpTabBar.tsx`** (source lines 720–737, `placeHump` line 1277)

```tsx
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { TABS, type TabDef } from '../fixtures/tabs';
import type { TabId } from '../fixtures/types';
import { useAppStore } from '../store/useAppStore';
import { bez, color, dur, ease, layout } from '../theme/tokens';
import { Icon } from './Icon';

export const HUMP_PATH = 'M6.7,45.5c5.7,0.1,14.1-0.4,23.3-4c5.7-2.3,9.9-5,18.1-10.5c10.7-7.1,11.8-9.2,20.6-14.3c5-2.9,9.2-5.2,15.2-7 c7.1-2.1,13.3-2.3,17.6-2.1c4.2-0.2,10.5,0.1,17.6,2.1c6.1,1.8,10.2,4.1,15.2,7c8.8,5,9.9,7.1,20.6,14.3c8.3,5.5,12.4,8.2,18.1,10.5 c9.2,3.6,17.6,4.2,23.3,4H6.7z';

export const humpXFor = (itemLeft: number, itemWidth: number) => itemLeft - (layout.humpW - itemWidth) / 2;

type Box = { x: number; width: number };

export function HumpTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const activeId = state.routes[state.index].name as TabId;
  const switchTab = useAppStore((s) => s.switchTab);
  const [boxes, setBoxes] = useState<Partial<Record<TabId, Box>>>({});
  const humpX = useSharedValue(0);
  const active = boxes[activeId];

  useEffect(() => {
    if (active) humpX.value = withTiming(humpXFor(active.x, active.width), { duration: dur.hump, easing: bez(ease.hump) });
  }, [active?.x, active?.width, activeId, humpX]);
  const humpStyle = useAnimatedStyle(() => ({ transform: [{ translateX: humpX.value }] }));

  return (
    <View style={{ backgroundColor: color.surface, paddingBottom: insets.bottom }}>
      <View style={styles.dark}>
        <View style={styles.menu}>
          <Animated.View pointerEvents="none" style={[styles.hump, humpStyle]}>
            <Svg width={layout.humpW} height={layout.humpH} viewBox="0 0 202.9 45.5" preserveAspectRatio="none">
              <Path d={HUMP_PATH} fill={color.bar} />
            </Svg>
          </Animated.View>
          {TABS.map((t) => (
            <TabItem
              key={t.id}
              tab={t}
              on={t.id === activeId}
              onLayout={(e) => { const { x, width } = e.nativeEvent.layout; setBoxes((b) => ({ ...b, [t.id]: { x, width } })); }}
              onPress={() => { switchTab(t.id); navigation.navigate(t.id, t.id === 'garage' ? { screen: 'index' } : undefined); }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function TabItem({ tab, on, onLayout, onPress }: { tab: TabDef; on: boolean; onLayout: (e: LayoutChangeEvent) => void; onPress: () => void }) {
  const lift = useSharedValue(on ? 1 : 0);
  const tone = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    lift.value = withTiming(on ? 1 : 0, { duration: dur.hump, easing: bez(ease.hump) });
    tone.value = withTiming(on ? 1 : 0, { duration: dur.color, easing: Easing.inOut(Easing.ease) });
  }, [on, lift, tone]);
  const liftStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -6 * lift.value }] }));
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: lift.value }] }));
  const onStyle = useAnimatedStyle(() => ({ opacity: tone.value }));
  const offStyle = useAnimatedStyle(() => ({ opacity: 0.62 * (1 - tone.value) }));
  return (
    <Pressable accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{ selected: on }} onLayout={onLayout} onPress={onPress} style={styles.item}>
      <Animated.View style={[styles.center, liftStyle]}>
        <Animated.View style={[styles.circle, popStyle]} />
        <Animated.View style={[styles.glyph, offStyle]}><Icon name={tab.off} size={15} color="#FFFFFF" /></Animated.View>
        <Animated.View style={[styles.glyph, onStyle]}><Icon name={tab.on} size={15} color={color.bar} /></Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dark: { backgroundColor: color.bar, paddingBottom: 6, borderTopLeftRadius: 11, borderTopRightRadius: 11, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  menu: { flexDirection: 'row', paddingHorizontal: 8, backgroundColor: color.bar, borderTopLeftRadius: 11, borderTopRightRadius: 11 },
  hump: { position: 'absolute', left: 0, bottom: 27, width: layout.humpW, height: layout.humpH },
  item: { flex: 1, height: 28, zIndex: 1 },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  circle: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFFFFF' },
  glyph: { position: 'absolute', width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
});
```

- [ ] **Step 4: Write `src/screens/TabStub.tsx`** (source lines 712–718)

```tsx
import { View } from 'react-native';
import { TABS } from '../fixtures/tabs';
import type { TabId } from '../fixtures/types';
import { color } from '../theme/tokens';
import { Icon } from '../ui/Icon';
import { Mono, Sans } from '../ui/Txt';

export function TabStub({ tab }: { tab: TabId }) {
  const t = TABS.find((x) => x.id === tab) ?? TABS[0];
  const title = t.label.charAt(0) + t.label.slice(1).toLowerCase();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40, paddingBottom: 56 }}>
      <Icon name={t.off} size={26} color={color.ink7} />
      <Sans size={22} weight={600} ls={-0.4} color={color.ink}>{title}</Sans>
      <Mono size={10} ls={1.6} color={color.ink4} center>NOT IN THIS PROTOTYPE YET</Mono>
    </View>
  );
}
```

- [ ] **Step 5: Write the route files**

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { HumpTabBar } from '../../src/ui/HumpTabBar';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <HumpTabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}>
      <Tabs.Screen name="garage" />
      <Tabs.Screen name="recalls" />
      <Tabs.Screen name="service" />
      <Tabs.Screen name="hub" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
```

```tsx
// app/(tabs)/garage/_layout.tsx
import { Stack } from 'expo-router';
export default function GarageStack() {
  return <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: 'transparent' } }} />;
}
```

```tsx
// app/(tabs)/garage/index.tsx  (placeholder body; Task 16 replaces it)
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sans } from '../../../src/ui/Txt';
export default function GarageRoute() {
  const insets = useSafeAreaInsets();
  return <View style={{ flex: 1, paddingTop: insets.top + 20, paddingHorizontal: 20 }}><Sans size={38} lh={42} weight={600} ls={-1.2}>Garage</Sans></View>;
}
```

```tsx
// app/(tabs)/recalls.tsx   (repeat for service.tsx, hub.tsx, profile.tsx with the matching tab id)
import { TabStub } from '../../src/screens/TabStub';
export default function RecallsRoute() { return <TabStub tab="recalls" />; }
```

Delete `app/index.tsx`. expo-router now resolves `/` to the first tab.

- [ ] **Step 6: Run** `npm test -- HumpTabBar TabStub && npm run typecheck` → PASS. If TypeScript rejects `navigation.navigate(t.id, …)` because the tab bar's navigation type expects route-literal names, write it as `navigation.navigate(t.id as never, (t.id === 'garage' ? { screen: 'index' } : undefined) as never)` — the runtime call is identical.

- [ ] **Step 7: Verify on the emulator** — reload, screenshot `docs/reference/t13-tabbar.png`; tap RECALLS, screenshot `t13-tabbar-recalls.png`. Compare with the bottom of `garage-idle.png` and `tab-recalls.png`.
Expected: a 34 dp dark bar with rounded lower corners, a bump above the active tab in the same dark colour, the active icon lifted onto a white disc, inactive icons dim white; tapping RECALLS slides the bump across in about half a second while the icons cross-fade; the stub screen reads "Recalls / NOT IN THIS PROTOTYPE YET". The white below the bar (gesture area) is the safe-area inset, not a bug.

- [ ] **Step 8: Checkpoint** — "feat: hump tab bar, five-tab shell, design stubs for unported tabs"

---

### Task 14: `Sheet`, `SlideUpScreen`, `Toast`, `OutlinePill`, `OverlayHost`

**Files:**
- Create: `src/ui/Sheet.tsx`, `src/ui/SlideUpScreen.tsx`, `src/ui/Toast.tsx`, `src/ui/OutlinePill.tsx`, `src/overlays/OverlayHost.tsx`
- Modify: `app/_layout.tsx` (mount `<OverlayHost />`)
- Test: `src/ui/__tests__/Sheet.test.tsx`, `src/ui/__tests__/Toast.test.tsx`

**Interfaces:**
- Produces: `Sheet({ title, sub, action?, onClose, children, testID? })`; `SlideUpScreen({ caption, onClose, footer?, children, testID? })`; `Toast()` (reads the store); `OutlinePill({ label, icon, height, flex?, onPress, testID? })` — the outlined `Details`/`Scan` button (source line 2271); `OverlayHost()` renders, in z-order: `AddVehicleSheet` (sheet `'add'`), `RecallSheet` (sheet `'recall'`), `VinHelpScreen` (screen `'vinhelp'`), `Toast`, `SplashStub` (while `splash`). Until Tasks 18–21 exist, OverlayHost imports only `Toast`; each later task adds its line.

- [ ] **Step 1: Write the failing tests**

`src/ui/__tests__/Sheet.test.tsx`:
```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Sheet } from '../Sheet';

it('shows title, sub, action, children and closes on scrim tap', () => {
  const onClose = jest.fn();
  const { getByText, getByLabelText } = render(
    <Sheet title="Add a vehicle" sub="ENTER VIN · 17 CHARACTERS" action={<Text>act</Text>} onClose={onClose}><Text>body</Text></Sheet>,
  );
  expect(getByText('Add a vehicle')).toBeTruthy();
  expect(getByText('ENTER VIN · 17 CHARACTERS')).toBeTruthy();
  expect(getByText('act')).toBeTruthy();
  expect(getByText('body')).toBeTruthy();
  fireEvent.press(getByLabelText('Close sheet'));
  expect(onClose).toHaveBeenCalled();
});
```

`src/ui/__tests__/Toast.test.tsx`:
```tsx
import { render } from '@testing-library/react-native';
import { resetAppStore, useAppStore } from '../../store/useAppStore';
import { Toast } from '../Toast';

beforeEach(resetAppStore);

it('renders nothing until flashed, then the message with the check icon', () => {
  const { queryByTestId, getByText, getByTestId, rerender } = render(<Toast />);
  expect(queryByTestId('toast')).toBeNull();
  useAppStore.getState().flash('Service booked · Thu 10:30 AM');
  rerender(<Toast />);
  expect(getByText('Service booked · Thu 10:30 AM')).toBeTruthy();
  expect(getByTestId('icon-checkbox-circle-line')).toBeTruthy();
});
```

- [ ] **Step 2: Run** `npm test -- Sheet Toast` → FAIL.

- [ ] **Step 3: Write `src/ui/Sheet.tsx`** (source `sheetShell`, line 2203)

```tsx
import { BlurView } from 'expo-blur';
import { type ReactNode, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppBlurTarget } from '../overlays/blurTarget';
import { bez, blur, color, dur, ease } from '../theme/tokens';
import { Mono, Sans } from './Txt';

export function Sheet({ title, sub, action, onClose, children, testID }: { title: string; sub: string; action?: ReactNode; onClose: () => void; children: ReactNode; testID?: string }) {
  const insets = useSafeAreaInsets();
  const target = useAppBlurTarget();
  const scrim = useSharedValue(0);
  const slide = useSharedValue(1);
  const [h, setH] = useState(600);
  useEffect(() => {
    scrim.value = withTiming(1, { duration: dur.fade });
    slide.value = withTiming(0, { duration: dur.sheet, easing: bez(ease.standard) });
  }, [scrim, slide]);
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value }));
  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: slide.value * h }] }));
  return (
    <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]} testID={testID}>
      <Animated.View style={[StyleSheet.absoluteFill, scrimStyle]}>
        <Pressable accessibilityLabel="Close sheet" onPress={onClose} style={StyleSheet.absoluteFill}>
          <BlurView intensity={blur.scrim} tint="dark" blurMethod="dimezisBlurViewSdk31Plus" blurTarget={target} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: color.scrim }]} />
        </Pressable>
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View onLayout={(e) => setH(e.nativeEvent.layout.height)} style={[styles.panel, { paddingBottom: 28 + insets.bottom }, panelStyle]}>
          <View style={styles.handle} />
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Sans size={22} weight={600} ls={-0.5} color={color.ink}>{title}</Sans>
              <Mono size={10} ls={1.6} color={color.ink3} style={{ marginTop: 6 }}>{sub}</Mono>
            </View>
            {action}
          </View>
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: color.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, boxShadow: '0 -8px 40px rgba(0,0,0,0.18)', paddingTop: 10, paddingHorizontal: 20 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: color.handle, alignSelf: 'center', marginBottom: 18 },
});
```

- [ ] **Step 4: Write `src/ui/SlideUpScreen.tsx`** (source line 849)

```tsx
import { type ReactNode, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bez, color, dur, ease } from '../theme/tokens';
import { Icon } from './Icon';
import { Mono } from './Txt';

export function SlideUpScreen({ caption, onClose, footer, children, testID }: { caption: string; onClose: () => void; footer?: ReactNode; children: ReactNode; testID?: string }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const slide = useSharedValue(1);
  useEffect(() => { slide.value = withTiming(0, { duration: dur.screen, easing: bez(ease.sheet) }); }, [slide]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: slide.value * height }] }));
  return (
    <Animated.View testID={testID} style={[StyleSheet.absoluteFill, { backgroundColor: color.surface, paddingTop: insets.top }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 18, paddingHorizontal: 20, paddingBottom: 8 }}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={{ width: 38, height: 38, marginLeft: -9, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close-line" size={23} color={color.ink} />
        </Pressable>
        <Mono size={10} ls={1.8} color={color.ink3}>{caption}</Mono>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 20, paddingTop: 8, paddingHorizontal: 20, paddingBottom: 32 }}>{children}</ScrollView>
      {footer ? (
        <View style={{ flexDirection: 'row', gap: 10, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 18 + insets.bottom, borderTopWidth: 1, borderTopColor: color.hair07 }}>{footer}</View>
      ) : null}
    </Animated.View>
  );
}
```

- [ ] **Step 5: Write `src/ui/Toast.tsx`** (source `toastEl`, line 2277) and `src/ui/OutlinePill.tsx`

```tsx
// src/ui/Toast.tsx
import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';
import { color, dur } from '../theme/tokens';
import { Icon } from './Icon';
import { Sans } from './Txt';

export function Toast() {
  const toast = useAppStore((s) => s.toast);
  const insets = useSafeAreaInsets();
  if (!toast) return null;
  return <ToastBody key={toast} text={toast} bottom={104 + insets.bottom} />;
}

function ToastBody({ text, bottom }: { text: string; bottom: number }) {
  const o = useSharedValue(0);
  useEffect(() => { o.value = withTiming(1, { duration: dur.fade }); }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View testID="toast" pointerEvents="none" style={[{ position: 'absolute', left: 20, right: 20, bottom, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingHorizontal: 15, borderRadius: 12, backgroundColor: color.ink, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }, style]}>
      <Icon name="checkbox-circle-line" size={16} color={color.textOnDark} />
      <Sans size={13} color={color.textOnDark} style={{ flex: 1 }}>{text}</Sans>
    </Animated.View>
  );
}
```

```tsx
// src/ui/OutlinePill.tsx  — outlined "Details"/"Scan" buttons (source line 2271)
import { Pressable } from 'react-native';
import { color } from '../theme/tokens';
import { Icon } from './Icon';
import { Sans } from './Txt';

export function OutlinePill({ label, icon, height, flex = 1, onPress, testID }: { label: string; icon: string; height: number; flex?: number; onPress: () => void; testID?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} testID={testID}
      style={{ flex, height, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 999, borderWidth: 1, borderColor: color.hair14 }}>
      <Sans size={14} weight={500} color={color.ink}>{label}</Sans>
      <Icon name={icon} size={15} color={color.ink} />
    </Pressable>
  );
}
```

- [ ] **Step 6: Write `src/overlays/OverlayHost.tsx`** and mount it

```tsx
// src/overlays/OverlayHost.tsx — Tasks 18–21 each add one import + one line here.
import { StyleSheet, View } from 'react-native';
import { Toast } from '../ui/Toast';

export function OverlayHost() {
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Toast />
    </View>
  );
}
```

In `app/_layout.tsx`, replace the `{/* OverlayHost is mounted here in Task 14 */}` comment with `<OverlayHost />` and add `import { OverlayHost } from '../src/overlays/OverlayHost';`.

- [ ] **Step 7: Run** `npm test -- Sheet Toast && npm run typecheck` → PASS.

- [ ] **Step 8: Checkpoint** — "feat: sheet, slide-up screen, toast, outline pill, overlay host"

---

### Task 15: `HealthGauge`

**Files:**
- Create: `src/ui/HealthGauge.tsx`
- Test: `src/ui/__tests__/HealthGauge.test.tsx`

**Interfaces:**
- Produces: `HealthGauge({ health, gaugeColor, word })` and `countAt(target, elapsedMs)` (cubic ease-out over 1400 ms, source `openStats` line 1364). Source template lines 321–330.

- [ ] **Step 1: Write the failing test**

```tsx
import { act, render } from '@testing-library/react-native';
import { countAt, HealthGauge } from '../HealthGauge';

describe('countAt', () => {
  it('eases out cubically over 1400ms', () => {
    expect(countAt(65, 0)).toBe(0);
    expect(countAt(65, 700)).toBe(57);   // 65 * (1 - 0.5^3) = 56.875
    expect(countAt(65, 1400)).toBe(65);
    expect(countAt(65, 9999)).toBe(65);
  });
});

describe('HealthGauge', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  it('counts up to the health value', () => {
    const { getByTestId, getByText } = render(<HealthGauge health={65} gaugeColor="#0F638F" word="Fair" />);
    expect(getByText('Fair')).toBeTruthy();
    act(() => { jest.advanceTimersByTime(1500); });
    expect(getByTestId('gauge-count').props.children).toBe(65);
  });
});
```

- [ ] **Step 2: Run** `npm test -- HealthGauge` → FAIL.

- [ ] **Step 3: Write `src/ui/HealthGauge.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { bez, color, dur, ease } from '../theme/tokens';
import { Sans } from './Txt';

const R = 66;
const CIRC = 2 * Math.PI * R;
const ACircle = Animated.createAnimatedComponent(Circle);

export function countAt(target: number, elapsedMs: number) {
  const p = Math.min(1, elapsedMs / dur.gauge);
  return Math.round(target * (1 - Math.pow(1 - p, 3)));
}

export function HealthGauge({ health, gaugeColor, word }: { health: number; gaugeColor: string; word: string }) {
  const p = useSharedValue(0);
  const [count, setCount] = useState(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: dur.gauge, easing: bez(ease.gauge) });
    const t0 = Date.now();
    const id = setInterval(() => {
      const el = Date.now() - t0;
      setCount(countAt(health, el));
      if (el >= dur.gauge) clearInterval(id);
    }, 32);
    return () => clearInterval(id);
  }, [health, p]);
  const ring = useAnimatedProps(() => ({ strokeDashoffset: CIRC - (health / 100) * CIRC * p.value }));
  return (
    <View style={{ height: 196, alignItems: 'center', justifyContent: 'center', marginVertical: 6 }}>
      <Svg width={164} height={164} viewBox="0 0 164 164" style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={82} cy={82} r={R} strokeWidth={10} stroke={color.handle} fill="transparent" strokeDasharray="7 10" strokeLinecap="round" />
        <ACircle cx={82} cy={82} r={R} strokeWidth={10} stroke={gaugeColor} fill="transparent" strokeLinecap="round" strokeDasharray={`${CIRC}`} animatedProps={ring} />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Sans size={48} lh={50} weight={600} ls={-2} color={color.ink} testID="gauge-count">{count}</Sans>
        <Sans size={16} weight={500} color={color.ink5}>{word}</Sans>
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Run** `npm test -- HealthGauge && npm run typecheck` → PASS.

- [ ] **Step 5: Checkpoint** — "feat: animated health gauge with count-up"

---

### Task 16: Garage screen — `VehicleCard`, `Rail`, `Pager`, `GarageScreen`

**Files:**
- Create: `src/screens/garage/VehicleCard.tsx`, `src/screens/garage/Rail.tsx`, `src/screens/garage/Pager.tsx`, `src/screens/GarageScreen.tsx`
- Modify: `app/(tabs)/garage/index.tsx` (replace placeholder body)
- Test: `src/screens/__tests__/GarageScreen.test.tsx`

**Interfaces:**
- Consumes: `GlowCard`, `MetalButton`, `Icon`, `Sans`, `Mono`, rail math, derivations, store.
- Produces: `GarageScreen({ onOpenStats: (id: number) => void })`; `VehicleCard({ vehicle, active, scheduled, onPress, onAction })`; `Rail({ onOpenStats })`; `Pager()`. Source: template lines 41–125, `pager()` line 2189, rail logic lines 1303–1348.

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { GarageScreen } from '../GarageScreen';
import { resetAppStore, useAppStore } from '../../store/useAppStore';

beforeEach(resetAppStore);

describe('GarageScreen', () => {
  it('renders header, fleet line, counter and all three vehicles', () => {
    const { getByText, getAllByText } = render(<GarageScreen onOpenStats={jest.fn()} />);
    expect(getByText('RECALL HUB')).toBeTruthy();
    expect(getByText('Garage')).toBeTruthy();
    expect(getByText('3 VEHICLES · 1 RECALL')).toBeTruthy();
    expect(getByText('01 / 03')).toBeTruthy();
    expect(getAllByText('Model S Plaid').length).toBeGreaterThan(0);
    expect(getAllByText('Taycan 4S').length).toBeGreaterThan(0);
  });
  it('lists the open recall under NEEDS ATTENTION and opens the recall sheet', () => {
    const { getByText } = render(<GarageScreen onOpenStats={jest.fn()} />);
    expect(getByText('NEEDS ATTENTION')).toBeTruthy();
    fireEvent.press(getByText('Rear camera image failure'));
    expect(useAppStore.getState().sheet).toBe('recall');
  });
  it('shows all clear once scheduled', () => {
    useAppStore.getState().schedule();
    const { getByText } = render(<GarageScreen onOpenStats={jest.fn()} />);
    expect(getByText('3 VEHICLES · ALL CLEAR')).toBeTruthy();
    expect(getByText('Nothing outstanding across your fleet.')).toBeTruthy();
  });
  it('Add Vehicle opens the add sheet', () => {
    const { getByLabelText } = render(<GarageScreen onOpenStats={jest.fn()} />);
    fireEvent.press(getByLabelText('Add Vehicle'));
    expect(useAppStore.getState().sheet).toBe('add');
  });
  it('the active card shows recall badge copy and a red action pill', () => {
    const { getAllByText } = render(<GarageScreen onOpenStats={jest.fn()} />);
    expect(getAllByText('Recall open').length).toBeGreaterThan(0);
    expect(getAllByText('Fix available').length).toBeGreaterThan(0);
    expect(getAllByText('Review recall').length).toBeGreaterThan(0);
    expect(getAllByText('No recalls').length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run** `npm test -- GarageScreen` → FAIL.

- [ ] **Step 3: Write `src/screens/garage/VehicleCard.tsx`** (template lines 65–98)

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { Vehicle } from '../../fixtures/types';
import { isOpenRecall } from '../../lib/derive';
import { CARD_W } from '../../lib/rail';
import { color, dur } from '../../theme/tokens';
import { GlowCard } from '../../ui/GlowCard';
import { Icon } from '../../ui/Icon';
import { Mono, Sans } from '../../ui/Txt';

export function VehicleCard({ vehicle: v, active, scheduled, onPress, onAction }: { vehicle: Vehicle; active: boolean; scheduled: boolean; onPress: () => void; onAction: () => void }) {
  const open = isOpenRecall(v, scheduled);
  const dim = useSharedValue(active ? 1 : 0.55);
  useEffect(() => { dim.value = withTiming(active ? 1 : 0.55, { duration: dur.dim }); }, [active, dim]);
  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.value }));
  return (
    <Animated.View style={[{ width: CARD_W }, dimStyle]}>
      <Pressable onPress={onPress} accessibilityLabel={`${v.name} card`}>
        <GlowCard shell={color.sunken} radius={18} glow={open} blobSize={190} faceOpacity={0.82} faceRadius={16} faceStyle={{ paddingTop: 18, paddingHorizontal: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Mono size={10} ls={1.4} color={color.ink5}>{v.sync}</Mono>
            <Icon name="more-fill" size={18} color={color.ink4} />
          </View>
          <View style={{ marginTop: 26, gap: 4 }}>
            <Sans size={26} lh={30} weight={600} ls={-0.6} color={color.ink}>{v.name}</Sans>
            <Sans size={14} color={color.ink5}>{v.meta}</Sans>
          </View>
          <View style={{ marginTop: 22, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Mono size={10} ls={1.2} color={color.ink4}>HEALTH</Mono>
            <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: color.hair, overflow: 'hidden' }}>
              {open
                ? <LinearGradient colors={[color.amberBright, color.red]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ height: '100%', width: `${v.health}%`, borderRadius: 2 }} />
                : <View style={{ height: '100%', width: `${v.health}%`, borderRadius: 2, backgroundColor: color.teal }} />}
            </View>
            <Mono size={11} color={color.ink}>{v.health}%</Mono>
          </View>
          <View style={{ marginTop: 20, flexDirection: 'row' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 999, borderWidth: 1, borderColor: color.hair14, backgroundColor: color.tint02, paddingVertical: 6, paddingHorizontal: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name={open ? 'close-circle-fill' : 'checkbox-circle-fill'} size={15} color={open ? color.red : color.teal} />
                <Sans size={12} weight={500} color={color.ink}>{open ? 'Recall open' : 'No recalls'}</Sans>
              </View>
              <View style={{ width: 1, height: 14, backgroundColor: color.hair13 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="shield-check-line" size={15} color={color.ink5} />
                <Sans size={12} color={color.ink5}>{open ? 'Fix available' : 'Monitored'}</Sans>
              </View>
            </View>
          </View>
          <View style={{ marginTop: 22, marginHorizontal: -18, paddingVertical: 14, paddingHorizontal: 18, backgroundColor: color.sunken2, borderTopWidth: 1, borderTopColor: color.hair07, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
              <View style={{ gap: 3 }}><Mono size={9} ls={1.2} color={color.ink3}>RANGE</Mono><Sans size={13} color={color.ink2}>{v.range}</Sans></View>
              <View style={{ gap: 3 }}><Mono size={9} ls={1.2} color={color.ink3}>VIN</Mono><Mono size={12} color={color.ink2}>{v.vin}</Mono></View>
            </View>
            <Pressable onPress={onAction} accessibilityLabel={open ? 'Review recall' : 'Open'}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: open ? color.red : color.tint05 }}>
              <Sans size={12} weight={500} color={open ? '#ffffff' : color.ink}>{open ? 'Review recall' : 'Open'}</Sans>
              <Icon name="arrow-right-up-line" size={14} color={open ? '#ffffff' : color.ink} />
            </Pressable>
          </View>
        </GlowCard>
      </Pressable>
    </Animated.View>
  );
}
```

- [ ] **Step 4: Write `src/screens/garage/Rail.tsx`** (rail template line 63; logic lines 1303–1348)

```tsx
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { FlatList, type NativeScrollEvent, type NativeSyntheticEvent, StyleSheet, useWindowDimensions } from 'react-native';
import type { Vehicle } from '../../fixtures/types';
import { isOpenRecall } from '../../lib/derive';
import { GAP, liveIndex, middleSlot, railPadding, recenterSlot, slotForOffset, STEP } from '../../lib/rail';
import { useAppStore } from '../../store/useAppStore';
import { VehicleCard } from './VehicleCard';

export function Rail({ onOpenStats }: { onOpenStats: (id: number) => void }) {
  const { width } = useWindowDimensions();
  const vehicles = useAppStore((s) => s.vehicles);
  const idx = useAppStore((s) => s.idx);
  const scheduled = useAppStore((s) => s.scheduled);
  const setIdx = useAppStore((s) => s.setIdx);
  const openSheet = useAppStore((s) => s.openSheet);
  const n = vehicles.length;
  const data = useMemo(() => [0, 1, 2].flatMap(() => vehicles), [vehicles]);
  const list = useRef<FlatList<Vehicle>>(null);
  const scrollIdx = useRef(idx);
  const ready = useRef(false);

  const scrollTo = useCallback((i: number, animated: boolean) => {
    scrollIdx.current = i;
    list.current?.scrollToOffset({ offset: middleSlot(i, n) * STEP, animated });
  }, [n]);

  useEffect(() => { if (ready.current && idx !== scrollIdx.current) scrollTo(idx, true); }, [idx, scrollTo]);

  const onContentSizeChange = useCallback(() => {
    if (!ready.current) { ready.current = true; scrollTo(idx, false); }
  }, [idx, scrollTo]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const live = liveIndex(slotForOffset(e.nativeEvent.contentOffset.x), n);
    if (live !== scrollIdx.current) { scrollIdx.current = live; setIdx(live); }
  }, [n, setIdx]);

  const onMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slot = slotForOffset(e.nativeEvent.contentOffset.x);
    const rs = recenterSlot(slot, n);
    if (rs !== slot) list.current?.scrollToOffset({ offset: rs * STEP, animated: false });
  }, [n]);

  return (
    <MaskedView maskElement={<LinearGradient colors={['transparent', '#000', '#000', 'transparent']} locations={[0, 0.09, 0.91, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />}>
      <FlatList
        ref={list}
        testID="rail"
        horizontal
        data={data}
        keyExtractor={(v, slot) => `${v.id}-${slot}`}
        renderItem={({ item, index: slot }) => {
          const i = liveIndex(slot, n);
          return (
            <VehicleCard
              vehicle={item}
              active={i === idx}
              scheduled={scheduled}
              onPress={() => (i !== idx ? scrollTo(i, true) : onOpenStats(item.id))}
              onAction={() => (isOpenRecall(item, scheduled) ? openSheet('recall') : onOpenStats(item.id))}
            />
          );
        }}
        contentContainerStyle={{ paddingHorizontal: railPadding(width), gap: GAP }}
        showsHorizontalScrollIndicator={false}
        snapToInterval={STEP}
        snapToAlignment="start"
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumEnd}
        onContentSizeChange={onContentSizeChange}
        initialNumToRender={3 * n}
      />
    </MaskedView>
  );
}
```

- [ ] **Step 5: Write `src/screens/garage/Pager.tsx`** (`pager()`, line 2189)

```tsx
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useAppStore } from '../../store/useAppStore';
import { color, dur } from '../../theme/tokens';

export function Pager() {
  const vehicles = useAppStore((s) => s.vehicles);
  const idx = useAppStore((s) => s.idx);
  const setIdx = useAppStore((s) => s.setIdx);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20 }} testID="pager">
      {vehicles.map((v, i) => <Dot key={v.id} active={i === idx} hasRecall={!!v.recall} onPress={() => setIdx(i)} />)}
    </View>
  );
}

function Dot({ active, hasRecall, onPress }: { active: boolean; hasRecall: boolean; onPress: () => void }) {
  const a = useSharedValue(active ? 1 : 0);
  useEffect(() => { a.value = withTiming(active ? 1 : 0, { duration: dur.dim }); }, [active, a]);
  const style = useAnimatedStyle(() => ({ width: 6 + 16 * a.value, opacity: 1 }));
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <Animated.View style={[{ height: 2, borderRadius: 1, backgroundColor: active ? (hasRecall ? color.red : color.ink) : color.handle }, style]} />
    </Pressable>
  );
}
```

- [ ] **Step 6: Write `src/screens/GarageScreen.tsx`** (template lines 41–125)

```tsx
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { counter, fleetLine, isOpenRecall, recallCount } from '../lib/derive';
import { useAppStore } from '../store/useAppStore';
import { color } from '../theme/tokens';
import { Icon } from '../ui/Icon';
import { MetalButton } from '../ui/MetalButton';
import { Mono, Sans } from '../ui/Txt';
import { Pager } from './garage/Pager';
import { Rail } from './garage/Rail';

export function GarageScreen({ onOpenStats }: { onOpenStats: (id: number) => void }) {
  const insets = useSafeAreaInsets();
  const vehicles = useAppStore((s) => s.vehicles);
  const idx = useAppStore((s) => s.idx);
  const scheduled = useAppStore((s) => s.scheduled);
  const openSheet = useAppStore((s) => s.openSheet);
  const alerts = vehicles.filter((v) => isOpenRecall(v, scheduled));
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 26, paddingTop: insets.top, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
      <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}>
        <View style={{ width: 36, height: 36, marginLeft: -8, alignItems: 'center', justifyContent: 'center' }}><Icon name="menu-2-line" size={20} color={color.ink5} /></View>
        <Mono size={11} ls={2.6} color={color.ink5} center style={{ flex: 1 }}>RECALL HUB</Mono>
        <View style={{ width: 36, height: 36, marginRight: -8, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="notification-3-line" size={19} color={color.ink5} />
          <View style={{ position: 'absolute', right: 6, top: 7, width: 6, height: 6, borderRadius: 3, backgroundColor: color.red }} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, paddingHorizontal: 20 }}>
        <View style={{ gap: 6 }}>
          <Sans size={38} lh={42} weight={600} ls={-1.2} color={color.ink}>Garage</Sans>
          <Mono size={11} ls={1.4} color={color.ink4}>{fleetLine(vehicles, scheduled)}</Mono>
        </View>
        <MetalButton tint="blue" label="Add Vehicle" icon="sparkling-2-line" onPress={() => openSheet('add')} />
      </View>

      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 20 }}>
          <Mono size={10} ls={1.8} color={color.ink4}>YOUR VEHICLES</Mono>
          <Mono size={10} ls={1.8} color={color.ink4}>{counter(idx, vehicles.length)}</Mono>
        </View>
        <Rail onOpenStats={onOpenStats} />
        <Pager />
      </View>

      <View style={{ gap: 10, paddingHorizontal: 20 }}>
        <Mono size={10} ls={1.8} color={color.ink4}>NEEDS ATTENTION</Mono>
        {alerts.map((v) => (
          <Pressable key={v.id} onPress={() => openSheet('recall')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, backgroundColor: color.sunken }}>
            <Icon name="error-warning-line" size={18} color={color.red} />
            <View style={{ flex: 1, gap: 2 }}>
              <Sans size={14} weight={500} color={color.ink}>{v.recall!.title}</Sans>
              <Mono size={10} ls={1} color={color.ink3}>{v.recall!.code + ' · ' + v.name.toUpperCase()}</Mono>
            </View>
            <Icon name="arrow-right-s-line" size={20} color={color.ink4} />
          </Pressable>
        ))}
        {recallCount(vehicles, scheduled) === 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, backgroundColor: color.sunken }}>
            <Icon name="checkbox-circle-fill" size={18} color={color.teal} />
            <Sans size={14} color={color.ink2}>Nothing outstanding across your fleet.</Sans>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 7: Wire the route** — replace the body of `app/(tabs)/garage/index.tsx`:

```tsx
import { useRouter } from 'expo-router';
import { GarageScreen } from '../../../src/screens/GarageScreen';

export default function GarageRoute() {
  const router = useRouter();
  return <GarageScreen onOpenStats={(id) => router.push({ pathname: '/(tabs)/garage/[id]', params: { id: String(id) } })} />;
}
```

(The `[id]` route is created in Task 17; until then typed routes may flag the pathname — that is expected and resolves in the next task.)

- [ ] **Step 8: Run** `npm test -- GarageScreen && npm run typecheck` → PASS (typecheck may report the `[id]` pathname only if typed routes are on; otherwise clean).

- [ ] **Step 9: Verify on the emulator** — reload, screenshot `docs/reference/t16-garage.png`, compare with `garage-idle.png`. Swipe the rail to the Taycan, screenshot `t16-garage-card2.png`, compare with `garage-card2.png`. Swipe past the Civic and confirm it wraps to the Model S with no jump.
Expected matches: header row; "Garage" + "3 VEHICLES · 1 RECALL"; Model S card with the pink/red/amber glow drifting slowly behind a frosted face, amber→red health bar at 65%, red "Review recall" pill; neighbouring cards at 55% opacity fading at the edges; pager with a 22 px red active bar; the alert row. Note in `verification.md` (Task 22) that the flick deceleration is native.

- [ ] **Step 10: Checkpoint** — "feat: garage screen with infinite vehicle rail"

---

### Task 17: Vehicle stats screen and its route

**Files:**
- Create: `src/screens/VehicleStatsScreen.tsx`, `app/(tabs)/garage/[id].tsx`
- Test: `src/screens/__tests__/VehicleStatsScreen.test.tsx`

**Interfaces:**
- Consumes: `statsFor`, `GlowCard`, `MetalButton`, `OutlinePill`, `HealthGauge`, store.
- Produces: `VehicleStatsScreen({ id, onBack, onRecallDetails })`. Source: template lines 275–361.

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { VehicleStatsScreen } from '../VehicleStatsScreen';
import { resetAppStore, useAppStore } from '../../store/useAppStore';

beforeEach(() => { resetAppStore(); jest.useFakeTimers(); });
afterEach(() => jest.useRealTimers());

describe('VehicleStatsScreen', () => {
  it('shows the Model S with its active recall, tiles and maintenance', () => {
    const { getByText } = render(<VehicleStatsScreen id={1} onBack={jest.fn()} onRecallDetails={jest.fn()} />);
    expect(getByText('Model S Plaid')).toBeTruthy();
    expect(getByText('2024 TESLA · 42,000 MI · VIN ···· F12345')).toBeTruthy();
    expect(getByText('ACTIVE SAFETY RECALL')).toBeTruthy();
    expect(getByText('Rear camera image failure')).toBeTruthy();
    expect(getByText('Fair')).toBeTruthy();
    expect(getByText('NEXT OIL CHANGE')).toBeTruthy();
    expect(getByText('LAST DONE AT 37,200 MI')).toBeTruthy();
  });
  it('shows the clear row for the Taycan', () => {
    const { getByText, queryByText } = render(<VehicleStatsScreen id={2} onBack={jest.fn()} onRecallDetails={jest.fn()} />);
    expect(getByText('No open recalls')).toBeTruthy();
    expect(getByText('CHECKED AGAINST NHTSA · 12 MIN AGO')).toBeTruthy();
    expect(queryByText('ACTIVE SAFETY RECALL')).toBeNull();
  });
  it('Schedule Repair schedules and toasts; Details calls back; back calls back', () => {
    const onBack = jest.fn(); const onDetails = jest.fn();
    const { getByLabelText } = render(<VehicleStatsScreen id={1} onBack={onBack} onRecallDetails={onDetails} />);
    fireEvent.press(getByLabelText('Schedule Repair'));
    expect(useAppStore.getState().scheduled).toBe(true);
    expect(useAppStore.getState().toast).toBe('Service booked · Thu 10:30 AM');
    fireEvent.press(getByLabelText('Back'));
    expect(onBack).toHaveBeenCalled();
  });
  it('Details is reachable while the recall is open', () => {
    const onDetails = jest.fn();
    const { getByLabelText } = render(<VehicleStatsScreen id={1} onBack={jest.fn()} onRecallDetails={onDetails} />);
    fireEvent.press(getByLabelText('Details'));
    expect(onDetails).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run** `npm test -- VehicleStatsScreen` → FAIL.

- [ ] **Step 3: Write `src/screens/VehicleStatsScreen.tsx`**

```tsx
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { statsFor } from '../lib/derive';
import { useAppStore } from '../store/useAppStore';
import { color } from '../theme/tokens';
import { GlowCard } from '../ui/GlowCard';
import { HealthGauge } from '../ui/HealthGauge';
import { Icon } from '../ui/Icon';
import { MetalButton } from '../ui/MetalButton';
import { OutlinePill } from '../ui/OutlinePill';
import { Mono, Sans } from '../ui/Txt';

export function VehicleStatsScreen({ id, onBack, onRecallDetails }: { id: number; onBack: () => void; onRecallDetails: () => void }) {
  const insets = useSafeAreaInsets();
  const v = useAppStore((s) => s.vehicles.find((x) => x.id === id));
  const scheduled = useAppStore((s) => s.scheduled);
  const schedule = useAppStore((s) => s.schedule);
  const flash = useAppStore((s) => s.flash);
  if (!v) return null;
  const s = statsFor(v, scheduled);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 22, paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable accessibilityLabel="Back" onPress={onBack} style={{ width: 36, height: 36, marginLeft: -8, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrow-left-line" size={20} color={color.ink} />
        </Pressable>
        <View style={{ gap: 2 }}>
          <Sans size={24} lh={28} weight={600} ls={-0.7} color={color.ink}>{s.name}</Sans>
          <Mono size={10} ls={1.4} color={color.ink3}>{s.metaUpper}</Mono>
        </View>
      </View>

      {s.hasRecall ? (
        <GlowCard shell={color.shellDark} radius={20} glow blobSize={210} faceOpacity={0.84} faceRadius={18} faceStyle={{ padding: 18, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: color.red, paddingVertical: 5, paddingHorizontal: 10 }}>
              <Icon name="alarm-warning-fill" size={12} color="#fff" />
              <Mono size={9} ls={1.4} color="#fff">ACTIVE SAFETY RECALL</Mono>
            </View>
            <Mono size={10} ls={1.2} color={color.ink3}>{s.recallCode}</Mono>
          </View>
          <View style={{ gap: 4 }}>
            <Sans size={21} lh={25} weight={600} ls={-0.5} color={color.ink}>{s.recallTitle}</Sans>
            <Sans size={13} color={color.ink5}>Free remedy available · 45 min at Tesla Service, 6.2 mi away</Sans>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'stretch' }}>
            <MetalButton tint="blue" label="Schedule Repair" icon="calendar-2-line" flex={1.4} width="auto" height={50} radius={999} gap={8} iconSize={16} fontSize={14}
              onPress={() => { schedule(); flash('Service booked · Thu 10:30 AM'); }} />
            <OutlinePill label="Details" icon="arrow-right-up-line" height={50} onPress={onRecallDetails} />
          </View>
        </GlowCard>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 16, backgroundColor: color.sunken, paddingVertical: 15, paddingHorizontal: 16 }}>
          <Icon name="shield-check-fill" size={19} color={color.teal} />
          <View style={{ flex: 1, gap: 2 }}>
            <Sans size={14} weight={500} color={color.ink}>{s.clearTitle}</Sans>
            <Mono size={9} ls={1.2} color={color.ink3}>{'CHECKED AGAINST NHTSA · ' + s.clearMeta}</Mono>
          </View>
        </View>
      )}

      <View style={{ borderRadius: 20, backgroundColor: color.sunken, paddingTop: 22, paddingHorizontal: 22, paddingBottom: 26, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Sans size={17} weight={500} color={color.ink5}>Vehicle health</Sans>
          <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: s.gaugeColor }}><Icon name="pulse-line" size={19} color="#ffffff" /></View>
        </View>
        <HealthGauge health={v.health} gaugeColor={s.gaugeColor} word={s.word} />
        <Sans size={13} color={color.ink5} center>{s.summary}</Sans>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {s.tiles.map((t) => (
          <View key={t.label} style={{ width: '48%', flexGrow: 1, borderRadius: 14, backgroundColor: color.sunken, paddingVertical: 14, paddingHorizontal: 15, gap: 7 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <Icon name={t.icon} size={15} color={t.tone} />
              <Mono size={9} ls={1.3} color={color.ink3}>{t.label}</Mono>
            </View>
            <Sans size={20} weight={600} ls={-0.5} color={color.ink}>{t.value}</Sans>
            <Sans size={12} color={color.ink5}>{t.note}</Sans>
          </View>
        ))}
      </View>

      <View style={{ gap: 10 }}>
        <Mono size={10} ls={1.8} color={color.ink4}>MAINTENANCE</Mono>
        {s.service.map((m) => (
          <View key={m.key} style={{ borderRadius: 14, backgroundColor: color.sunken, paddingVertical: 14, paddingHorizontal: 15, gap: 9 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
              <Sans size={14} weight={500} color={color.ink}>{m.label}</Sans>
              <Mono size={11} color={m.tone}>{m.due}</Mono>
            </View>
            <View style={{ height: 3, borderRadius: 2, backgroundColor: color.hair, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${m.pct}%`, borderRadius: 2, backgroundColor: m.tone }} />
            </View>
            <Mono size={9} ls={1.2} color={color.ink3}>{m.meta}</Mono>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
```

The 2-column grid uses `width: '48%'` + `gap: 10` so two tiles fit per row at any width; the design's `1fr 1fr` with a 10 px gap is the same geometry.

- [ ] **Step 4: Write `app/(tabs)/garage/[id].tsx`**

```tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VehicleStatsScreen } from '../../../src/screens/VehicleStatsScreen';
import { useAppStore } from '../../../src/store/useAppStore';

export default function StatsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const switchTab = useAppStore((s) => s.switchTab);
  return (
    <VehicleStatsScreen
      id={Number(id)}
      onBack={() => router.back()}
      onRecallDetails={() => { switchTab('recalls'); router.navigate('/(tabs)/recalls'); }}
    />
  );
}
```

- [ ] **Step 5: Run** `npm test -- VehicleStatsScreen && npm run typecheck` → PASS.

- [ ] **Step 6: Verify on the emulator** — tap the Model S card (it's active), screenshot after ~1.6 s → `docs/reference/t17-stats-model-s.png`; compare with `stats-model-s.png`. Back, swipe to Taycan, tap it → `t17-stats-taycan.png` vs `stats-taycan.png`.
Expected: instant in-place swap (no slide); the ring sweeps to 65 over 1.4 s while the number counts up; "Fair"; the dark-shelled recall card with glow; four tiles; three maintenance bars. Android back button returns to Garage.

- [ ] **Step 7: Checkpoint** — "feat: vehicle stats screen with animated gauge"

---

### Task 18: Add-vehicle sheet

**Files:**
- Create: `src/screens/AddVehicleSheet.tsx`
- Modify: `src/overlays/OverlayHost.tsx` (add `{sheet === 'add' && <AddVehicleSheet />}` before `<Toast />`)
- Test: `src/screens/__tests__/AddVehicleSheet.test.tsx`

**Interfaces:**
- Consumes: `Sheet`, `Icon`, `Sans`, `Mono`, `vinOk`, `decodeVin`, `DECODE`, `DEMO_VIN`, store.
- Produces: `AddVehicleSheet()` — reads/writes the store directly. Source: `addSheet`, line 2217.

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { AddVehicleSheet } from '../AddVehicleSheet';
import { DEMO_VIN } from '../../fixtures/decode';
import { resetAppStore, useAppStore } from '../../store/useAppStore';

beforeEach(() => { resetAppStore(); useAppStore.getState().openSheet('add'); });

describe('AddVehicleSheet', () => {
  it('flashes when submitting an empty VIN', () => {
    const { getByLabelText } = render(<AddVehicleSheet />);
    fireEvent.press(getByLabelText('Add to garage'));
    expect(useAppStore.getState().toast).toBe('Enter a VIN first');
    expect(useAppStore.getState().vehicles).toHaveLength(3);
  });
  it('sample VIN chip fills the field and shows the decoded preview', () => {
    const { getByText, rerender } = render(<AddVehicleSheet />);
    fireEvent.press(getByText('Use sample VIN'));
    expect(useAppStore.getState().vin).toBe(DEMO_VIN);
    rerender(<AddVehicleSheet />);
    expect(getByText('F-150 Lightning')).toBeTruthy();
    expect(getByText('2023 Ford · 8,410 mi')).toBeTruthy();
  });
  it('typing a VIN and submitting adds the vehicle and closes', () => {
    const { getByPlaceholderText, getByLabelText, rerender } = render(<AddVehicleSheet />);
    fireEvent.changeText(getByPlaceholderText('1FTVW1EL5NWG00001'), DEMO_VIN);
    rerender(<AddVehicleSheet />);
    fireEvent.press(getByLabelText('Add to garage'));
    expect(useAppStore.getState().vehicles).toHaveLength(4);
    expect(useAppStore.getState().sheet).toBeNull();
  });
  it('scan chip flashes the not-wired message; info opens VIN help', () => {
    const { getByText, getByLabelText } = render(<AddVehicleSheet />);
    fireEvent.press(getByText('Scan'));
    expect(useAppStore.getState().toast).toBe('Camera scan is not wired up in this prototype');
    fireEvent.press(getByLabelText('Where do I find my VIN?'));
    expect(useAppStore.getState().screen).toBe('vinhelp');
    expect(useAppStore.getState().sheet).toBe('add');
  });
});
```

- [ ] **Step 2: Run** `npm test -- AddVehicleSheet` → FAIL.

- [ ] **Step 3: Write `src/screens/AddVehicleSheet.tsx`**

```tsx
import { useEffect } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { DECODE, DEMO_VIN } from '../fixtures/decode';
import { vinOk } from '../lib/derive';
import { useAppStore } from '../store/useAppStore';
import { color, dur, font } from '../theme/tokens';
import { Icon } from '../ui/Icon';
import { Sheet } from '../ui/Sheet';
import { Sans } from '../ui/Txt';

export function AddVehicleSheet() {
  const vin = useAppStore((s) => s.vin);
  const setVin = useAppStore((s) => s.setVin);
  const addVehicle = useAppStore((s) => s.addVehicle);
  const closeSheet = useAppStore((s) => s.closeSheet);
  const openVinHelp = useAppStore((s) => s.openVinHelp);
  const flash = useAppStore((s) => s.flash);
  const raw = vin.trim().toUpperCase();
  const decoded = DECODE[raw];
  const ok = vinOk(raw);

  const info = (
    <Pressable accessibilityLabel="Where do I find my VIN?" onPress={openVinHelp}
      style={{ width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: color.hair14, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="information-line" size={18} color={color.ink2} />
    </Pressable>
  );

  return (
    <Sheet title="Add a vehicle" sub="ENTER VIN · 17 CHARACTERS" action={info} onClose={closeSheet} testID="sheet-add">
      <View style={{ gap: 14, marginTop: 20 }}>
        <TextInput
          value={vin}
          onChangeText={setVin}
          onSubmitEditing={() => { if (ok) addVehicle(); }}
          autoFocus
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="1FTVW1EL5NWG00001"
          placeholderTextColor={color.ink7}
          allowFontScaling={false}
          style={{ fontFamily: font.mono400, fontSize: 15, letterSpacing: 1.2, color: color.ink, paddingVertical: 15, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: color.hair14, backgroundColor: color.input }}
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip icon="file-list-3-line" label="Use sample VIN" onPress={() => setVin(DEMO_VIN)} />
          <Chip icon="camera-line" label="Scan" onPress={() => flash('Camera scan is not wired up in this prototype')} />
        </View>
        {decoded ? <Preview name={decoded.name} meta={decoded.meta} /> : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Add to garage" onPress={() => (ok ? addVehicle() : flash('Enter a VIN first'))}
          style={{ marginTop: 4, alignItems: 'center', paddingVertical: 15, borderRadius: 999, backgroundColor: ok ? color.ink : color.disabled }}>
          <Sans size={14} weight={500} color={ok ? '#fff' : color.disabledInk}>Add to garage</Sans>
        </Pressable>
      </View>
    </Sheet>
  );
}

function Chip({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: color.hair14 }}>
      <Icon name={icon} size={14} color={color.ink2} />
      <Sans size={12} color={color.ink2}>{label}</Sans>
    </Pressable>
  );
}

function Preview({ name, meta }: { name: string; meta: string }) {
  const o = useSharedValue(0);
  useEffect(() => { o.value = withTiming(1, { duration: dur.fade }); }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: color.sunken }, style]}>
      <Icon name="checkbox-circle-fill" size={17} color={color.teal} />
      <View>
        <Sans size={14} weight={500} color={color.ink}>{name}</Sans>
        <Sans size={12} color={color.ink5}>{meta}</Sans>
      </View>
    </Animated.View>
  );
}
```

- [ ] **Step 4: Mount it** — in `OverlayHost.tsx`:

```tsx
import { useAppStore } from '../store/useAppStore';
import { AddVehicleSheet } from '../screens/AddVehicleSheet';
// inside OverlayHost:
const sheet = useAppStore((s) => s.sheet);
// in the JSX, above <Toast />:
{sheet === 'add' && <AddVehicleSheet />}
```

- [ ] **Step 5: Run** `npm test -- AddVehicleSheet && npm run typecheck` → PASS.

- [ ] **Step 6: Verify on the emulator** — tap Add Vehicle → screenshot `t18-sheet-empty.png` vs `sheet-add-empty.png`; tap Use sample VIN → `t18-sheet-sample.png` vs `sheet-add-sample.png`; tap Add to garage → `t18-added.png` vs `garage-added-toast.png`.
Expected: sheet slides up in ~0.3 s over a dimmed, faintly blurred garage; mono VIN field focused with the keyboard up and the sheet above it; the F-150 preview fades in; the CTA turns black; after adding, the rail scrolls to the new "F-150 Lightning" card and the toast reads "F-150 Lightning added · monitoring for recalls".

- [ ] **Step 7: Checkpoint** — "feat: add-vehicle sheet"

---

### Task 19: VIN help screen

**Files:**
- Create: `src/screens/VinHelpScreen.tsx`
- Modify: `src/overlays/OverlayHost.tsx` (add `{screen === 'vinhelp' && <VinHelpScreen />}` after the sheets, before `<Toast />`)
- Test: `src/screens/__tests__/VinHelpScreen.test.tsx`

**Interfaces:**
- Consumes: `SlideUpScreen`, `VIN_SPOTS`, `Icon`, `Sans`, `Mono`, `OutlinePill`, store.
- Produces: `VinHelpScreen()`. Source: template lines 848–895.

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { VinHelpScreen } from '../VinHelpScreen';
import { resetAppStore, useAppStore } from '../../store/useAppStore';

beforeEach(() => { resetAppStore(); useAppStore.getState().openSheet('add'); useAppStore.getState().openVinHelp(); });

describe('VinHelpScreen', () => {
  it('renders the four spots and the sample VIN', () => {
    const { getByText } = render(<VinHelpScreen />);
    expect(getByText('Where to find your VIN')).toBeTruthy();
    expect(getByText('Base of the windshield')).toBeTruthy();
    expect(getByText('Vehicle software')).toBeTruthy();
    expect(getByText('1FTVW1EL5NWG00001')).toBeTruthy();
    expect(getByText('17 CHARACTERS · NO I, O OR Q')).toBeTruthy();
  });
  it('Enter manually returns to the add sheet', () => {
    const { getByLabelText } = render(<VinHelpScreen />);
    fireEvent.press(getByLabelText('Enter manually'));
    expect(useAppStore.getState()).toMatchObject({ screen: null, sheet: 'add' });
  });
  it('Scan returns to the sheet and flashes', () => {
    const { getByLabelText } = render(<VinHelpScreen />);
    fireEvent.press(getByLabelText('Scan'));
    expect(useAppStore.getState().screen).toBeNull();
    expect(useAppStore.getState().toast).toBe('Camera scan is not wired up in this prototype');
  });
  it('Close only closes the help screen', () => {
    const { getByLabelText } = render(<VinHelpScreen />);
    fireEvent.press(getByLabelText('Close'));
    expect(useAppStore.getState()).toMatchObject({ screen: null, sheet: 'add' });
  });
});
```

- [ ] **Step 2: Run** `npm test -- VinHelpScreen` → FAIL.

- [ ] **Step 3: Write `src/screens/VinHelpScreen.tsx`**

```tsx
import { Pressable, View } from 'react-native';
import { VIN_SPOTS } from '../fixtures/vinHelp';
import { useAppStore } from '../store/useAppStore';
import { color } from '../theme/tokens';
import { Icon } from '../ui/Icon';
import { OutlinePill } from '../ui/OutlinePill';
import { SlideUpScreen } from '../ui/SlideUpScreen';
import { Mono, Sans } from '../ui/Txt';

export function VinHelpScreen() {
  const closeVinHelp = useAppStore((s) => s.closeVinHelp);
  const openSheet = useAppStore((s) => s.openSheet);
  const flash = useAppStore((s) => s.flash);
  const manual = () => { closeVinHelp(); openSheet('add'); };
  const scan = () => { manual(); flash('Camera scan is not wired up in this prototype'); };

  const footer = (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel="Enter manually" onPress={manual}
        style={{ flex: 1, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 999, backgroundColor: color.ink }}>
        <Icon name="keyboard-line" size={17} color={color.textOnDark} />
        <Sans size={15} weight={500} color={color.textOnDark}>Enter manually</Sans>
      </Pressable>
      <OutlinePill label="Scan" icon="camera-line" height={52} onPress={scan} />
    </>
  );

  return (
    <SlideUpScreen caption="FINDING YOUR VIN" onClose={closeVinHelp} footer={footer} testID="vin-help">
      <View style={{ gap: 7 }}>
        <Sans size={30} lh={35} weight={600} ls={-1.1} color={color.ink}>Where to find your VIN</Sans>
        <Sans size={14} lh={21} color={color.ink5}>Every road vehicle carries a unique 17-character Vehicle Identification Number. Any of these four places will have it.</Sans>
      </View>
      <View style={{ gap: 10 }}>
        {VIN_SPOTS.map((sp) => (
          <View key={sp.tag} style={{ borderRadius: 16, backgroundColor: color.sunken, padding: 16, flexDirection: 'row', gap: 13, alignItems: 'flex-start' }}>
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' }}><Icon name={sp.icon} size={19} color={color.blueDeep} /></View>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Sans size={15} weight={600} ls={-0.2} color={color.ink}>{sp.title}</Sans>
                <Mono size={9} ls={1.2} color={color.ink3}>{sp.tag}</Mono>
              </View>
              <Sans size={13} lh={19} color={color.ink5}>{sp.body}</Sans>
            </View>
          </View>
        ))}
      </View>
      <View style={{ gap: 9 }}>
        <Mono size={10} ls={1.8} color={color.ink4}>WHAT IT LOOKS LIKE</Mono>
        <View style={{ borderRadius: 16, backgroundColor: color.ink, paddingVertical: 18, paddingHorizontal: 16, gap: 9 }}>
          <Mono size={17} ls={2.4} color={color.textOnDark}>1FTVW1EL5NWG00001</Mono>
          <Mono size={9} ls={1.3} color="rgba(255,255,255,0.45)">17 CHARACTERS · NO I, O OR Q</Mono>
        </View>
        <Sans size={13} lh={19} color={color.ink5}>If a character looks like a letter I, O or Q, it is a 1 or a 0 — those three letters are never used in a VIN.</Sans>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, backgroundColor: color.sunken, paddingVertical: 14, paddingHorizontal: 15 }}>
        <Icon name="information-line" size={17} color={color.blueDeep} />
        <Sans size={13} lh={19} color={color.ink2} style={{ flex: 1 }}>Your VIN is only used to match your vehicle against NHTSA recall records. It is never shared.</Sans>
      </View>
    </SlideUpScreen>
  );
}
```

- [ ] **Step 4: Mount it** — in `OverlayHost.tsx` add `const screen = useAppStore((s) => s.screen);` and `{screen === 'vinhelp' && <VinHelpScreen />}` after the sheet lines.

- [ ] **Step 5: Run** `npm test -- VinHelpScreen && npm run typecheck` → PASS.

- [ ] **Step 6: Verify on the emulator** — Add Vehicle → info button → screenshot `t19-vinhelp.png` vs `vin-help.png`. Close → the add sheet is still there underneath.
Expected: white full screen sliding up over the sheet in ~0.34 s; four grey spot cards with blue icons in white discs; the dark VIN sample card; two pinned footer buttons above the gesture inset.

- [ ] **Step 7: Checkpoint** — "feat: VIN help screen"

---

### Task 20: Recall sheet

**Files:**
- Create: `src/screens/RecallSheet.tsx`
- Modify: `src/overlays/OverlayHost.tsx` (add `{sheet === 'recall' && <RecallSheet onDetails={…} />}`)
- Test: `src/screens/__tests__/RecallSheet.test.tsx`

**Interfaces:**
- Consumes: `Sheet`, `RECALL_ROWS`, `MetalButton`, `OutlinePill`, store.
- Produces: `RecallSheet({ onDetails: () => void })`. Source: `recallSheet`, line 2250.

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { RecallSheet } from '../RecallSheet';
import { resetAppStore, useAppStore } from '../../store/useAppStore';

beforeEach(() => { resetAppStore(); useAppStore.getState().openSheet('recall'); });

describe('RecallSheet', () => {
  it('shows the recall title, code line and four rows', () => {
    const { getByText } = render(<RecallSheet onDetails={jest.fn()} />);
    expect(getByText('Rear camera image failure')).toBeTruthy();
    expect(getByText('NHTSA 24V-137 · MODEL S PLAID')).toBeTruthy();
    expect(getByText('Tesla Service — 6.2 mi')).toBeTruthy();
    expect(getByText('45 minutes')).toBeTruthy();
  });
  it('Schedule Repair schedules, closes and toasts; label flips to Scheduled', () => {
    const { getByLabelText, rerender, queryByLabelText } = render(<RecallSheet onDetails={jest.fn()} />);
    fireEvent.press(getByLabelText('Schedule Repair'));
    expect(useAppStore.getState()).toMatchObject({ scheduled: true, sheet: null, toast: 'Service booked · Thu 10:30 AM' });
    useAppStore.getState().openSheet('recall');
    rerender(<RecallSheet onDetails={jest.fn()} />);
    expect(queryByLabelText('Schedule Repair')).toBeNull();
    expect(getByLabelText('Scheduled')).toBeTruthy();
  });
  it('Details closes, switches to recalls, toasts and calls back', () => {
    const onDetails = jest.fn();
    const { getByLabelText } = render(<RecallSheet onDetails={onDetails} />);
    fireEvent.press(getByLabelText('Details'));
    expect(useAppStore.getState()).toMatchObject({ sheet: null, tab: 'recalls', toast: 'NHTSA 24V-137 · opening recall detail' });
    expect(onDetails).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run** `npm test -- RecallSheet` → FAIL.

- [ ] **Step 3: Write `src/screens/RecallSheet.tsx`**

```tsx
import { View } from 'react-native';
import { RECALL_ROWS } from '../fixtures/recallSheet';
import { useAppStore } from '../store/useAppStore';
import { color } from '../theme/tokens';
import { MetalButton } from '../ui/MetalButton';
import { OutlinePill } from '../ui/OutlinePill';
import { Sheet } from '../ui/Sheet';
import { Mono, Sans } from '../ui/Txt';

export function RecallSheet({ onDetails }: { onDetails: () => void }) {
  const v = useAppStore((s) => s.vehicles.find((x) => x.recall));
  const scheduled = useAppStore((s) => s.scheduled);
  const schedule = useAppStore((s) => s.schedule);
  const closeSheet = useAppStore((s) => s.closeSheet);
  const switchTab = useAppStore((s) => s.switchTab);
  const flash = useAppStore((s) => s.flash);
  if (!v || !v.recall) return null;
  const r = v.recall;
  return (
    <Sheet title={r.title} sub={r.code + ' · ' + v.name.toUpperCase()} onClose={closeSheet} testID="sheet-recall">
      <View style={{ marginTop: 18 }}>
        {RECALL_ROWS.map(([k, val]) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: color.hair07 }}>
            <Mono size={10} ls={1.2} color={color.ink3}>{k}</Mono>
            <Sans size={13} color={color.ink}>{val}</Sans>
          </View>
        ))}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
          <MetalButton tint="blue" label={scheduled ? 'Scheduled' : 'Schedule Repair'} icon="calendar-2-line" flex={1.5} width="auto" height={54} radius={16} gap={9} iconSize={17} fontSize={15}
            onPress={() => { schedule(); closeSheet(); flash('Service booked · Thu 10:30 AM'); }} />
          <OutlinePill label="Details" icon="arrow-right-up-line" height={54}
            onPress={() => { closeSheet(); switchTab('recalls'); flash(r.code + ' · opening recall detail'); onDetails(); }} />
        </View>
      </View>
    </Sheet>
  );
}
```

- [ ] **Step 4: Mount it** — in `OverlayHost.tsx`:

```tsx
import { useRouter } from 'expo-router';
import { RecallSheet } from '../screens/RecallSheet';
// inside OverlayHost:
const router = useRouter();
// JSX, after the add sheet:
{sheet === 'recall' && <RecallSheet onDetails={() => router.navigate('/(tabs)/recalls')} />}
```

- [ ] **Step 5: Run** `npm test -- RecallSheet && npm run typecheck` → PASS.

- [ ] **Step 6: Verify on the emulator** — tap the alert row → screenshot `t20-recall.png` vs `sheet-recall.png`. Tap Schedule Repair.
Expected: sheet with the four hairline rows, a wide blue metal "Schedule Repair" (54 tall, radius 16) beside an outlined "Details"; after scheduling: toast, the Model S card loses its glow and reads "No recalls / Monitored" with a grey "Open" pill, the alert list becomes "Nothing outstanding across your fleet.", the fleet line reads "3 VEHICLES · ALL CLEAR"; reopening from a card is no longer possible (no open recall), which matches the design.

- [ ] **Step 7: Checkpoint** — "feat: recall sheet"

---

### Task 21: Splash stub

**Files:**
- Create: `src/screens/SplashStub.tsx`
- Modify: `src/overlays/OverlayHost.tsx` (add `{splash && <SplashStub onDone={dismissSplash} />}` as the LAST child, above Toast)
- Test: `src/screens/__tests__/SplashStub.test.tsx`

**Interfaces:**
- Produces: `SplashStub({ onDone: () => void })` — the same prop contract as the real `Splash` (slice 6), so it can be swapped in place.

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { SplashStub } from '../SplashStub';

it('shows the mark and calls onDone on tap', () => {
  const onDone = jest.fn();
  const { getByText, getByLabelText } = render(<SplashStub onDone={onDone} />);
  expect(getByText('RECALL HUB')).toBeTruthy();
  expect(getByText('TAP ANYWHERE TO CONTINUE')).toBeTruthy();
  fireEvent.press(getByLabelText('Continue'));
  expect(onDone).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run** `npm test -- SplashStub` → FAIL.

- [ ] **Step 3: Write `src/screens/SplashStub.tsx`**

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, dur } from '../theme/tokens';
import { Icon } from '../ui/Icon';
import { Mono } from '../ui/Txt';

const BEZEL = require('../assets/images/metal-blue.png');
const TILE = 54;
const SPIN = TILE * 2.4;

export function SplashStub({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const rot = useSharedValue(0);
  useEffect(() => { rot.value = withRepeat(withTiming(360, { duration: dur.metalIdle, easing: Easing.linear }), -1, false); }, [rot]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  return (
    <Pressable accessibilityLabel="Continue" onPress={onDone} style={[StyleSheet.absoluteFill, { backgroundColor: color.splash, alignItems: 'center', justifyContent: 'center' }]}>
      <View style={{ alignItems: 'center', gap: 14 }}>
        <View style={{ width: TILE, height: TILE, borderRadius: 16, overflow: 'hidden', boxShadow: '0 14px 34px rgba(0,0,0,0.6)' }}>
          <Animated.Image source={BEZEL} style={[{ position: 'absolute', left: TILE / 2 - SPIN / 2, top: TILE / 2 - SPIN / 2, width: SPIN, height: SPIN }, spin]} />
          <View style={{ position: 'absolute', left: 2, right: 2, top: 2, bottom: 2, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
            <LinearGradient colors={['#202020', '#000000']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
            <Icon name="shield-check-fill" size={24} color="#EAF7FF" />
          </View>
        </View>
        <Mono size={10} ls={2.4} color="rgba(255,255,255,0.7)">RECALL HUB</Mono>
      </View>
      <Mono size={10} ls={1.6} color="rgba(255,255,255,0.5)" style={{ position: 'absolute', bottom: 40 + insets.bottom }}>TAP ANYWHERE TO CONTINUE</Mono>
    </Pressable>
  );
}
```

- [ ] **Step 4: Mount it** — in `OverlayHost.tsx` add `const splash = useAppStore((s) => s.splash); const dismissSplash = useAppStore((s) => s.dismissSplash);` and, after `<Toast />`, `{splash && <SplashStub onDone={dismissSplash} />}`. The final OverlayHost JSX order is: add sheet, recall sheet, VIN help, Toast, SplashStub.

- [ ] **Step 5: Run the whole suite** — `npm test && npm run typecheck` → all PASS.

- [ ] **Step 6: Verify on the emulator** — cold reload: a near-black screen with a small spinning chrome tile, "RECALL HUB", and "TAP ANYWHERE TO CONTINUE"; tapping reveals the Garage.

- [ ] **Step 7: Checkpoint** — "feat: splash stub with the real onDone contract"

---

### Task 22: Emulator verification pass, blur tuning, `verification.md`

**Files:**
- Create: `docs/reference/verification.md`, `docs/reference/emu-*.png`
- Modify: `src/theme/tokens.ts` (final `blur` values only)

**Interfaces:**
- Consumes: every reference PNG from Task 3 and every screen from Tasks 13–21.
- Produces: the fidelity record the spec's acceptance criteria point at. No new code.

- [ ] **Step 1: Capture the emulator at every reference state**

With the app running on `s24proxy`, drive it by hand (or `adb shell input tap x y`) to each state and capture with `"$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" exec-out screencap -p > docs/reference/emu-<name>.png` for: `garage-idle`, `garage-card2`, `stats-model-s`, `stats-taycan`, `sheet-add-empty`, `sheet-add-sample`, `vin-help`, `sheet-recall`, `garage-added-toast`, `tab-recalls`, `tab-profile`, plus `splash-stub`.

- [ ] **Step 2: Compare each pair with the Read tool, side by side**

Check, per screen, in this order: spacing and alignment → type size/weight/tracking → colours → state-dependent content → motion (by eye on the emulator). Record every difference. Fix anything that is a mistake; record anything that is a platform limit.

- [ ] **Step 3: Tune the blur intensities**

Compare the Model S card face in `emu-garage-idle.png` against `garage-idle.png`: the glow behind the frosted face should look equally soft. Adjust `blur.face` in `src/theme/tokens.ts` (try 30 → 40 → 55) and reload until they match; do the same for `blur.scrim` against `sheet-add-empty.png` (the garage behind the sheet should be *barely* softened). Write the final numbers into `tokens.ts` and note them in `verification.md`.

- [ ] **Step 4: Write `docs/reference/verification.md`**

```markdown
# Slice 1 verification — Garage tab on Android emulator (s24proxy, Pixel 8 / API 35)

Date: <fill with today's date>
Reference: docs/reference/<name>.png (design, 430×932 @2x)   Emulator: docs/reference/emu-<name>.png (411 dp @2.625x)

| Screen | Reference | Emulator | Status | Notes |
|---|---|---|---|---|
| Garage idle | garage-idle.png | emu-garage-idle.png | match / diff | |
| Garage card 2 | garage-card2.png | emu-garage-card2.png | | |
| Stats — Model S | stats-model-s.png | emu-stats-model-s.png | | |
| Stats — Taycan | stats-taycan.png | emu-stats-taycan.png | | |
| Add sheet empty | sheet-add-empty.png | emu-sheet-add-empty.png | | |
| Add sheet sample | sheet-add-sample.png | emu-sheet-add-sample.png | | |
| VIN help | vin-help.png | emu-vin-help.png | | |
| Recall sheet | sheet-recall.png | emu-sheet-recall.png | | |
| Added + toast | garage-added-toast.png | emu-garage-added-toast.png | | |
| Tab bar — recalls | tab-recalls.png (bar only) | emu-tab-recalls.png | | stub body is by design |
| Tab bar — profile | tab-profile.png (bar only) | emu-tab-profile.png | | stub body is by design |
| Splash stub | — | emu-splash-stub.png | n/a | stub, replaced in slice 6 |

## Known, accepted differences (from the spec §9)
- Rail flick deceleration is the platform's, not the source's 420 ms ease-out cubic. Centring, neighbour dimming and infinite wrap match.
- Metal button has no hover speed on touch; idle 7 s and pressed 2.33 s only.
- Glow blob baked once at 210/16 px and scaled to 190 for the vehicle card (source blur 14).
- Blur intensities: face = <final>, scrim = <final> (expo-blur has no px→intensity formula; tuned by eye against the references).

## Differences found and fixed during this pass
- <one line each, or "none">

## Differences found and NOT fixed (need a decision)
- <one line each, or "none">
```

Fill every `<…>` before finishing; leave no placeholders in the committed file.

- [ ] **Step 5: Run the full suite one more time** — `npm test && npm run typecheck` → PASS.

- [ ] **Step 6: Checkpoint** — "docs: slice 1 emulator verification record; final blur tokens"

---

### Task 23: On-device pass on the S24 Ultra

**Files:**
- Modify: `docs/reference/verification.md` (append the on-device section)

**Interfaces:**
- Consumes: the finished app. Produces: the user's sign-off, recorded.

- [ ] **Step 1: Put the phone on the same Wi-Fi as this PC** (or connect USB with USB debugging on and run `adb devices` to confirm it is listed).

- [ ] **Step 2: Start Metro for a physical device**

Run: `npx expo start` — for Wi-Fi scan the QR code with Expo Go on the S24 Ultra; for USB, `npx expo start --android` with only the phone connected (stop the emulator first so `adb` targets the phone). If the phone cannot reach Metro over Wi-Fi, use `npx expo start --tunnel`.

- [ ] **Step 3: Walk the golden path on the device with the user watching**

Splash stub → tap → Garage → swipe the rail both ways past the ends → tap a neighbour card (centres) → tap the active card (stats; gauge sweeps) → back → Add Vehicle → Use sample VIN → info → VIN help → Enter manually → Add to garage (rail scrolls to the F-150, toast) → alert row → Schedule Repair (toast, card clears) → each tab (hump slides, icons cross-fade).

- [ ] **Step 4: Append to `verification.md`**

```markdown
## On-device — Samsung S24 Ultra
Date: <date>   Expo Go version: <from the app's About screen>   Display mode: <FHD+ / QHD+ from Settings ▸ Display>
- 120 Hz: hump slide, card dimming, gauge sweep, metal spin — smooth / janky (note which)
- Glass: card face blur visible over the glow — yes / no
- Keyboard: add sheet stays above the keyboard — yes / no
- Gesture inset: tab bar sits above the nav bar with white beneath — yes / no
- Anything that differs from the emulator: <list or none>
User sign-off: <name / date>
```

- [ ] **Step 5: Checkpoint** — "docs: on-device verification on S24 Ultra"

---

## Self-review notes (already applied)

- **Spec coverage:** §3 sizing → Tasks 13, 16 (`railPadding`, insets); §4 architecture → Tasks 10, 13, 14, 17; §5 store/fixtures/derivations → Tasks 6–9; §6 tokens → Task 5; §7 primitives → Tasks 10–15; §8 screens → Tasks 16–21; §9 effects → Tasks 4, 11, 12, 14 and the flags in Task 22; §10 assets/fonts/icons → Tasks 4, 10; §11 dependencies → Task 1; §12 verification → Tasks 2, 3, 22, 23; §13 risks → called out in Tasks 11 (shadow clipping) and 22 (blur tuning); §14 acceptance → Task 22 table + Task 23.
- **Type consistency:** `Icon.name` is `IconName | string`, so fixtures typed as `string` compose; `MetalButton.width` is `number | 'auto'` everywhere it is passed (`'auto'` in Tasks 17 and 20); `Stats.service[].pct` is a number, rendered as `${pct}%` in Task 17 and asserted as `80/43/63` in Task 7; `GlowCard.faceStyle` replaces the spec's `facePadding` wording — same intent, one prop.
- **Order of overlays** in `OverlayHost` after Task 21: add sheet → recall sheet → VIN help → Toast → SplashStub, matching z-indices 20 / 20 / 27 / 30 / 60.
