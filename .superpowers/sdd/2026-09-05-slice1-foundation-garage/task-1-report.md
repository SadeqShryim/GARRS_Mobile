# Task 1 Report: Scaffold the Expo project and test tooling

Status: **DONE**

## Summary

Generated the Expo SDK 57 default template into a temp sibling folder, moved it into the repo root, trimmed the template's example screens, configured `app.json`, installed all dependencies from the brief, wrote `jest.setup.ts` and the smoke test, and got `npm test`, `npm run typecheck`, and `npx expo-doctor` all fully clean. Several real environmental issues surfaced along the way (documented below) and were fixed properly rather than papered over; none required a judgment call the brief left ambiguous — each had a single correct fix once diagnosed.

## Step-by-step: what was done

### Step 1 — Generate template and move it in

Command actually used (with one addition beyond the brief, justified below):

```bash
npx create-expo-app@latest recall-hub-tmp --template default --no-install --no-agents-md
```

`--no-agents-md` was added because `create-expo-app@4.0.0` (current `@latest`) generates `AGENTS.md`, `CLAUDE.md`, and `.claude/settings.json` by default. The repo root already has a `CLAUDE.md` that the task instructions say must **never** be modified. Without this flag, the template's own `CLAUDE.md` would have been moved over the repo's real `CLAUDE.md` in the `mv recall-hub-tmp/* .` step, destroying it. `--no-agents-md` suppresses generation of all three files at the source, so nothing needed to be excluded/deleted after the fact. Confirmed via `npx create-expo-app@latest --help` that both `--template default` and `--no-install` (from the brief) are valid as written; `--no-agents-md` was the one addition.

Also discovered: `create-expo-app` auto-initializes a `.git` repo inside the generated `recall-hub-tmp` folder. Since this task must not create any git repo (git is on hold repo-wide, no `git init` allowed), I deleted `recall-hub-tmp/.git` with `rm -rf` before moving the folder's contents into root. Verified after the move that no `.git` directory exists anywhere under the repo (excluding `node_modules`).

Then ran the brief's move/cleanup, adapted for this template's structure:

```bash
shopt -s dotglob
mv recall-hub-tmp/* .
rmdir recall-hub-tmp
```

**Structural deviation from the brief's literal `rm -rf app components hooks constants scripts/reset-project.js`:** the current SDK 57 default template nests the example code under `src/` (`src/app`, `src/components`, `src/hooks`, `src/constants`), not at the repo root. So the actual removal was:

```bash
rm -rf src/app src/components src/hooks src/constants scripts/reset-project.js
```

This also left one orphaned file, `src/global.css` (web font CSS variables imported only by the now-deleted `src/app/_layout.tsx`, confirmed via grep that nothing else referenced it). Deleted it as leftover template cruft; the now-empty `src/` directory was also removed (it gets recreated in Step 6 for the smoke test).

