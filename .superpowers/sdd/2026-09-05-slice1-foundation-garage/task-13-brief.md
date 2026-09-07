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

