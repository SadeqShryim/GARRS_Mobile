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