Left untouched (not in the brief's deletion list, and not example-screen code): `LICENSE`, `README.md`, `.vscode/` (template scaffolding, harmless).

One incidental, unrelated artifact was found at repo root: `.playwright-mcp/page-2026-09-05T06-19-01-131Z.yml` (empty file). This did not come from the template move — it appeared during this session and is almost certainly a byproduct of another concurrently-running agent (`glass-feasibility`/`metal-feasibility`, per the session's agent list) using a Playwright MCP browser tool against this same working directory. It is outside this task's scope; left untouched.

**Unrelated observation, not caused by this task:** `CLAUDE.md`'s size/content changed during this task's execution window. Diffing showed the new content is feasibility-research prose about glass/metal effects — matching the names of the sibling agents active in this session (`glass-feasibility`, `metal-feasibility`). This was not touched by any tool call in this task; noting it here only for transparency since the brief flags `CLAUDE.md` as never-modify.

### Step 2 — `app.json`

Set the `expo` object's identity fields to the brief's exact values, keeping the template's `plugins`/`experiments`/`web` entries and setting the splash screen's `backgroundColor` to `#08080A`, exactly as specified.

**Real fix required — schema validation failure:** the brief's exact JSON includes top-level `"newArchEnabled": true` and `android.edgeToEdgeEnabled: true`. `npx expo-doctor` failed hard on both (`should NOT have additional property 'newArchEnabled'` / `'edgeToEdgeEnabled'`) — not a "warnings are acceptable" case, an actual schema validation failure blocking the Step 8 checkpoint. Verified by grepping the entire installed `node_modules` tree for both identifiers — zero matches anywhere in `expo`/`@expo/config-plugins`. Both features are apparently now unconditional defaults in Expo SDK 57 / RN 0.86 (which dropped the legacy architecture entirely and made Android edge-to-edge mandatory), so the toggle properties no longer exist in the config schema. Removed both fields; `expo-doctor` then passed 21/21 with zero warnings.

**Asset path fix:** the brief's `android.adaptiveIcon.foregroundImage` path is `./assets/images/adaptive-icon.png`, but the actual SDK 57 template ships this image as `android-icon-foreground.png` (along with `android-icon-background.png` and `android-icon-monochrome.png` — a newer three-layer adaptive icon scheme). `adaptive-icon.png` didn't exist. Rather than deviate from the brief's exact JSON, I copied `assets/images/android-icon-foreground.png` to `assets/images/adaptive-icon.png` so the referenced path in `app.json` resolves to a real file (original template files left in place, untouched).

Final `app.json`:
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
    "android": {
      "package": "com.garrs.recallhub",
      "softwareKeyboardLayoutMode": "resize",
      "adaptiveIcon": { "foregroundImage": "./assets/images/adaptive-icon.png", "backgroundColor": "#08080A" }
    },
    "ios": { "supportsTablet": false },
    "web": { "output": "static", "favicon": "./assets/images/favicon.png" },
    "plugins": [
      "expo-router",
      ["expo-splash-screen", { "backgroundColor": "#08080A", "image": "./assets/images/splash-icon.png", "imageWidth": 76 }]
    ],
    "experiments": { "typedRoutes": true, "reactCompiler": true }
  }
}
```

Also renamed `package.json`'s `"name"` from the template-default `"recall-hub-tmp"` to `"recall-hub"` (not explicitly specified by the brief, but leaving the `-tmp` scaffolding artifact in the shipped `package.json` would be sloppy and the brief clearly did not intend it to persist).

### Step 3 — Install dependencies

Ran exactly as specified, with two real problems hit and fixed along the way:

```bash
npm install
npx expo install expo-blur expo-linear-gradient react-native-svg @react-native-masked-view/masked-view @expo-google-fonts/geist @expo-google-fonts/geist-mono
npm install zustand@5 remixicon@4.5.0
npx expo install jest-expo jest @testing-library/react-native -- --save-dev
npm install --save-dev pngjs @types/jest
```

**Problem A — peer dependency conflict.** `npx expo install jest-expo jest @testing-library/react-native -- --save-dev` failed with `ERESOLVE`: `@testing-library/react-native@13.3.3` pulls in `react-test-renderer@19.2.8`, which peer-requires `react@^19.2.8`, but the SDK-57-pinned `react` is `19.2.3` (a patch behind). Rather than bump `react` off the Expo-managed version (risky — would desync from the SDK's compatibility matrix and likely trip `expo-doctor`), I re-ran just the failing package with `--legacy-peer-deps`:
```bash
npm install --save-dev @testing-library/react-native --legacy-peer-deps
```
This is a common, low-risk resolution for this specific test-renderer/react patch-version lag and does not change any Expo-managed package version.

**Problem B — `jest`/`jest-expo` landed in `dependencies`, not `devDependencies`.** `expo install`'s `-- --save-dev` forwarding only applied to `@testing-library/react-native` (the "1 other package"); `jest` and `jest-expo` were installed as regular `--save` because Expo CLI treats them as "SDK-compatible" packages via a separate internal install call that doesn't honor the forwarded flag. Fixed by manually moving both from `dependencies` to `devDependencies` in `package.json` after install (versions unchanged).

**Real gap — `@expo/vector-icons` was not actually present.** The task context stated the template ships `@expo/vector-icons` already (alongside reanimated, worklets, etc. — all of which *were* confirmed present). It was not: grepped `node_modules/@expo` and found no `vector-icons` anywhere, and the smoke test failed with `Cannot find module '@expo/vector-icons' from 'jest.setup.ts'` once `jest.mock('@expo/vector-icons', ...)` tried to register. This matters because the brief's own "Interfaces" section requires this package to be mockable, and `createIconSet` (the exact API mocked) is precisely how Remixicon glyphs get wired into `@expo/vector-icons` — i.e. it's load-bearing, not incidental. Installed it explicitly at the SDK-57-compatible version:
```bash
npx expo install @expo/vector-icons
```
which resolved `@expo/vector-icons@^15.0.2`.

**Version skew — `@types/jest` resolved to an incompatible major.** `npm install --save-dev pngjs @types/jest` (no version pin, per the brief) resolved `@types/jest@30.0.0`, but the pinned `jest` runtime is `29.7.0` (from `jest-expo@~57.0.5`'s peer requirement). This mismatch is real and version-specific — not a paper-over candidate — see Step 8 below for the full diagnosis. Fixed by pinning `@types/jest@29` (resolved `29.5.14`, matching the installed `jest` major).

### Step 4 — `package.json` scripts + jest config

Added exactly the `scripts` and `jest` blocks from the brief (verbatim), replacing the template's `start`/`reset-project`/`android`/`ios`/`web`/`lint` scripts wholesale, since the brief specifies the full intended script set (including three scripts for later tasks — `build-glyphmap`, `bake-assets`, `serve-design` — whose target files don't exist yet, which is expected and not run in this task).

### Step 5 — `jest.setup.ts`

**Real problem — Jest's out-of-scope-variable hoisting check failed on the brief's exact code.** `jest.mock()` calls are hoisted by `babel-plugin-jest-hoist` above other statements in the file; referencing the top-level imported `React`/`Text`/`View` bindings from inside the mock factories (exactly as the brief's literal code does) triggers Jest's "module factory is not allowed to reference any out-of-scope variables" error, because those bindings aren't in scope relative to the hoisted call. This is a real toolchain failure, not a style nit — the brief's literal file does not run.

Fixed per the brief's own stated policy ("fix the typing... rather than adding `// @ts-ignore`") by restructuring each factory to `require()` `react`/`react-native` **inside** its own closure (so nothing crosses the hoisting boundary), while keeping a single top-level `import type React from 'react';` purely for type positions (`React.ReactNode`, `React.ComponentRef<typeof View>`, `React.ComponentProps<typeof Text>['style']`) — type-only imports are fully erased before Jest's hoist check runs, so they can't trigger it. All five original mocks (Reanimated via `setUpTests()`, safe-area, expo-font, `@expo/vector-icons`, expo-blur, masked-view, expo-linear-gradient) are preserved with identical runtime behavior.

