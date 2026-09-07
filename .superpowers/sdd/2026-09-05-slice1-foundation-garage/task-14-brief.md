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

