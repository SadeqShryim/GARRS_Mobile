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