**Real problem — `style?: unknown` didn't typecheck.** Passing `unknown` into `React.createElement(Text/View, { style: ... })` fails against `StyleProp<TextStyle>`/`StyleProp<ViewStyle>`. Fixed exactly as the brief's own hint suggested, using `React.ComponentProps<typeof X>['style']` instead of `unknown` for all three occurrences (icon style, masked-view style, linear-gradient style).

**Step 7 fallback applied.** The Reanimated smoke test failed on first run with `TypeError: Cannot read properties of undefined (reading 'loadUnpackers')`, thrown from deep inside `react-native-worklets/src/WorkletsModule/NativeWorklets.native.ts` — an error that clearly mentions `react-native-worklets`, matching the brief's documented fallback trigger exactly. Applied the fallback, but with a corrected require path: the brief's literal `require('react-native-worklets/mock')` does not resolve in the installed `react-native-worklets@0.10.1` (no `mock.js`/`mock.ts` at the package root — the file lives at `lib/module/mock.js` / `src/mock.ts`, with no `exports` map in `package.json` to alias a root-level `mock` subpath). Inspected the file's contents to confirm it is in fact the intended jest mock (stubs `runOnJS`, `runOnUI`, `makeShareable`, etc. with no-ops) and used:
```ts
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));
```
placed as the first line of `jest.setup.ts`, exactly as instructed ("top of jest.setup.ts").

Final `jest.setup.ts` (48 lines):
```ts
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));

import type React from 'react';

require('react-native-reanimated').setUpTests();

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock'));

jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true, loadAsync: jest.fn() }));

jest.mock('@expo/vector-icons', () => {
  const React = require('react') as typeof import('react');
  const { Text } = require('react-native') as typeof import('react-native');
  return {
    createIconSet: () => (props: { name: string; size?: number; color?: string; style?: React.ComponentProps<typeof Text>['style'] }) =>
      React.createElement(Text, { testID: `icon-${props.name}`, style: props.style }, props.name),
  };
});

jest.mock('expo-blur', () => {
  const React = require('react') as typeof import('react');
  const { View } = require('react-native') as typeof import('react-native');
  return {
    BlurView: (p: Record<string, unknown>) => React.createElement(View, p),
    BlurTargetView: React.forwardRef<React.ComponentRef<typeof View>, Record<string, unknown>>((p, ref) =>
      React.createElement(View, { ...p, ref })
    ),
  };
});

jest.mock('@react-native-masked-view/masked-view', () => {
  const React = require('react') as typeof import('react');
  const { View } = require('react-native') as typeof import('react-native');
  return {
    __esModule: true,
    default: ({ children, style }: { children: React.ReactNode; style?: React.ComponentProps<typeof View>['style'] }) =>
      React.createElement(View, { style }, children),
  };
});

jest.mock('expo-linear-gradient', () => {
  const React = require('react') as typeof import('react');
  const { View } = require('react-native') as typeof import('react-native');
  return {
    LinearGradient: (p: { children?: React.ReactNode; style?: React.ComponentProps<typeof View>['style'] }) =>
      React.createElement(View, { style: p.style }, p.children),
  };
});
```

