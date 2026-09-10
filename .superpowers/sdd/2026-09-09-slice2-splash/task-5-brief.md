# Task 5 brief — Slice 2 (Splash)

Extracted verbatim from `docs/superpowers/plans/2026-09-09-slice2-splash.md`. The spec `docs/superpowers/specs/2026-09-09-slice2-splash-design.md` is the binding authority; the source of truth for every measurement is `design_handoff_recall_hub/design/Splash.dc.html` (measured DOM in `docs/reference/splash-geometry.json`).

## Rules for this task
- Work in `C:\GarrsMobile`. **Do not run git. Do not install packages. Do not download anything.**
- Transcribe the code in this brief exactly. Deviate only when something does not compile or pass, keep the deviation minimal, and state exactly what you changed and why in the report.
- Copy strings come from `src/fixtures/splash.ts` (`COPY`); never retype a string in a component.
- Only create/modify the files listed under **Files**. Other tasks may be editing other files at the same time; if the full-tree gate fails inside a file that is not yours, say so in the report and do not touch it.
- Gate: run your own suites first (`npm test -- <pattern>`), then the full `npm test && npm run typecheck` before reporting.
- Environment: Windows 11 x64, Node 24, npm 11, Expo SDK 57, RN 0.86, Reanimated 4.5, jest-expo 57, TypeScript 6 strict; `tsconfig` types = jest + node; use `StyleSheet.absoluteFill` (there is no `absoluteFillObject`). Skia and Instrument Serif are already installed.
- Report: write `.superpowers/sdd/2026-09-09-slice2-splash/task-5-report.md` with: **Status** (DONE / DONE_WITH_CONCERNS / BLOCKED), files created/modified, the test and typecheck output summary (numbers), deviations from the brief, deferred steps, concerns.

---

### Task 5: Glass pill, glass field, Google mark, REPLAY pill

**Files:**
- Create: `src/screens/splash/GlassPill.tsx`, `src/screens/splash/GlassField.tsx`, `src/screens/splash/GoogleMark.tsx`, `src/screens/splash/ReplayPill.tsx`, `src/screens/splash/__tests__/glass.test.tsx`

**Interfaces:**
- Produces: `GlassPill({ label, icon, onPress })`; `GlassField({ leading, paddingLeft: 16 | 12, value, onChangeText, placeholder, secure?, email?, onSubmit, arrow, arrowLabel: 'Continue' | 'Finish', testID? })`; `GoogleMark({ size = 19 })`; `ReplayPill({ onPress })`. Consumed by Tasks 6 and 10.
- Consumes: `cssAngleToPoints` (Slice 1), `Icon`, `Sans`, `Mono`, `COPY`, `font`.

- [ ] **Step 1: Write the failing test** `src/screens/splash/__tests__/glass.test.tsx`

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { GlassField } from '../GlassField';
import { GlassPill } from '../GlassPill';
import { GoogleMark } from '../GoogleMark';
import { ReplayPill } from '../ReplayPill';

