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