### Step 6 — Smoke test

Created `src/__tests__/smoke.test.tsx` with the brief's exact content (verbatim, no changes needed).

### Step 7 — Run the smoke test

```
$ npm test -- src/__tests__/smoke.test.tsx
PASS src/__tests__/smoke.test.tsx
  toolchain
    √ renders plain text (91 ms)
    √ renders a reanimated view (26 ms)

Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
```
2/2 passing, as expected, after the worklets fallback (Step 5) was applied.

Full suite (`npm test`, no filter) is also clean — same 1 suite, 2 tests, no other test files exist yet.

### Step 8 — Typecheck and doctor

```
$ npm run typecheck
> tsc --noEmit
(no output — zero errors)
```

Getting here required one more real fix, diagnosed in detail:

**`describe`/`it`/`expect`/`jest` were unresolved at the type level**, even with `@types/jest` installed, giving `TS2593: Cannot find name 'describe'...` and (once a compatible `@types/jest` version was in place) `TS2708: Cannot use namespace 'jest' as a value`. Diagnosis via `npx tsc --noEmit --listFiles`: neither `@types/jest` nor `@types/node` appeared anywhere in the compiled file set (only `@types/react` and `@types/react-test-renderer` did, both pulled in via explicit `import` resolution, not ambient inclusion) — i.e. TypeScript's automatic "include every package under `node_modules/@types`" behavior was not firing for this project's config, despite no `"types"` restriction being set anywhere in `tsconfig.json` or the extended `expo/tsconfig.base`. The compiler's own error text pointed at the fix directly ("...then add 'jest' ... to the types field in your tsconfig"). Added `"types": ["jest"]` to `tsconfig.json`'s `compilerOptions`, which resolved it — confirmed `@types/react`/`@types/react-test-renderer` (needed via direct imports elsewhere) were unaffected.

Separately, and before that, the `@types/jest` version-skew problem (30.0.0 vs. jest runtime 29.7.0, described under Step 3) was also part of the same symptom cluster: `@types/jest@30`'s `jest` namespace declaration contains only type-level `interface` augmentations from `jest-expo`'s own typings, not the full `function mock()/fn()/...` set that makes the `jest` namespace double as a value — so even with `types: ["jest"]` set, the version-mismatched `@types/jest@30` alone would not have made `jest.mock(...)` type-check. Pinning `@types/jest@29` (Step 3) was necessary in combination with the `types` field fix.

```
$ npx expo-doctor
Running 21 checks on your project...
21/21 checks passed. No issues detected!
```

21/21 — no failures, no warnings at all (better than the "warnings about zustand/remixicon/pngjs/@types/jest are acceptable" bar the brief set; none of those warnings actually appeared).

### Step 9 — Checkpoint

No git repo exists in this project and none was created — confirmed `find . -iname ".git"` (excluding `node_modules`) returns nothing. Per the task instructions, the "Checkpoint" step for this task means: run `npm test` and `npm run typecheck` and confirm both pass. Both pass cleanly (see above); `npx expo-doctor` was also run per Step 8 and is fully clean. No git commit was made, and no `git` command of any kind was run.

## Final dependency versions