describe('GlassPill', () => {
  it('shows the label with its icon and presses', () => {
    const onPress = jest.fn();
    const { getByText, getByLabelText } = render(<GlassPill label="Google" icon={<Text>G</Text>} onPress={onPress} />);
    expect(getByText('G')).toBeTruthy();
    fireEvent.press(getByLabelText('Google'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('GlassField', () => {
  const base = { leading: <Text>icon</Text>, paddingLeft: 16 as const, placeholder: 'Email', onChangeText: jest.fn(), value: '', onSubmit: jest.fn(), arrowLabel: 'Continue' as const };
  it('hides the arrow until told, submits from the arrow and from the keyboard', () => {
    const onSubmit = jest.fn();
    const { queryByLabelText, getByLabelText, getByPlaceholderText, rerender } = render(<GlassField {...base} onSubmit={onSubmit} arrow={false} />);
    expect(queryByLabelText('Continue')).toBeNull();
    fireEvent(getByPlaceholderText('Email'), 'submitEditing');
    expect(onSubmit).toHaveBeenCalledTimes(1);
    rerender(<GlassField {...base} onSubmit={onSubmit} arrow />);
    fireEvent.press(getByLabelText('Continue'));
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });
  it('is a secure, non-capitalising input when asked', () => {
    const { getByPlaceholderText } = render(<GlassField {...base} placeholder="Password" secure arrow={false} />);
    const input = getByPlaceholderText('Password');
    expect(input.props.secureTextEntry).toBe(true);
    expect(input.props.autoCapitalize).toBe('none');
    expect(input.props.placeholderTextColor).toBe('rgba(255,255,255,0.45)');
  });
  it('uses the email keyboard for the email field', () => {
    const { getByPlaceholderText } = render(<GlassField {...base} email arrow={false} />);
    expect(getByPlaceholderText('Email').props.keyboardType).toBe('email-address');
  });
});

it('GoogleMark renders the four-colour G', () => {
  const { toJSON } = render(<GoogleMark />);
  expect(JSON.stringify(toJSON())).toContain('#4285F4');
});

it('ReplayPill shows REPLAY with the restart icon and presses', () => {
  const onPress = jest.fn();
  const { getByText, getByTestId } = render(<ReplayPill onPress={onPress} />);
  expect(getByTestId('icon-restart-line')).toBeTruthy();
  fireEvent.press(getByText('REPLAY'));
  expect(onPress).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run** `npm test -- glass` → FAIL.

- [ ] **Step 3: Write `src/screens/splash/GlassPill.tsx`**

```tsx
// Splash.dc.html — the Google / Apple pills: h42, padding 0 18, r999, gap 8, glass fill, hover scale(.98) → pressed.
import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { cssAngleToPoints } from '../../lib/gradient';
import { dur } from '../../theme/tokens';
import { Sans } from '../../ui/Txt';

const FILL = ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.16)', 'rgba(255,255,255,0.05)'] as const;
const STOPS = [0, 0.45, 1] as const;
const SHADOW = 'inset 0 1px 1px rgba(255,255,255,0.30), inset 0 -1.5px 1.5px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.14), 0 8px 18px rgba(0,0,0,0.4)';

export function GlassPill({ label, icon, onPress }: { label: string; icon: ReactNode; onPress: () => void }) {
  const [box, setBox] = useState({ w: 110, h: 42 });
  const press = useSharedValue(0);
  const scale = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.02 * press.value }] }));
  const pts = cssAngleToPoints(-72, box.w, box.h);
  return (
    <Animated.View style={scale}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={() => { press.value = withTiming(1, { duration: dur.press }); }}
        onPressOut={() => { press.value = withTiming(0, { duration: dur.press }); }}
        onLayout={(e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        style={styles.pill}
      >
        <LinearGradient colors={FILL} locations={STOPS} start={pts.start} end={pts.end} style={StyleSheet.absoluteFill} />
        {icon}
        <Sans size={14} weight={600} color="#FFFFFF">{label}</Sans>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, paddingHorizontal: 18, borderRadius: 999, overflow: 'hidden', boxShadow: SHADOW },
});
```

- [ ] **Step 4: Write `src/screens/splash/GlassField.tsx`**

```tsx
// Splash.dc.html — the email / password / confirm fields: h52, r999, gap 8, padding 0 6 0 (16 | 12), glass fill,
// a 40×40 glass arrow on the right when the step's condition holds.
import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { cssAngleToPoints } from '../../lib/gradient';
import { font } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';

const FILL = ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.14)', 'rgba(255,255,255,0.04)'] as const;
const ARROW_FILL = ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.24)', 'rgba(255,255,255,0.08)'] as const;
const STOPS = [0, 0.45, 1] as const;
const SHADOW = 'inset 0 1.5px 1px rgba(255,255,255,0.26), inset 0 -1.5px 1.5px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.13), 0 10px 24px rgba(0,0,0,0.4)';
const ARROW_SHADOW = 'inset 0 1px 1px rgba(255,255,255,0.4), inset 0 0 0 1px rgba(255,255,255,0.18)';
const ARROW_PTS = cssAngleToPoints(-72, 40, 40);

export type GlassFieldProps = {
  leading: ReactNode;
  paddingLeft: 16 | 12;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  secure?: boolean;
  email?: boolean;
  onSubmit: () => void;
  arrow: boolean;
  arrowLabel: 'Continue' | 'Finish';
  testID?: string;
};

export function GlassField({ leading, paddingLeft, value, onChangeText, placeholder, secure, email, onSubmit, arrow, arrowLabel, testID }: GlassFieldProps) {
  const [box, setBox] = useState({ w: 320, h: 52 });
  const pts = cssAngleToPoints(-72, box.w, box.h);
  return (
    <View onLayout={(e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} style={[styles.field, { paddingLeft }]}>
      <LinearGradient colors={FILL} locations={STOPS} start={pts.start} end={pts.end} style={StyleSheet.absoluteFill} />
      {leading}
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.45)"
        secureTextEntry={secure}
        keyboardType={email ? 'email-address' : 'default'}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType={arrowLabel === 'Finish' ? 'done' : 'next'}
        submitBehavior="submit"
        onSubmitEditing={onSubmit}
        allowFontScaling={false}
        style={styles.input}
      />
      {arrow && (
        <Pressable accessibilityRole="button" accessibilityLabel={arrowLabel} onPress={onSubmit} style={styles.arrow}>
          <LinearGradient colors={ARROW_FILL} locations={STOPS} start={ARROW_PTS.start} end={ARROW_PTS.end} style={StyleSheet.absoluteFill} />
          <Icon name="arrow-right-line" size={18} color="#FFFFFF" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 52, paddingRight: 6, borderRadius: 999, overflow: 'hidden', boxShadow: SHADOW },
  input: { flex: 1, minWidth: 0, height: '100%', fontFamily: font.sans400, fontSize: 15, color: '#FFFFFF', padding: 0, includeFontPadding: false },
  arrow: { width: 40, height: 40, borderRadius: 999, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', boxShadow: ARROW_SHADOW },
});
```

- [ ] **Step 5: Write `src/screens/splash/GoogleMark.tsx`**

```tsx
// Splash.dc.html — the inline Google "G" (paths verbatim), 19 × 19 in the pill.
import Svg, { G, Path } from 'react-native-svg';

export function GoogleMark({ size = 19 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G transform="translate(3,2)">
        <Path fill="#4285F4" d="M57.81 30.15c0-2.43-.2-4.2-.62-6.03H29.5v10.95h16.25c-.33 2.72-2.1 6.81-6.03 9.56l-.06.37 8.76 6.78.6.06c5.58-5.15 8.79-12.72 8.79-21.69" />
        <Path fill="#34A853" d="M29.5 58.99c7.96 0 14.65-2.62 19.53-7.14l-9.31-7.21c-2.49 1.74-5.83 2.95-10.22 2.95-7.8 0-14.42-5.15-16.78-12.26l-.35.03-9.1 7.05-.12.33c4.85 9.63 14.81 16.25 26.35 16.25" />
        <Path fill="#FBBC05" d="M12.72 35.33a17.9 17.9 0 0 1-.99-5.83c0-2.03.36-4 .95-5.84l-.02-.39-9.22-7.16-.3.14A29.4 29.4 0 0 0 0 29.5c0 4.75 1.15 9.24 3.15 13.24l9.57-7.41" />
        <Path fill="#EB4335" d="M29.5 11.41c5.53 0 9.27 2.39 11.4 4.39l8.32-8.13C44.11 2.92 37.46 0 29.5 0 17.96 0 8 6.62 3.15 16.26l9.54 7.4C15.08 16.55 21.7 11.41 29.5 11.41" />
      </G>
    </Svg>
  );
}
```

- [ ] **Step 6: Write `src/screens/splash/ReplayPill.tsx`**

```tsx
// Splash.dc.html — REPLAY: top 14 right 14, h28 + 1px border (30 total), padding 0 11, r999, white .10 fill, white .16 border,
// restart-line 12 + mono 9 / 1.4, both white .8. z-index 6 (above everything). Its backdrop blur(6px) is omitted (spec §9).
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COPY } from '../../fixtures/splash';
import { Icon } from '../../ui/Icon';
import { Mono } from '../../ui/Txt';

export function ReplayPill({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Replay" onPress={onPress} style={[styles.pill, { top: 14 + insets.top }]}>
      <Icon name="restart-line" size={12} color="rgba(255,255,255,0.8)" />
      <Mono size={9} ls={1.4} color="rgba(255,255,255,0.8)">{COPY.replay}</Mono>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute', right: 14, zIndex: 6, flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 11,
    borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
  },
});
```

- [ ] **Step 7: Run** `npm test -- glass && npm run typecheck` → PASS. If `submitBehavior` is rejected by the installed RN types, use `blurOnSubmit={false}` instead and note it in the report.

- [ ] **Step 8: Checkpoint** — "feat: splash glass pill/field, Google mark, REPLAY pill"

