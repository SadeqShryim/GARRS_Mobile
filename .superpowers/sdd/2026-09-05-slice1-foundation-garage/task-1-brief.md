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