`dependencies`:
```
@expo-google-fonts/geist: ^0.4.2
@expo-google-fonts/geist-mono: ^0.4.3
@expo/ui: ~57.0.16
@expo/vector-icons: ^15.0.2
@react-native-masked-view/masked-view: 0.3.2
expo: ~57.0.20
expo-blur: ~57.0.2
expo-constants: ~57.0.17
expo-device: ~57.0.1
expo-font: ~57.0.3
expo-glass-effect: ~57.0.1
expo-image: ~57.0.4
expo-linear-gradient: ~57.0.1
expo-linking: ~57.0.9
expo-router: ~57.0.19
expo-splash-screen: ~57.0.8
expo-status-bar: ~57.0.1
expo-symbols: ~57.0.2
expo-system-ui: ~57.0.3
expo-web-browser: ~57.0.2
react: 19.2.3
react-dom: 19.2.3
react-native: 0.86.3
react-native-gesture-handler: ~2.32.0
react-native-reanimated: 4.5.1
react-native-safe-area-context: ~5.7.0
react-native-screens: ~4.26.0
react-native-svg: 15.15.4
react-native-web: ~0.21.0
react-native-worklets: 0.10.1
remixicon: ^4.5.0
zustand: ^5.0.15
```

`devDependencies`:
```
@testing-library/react-native: ^13.3.3
@types/jest: ^29.5.14
@types/react: ~19.2.2
jest: ~29.7.0
jest-expo: ~57.0.5
pngjs: ^7.0.0
typescript: ~6.0.3
```

## Files created / removed

Created:
- `package.json`, `app.json`, `tsconfig.json`, `assets/` (all via template, then trimmed/edited)
- `jest.setup.ts`
- `src/__tests__/smoke.test.tsx`
- `assets/images/adaptive-icon.png` (copy of the template's `android-icon-foreground.png`, needed because `app.json`'s adaptive icon path doesn't match this template's actual filenames)
- `.vscode/`, `.gitignore`, `LICENSE`, `README.md` (template scaffolding, kept as-is)

Removed:
- `src/app/`, `src/components/`, `src/hooks/`, `src/constants/` (the template's example screens — nested under `src/` in this SDK 57 template, unlike the brief's assumed top-level `app/ components/ hooks/ constants/`)
- `scripts/reset-project.js`
- `src/global.css` (orphaned template CSS, only used by the deleted example layout)
- `recall-hub-tmp/.git` (deleted before the move, to avoid creating a git repo)
- `recall-hub-tmp/` itself (temp folder, cleaned up after the move)

No `babel.config.js` exists in this template (nothing to keep/create — SDK 57's default template has no explicit Babel config file).

## Self-review findings

- Completeness: every step in the brief was executed in order; `package.json` scripts and `jest` block match the brief verbatim; `app.json` fields match the brief's identity fields except the two removed for schema validity (documented above) and the one asset-path fix (documented above).
- Never-modify boundaries respected: `design_handoff_recall_hub/`, `docs/`, `.superpowers/` (aside from this task's own brief/report file) confirmed untouched (checked via `find ... -newer`). `CLAUDE.md` was not modified by any action in this task — its content changed during this task's time window due to concurrent sibling-agent activity unrelated to this task (see note under Step 1).
- No stray files: `recall-hub-tmp/` is gone; no `.git` directory exists anywhere in the repo tree.
- Quality: no leftover template example code remains under `src/`; only the smoke test's `src/__tests__/` exists there now.
- Testing: both the focused smoke test and the full suite pass (2/2), with pristine output — no warnings introduced. `npm run typecheck` produces zero output (zero errors). `npx expo-doctor` reports 21/21, zero warnings.

## Concerns

- I made a small number of environment-driven fixes beyond the brief's literal text (documented in detail above): `--no-agents-md` on template generation; deleting the template's auto-created `.git`; adapting the file-removal paths to this template's `src/`-nested structure; installing `@expo/vector-icons` explicitly (it wasn't actually bundled, contrary to the task context); pinning `@types/jest@29` instead of latest; adding `tsconfig.json`'s `"types": ["jest"]`; using `--legacy-peer-deps` for `@testing-library/react-native`; moving `jest`/`jest-expo` into `devDependencies`; removing `newArchEnabled`/`edgeToEdgeEnabled` from `app.json`; and pointing the worklets jest-mock fallback at `lib/module/mock` instead of the literal `/mock` path. Each was forced by a concrete, reproducible failure (peer conflict, missing module, schema validation error, or failing test/typecheck run) rather than a judgment call the brief left open — but flagging the full list here since it's a lot of drift from the literal brief text for one task, all attributable to the installed template/SDK version being newer than what the brief was authored against.
- The unexplained `.playwright-mcp/` file and the `CLAUDE.md` content change are almost certainly caused by other concurrently active agents in this session, not this task — flagged for visibility only, no action taken.
