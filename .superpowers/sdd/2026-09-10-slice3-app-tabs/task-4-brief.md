# Task 4 brief — Slice 3 (app tabs)

Extracted verbatim from `docs/superpowers/plans/2026-09-10-slice3-app-tabs.md`. The spec `docs/superpowers/specs/2026-09-10-slice3-app-tabs-design.md` (§7) is the binding authority; the source of truth is `design_handoff_recall_hub/design/GaragePrototype.dc.html`.

## Rules for this task
- Work in `C:\GarrsMobile`. **Do not run git. Do not install packages. Do not download anything.**
- Transcribe the code in this brief exactly. Deviate only when something does not compile or pass, keep the deviation minimal, and state exactly what you changed and why in the report.
- Only create/modify the files listed under **Files**. Other tasks may be editing other files at the same time; if the full-tree gate fails inside a file that is not yours, say so in the report and do not touch it.
- Gate: run your own suites first (`npm test -- ui` and `npm test -- Garage`), then the full `npm test && npm run typecheck` before reporting.
- Environment: Windows 11 x64, Node 24, Expo SDK 57, RN 0.86, Reanimated 4.5, jest-expo 57, TypeScript 6 strict; use `StyleSheet.absoluteFill` (no `absoluteFillObject`). Task 1 already added `color.*`, `dur.*`, `layout.shineBaked` tokens and the `shine-plus.png` / `shine-caution.png` assets. Every `Text` goes through `Sans` / `Mono` from `src/ui/Txt.tsx`; icons are `<Icon name="…">`.
- Report: write `.superpowers/sdd/2026-09-10-slice3-app-tabs/task-4-report.md` with: **Status** (DONE / DONE_WITH_CONCERNS / BLOCKED), files created/modified, the test and typecheck output summary (numbers), deviations, deferred steps, concerns.

---

### Task 4: Primitives — StatusChip, Toggle, ShineBorder, SheetShell, InfiniteRail (+ garage Rail refactor)

**Files:**
- Create: `src/ui/StatusChip.tsx`, `src/ui/Toggle.tsx`, `src/ui/ShineBorder.tsx`, `src/ui/InfiniteRail.tsx`, `src/ui/__tests__/slice3-primitives.test.tsx`
- Modify: `src/ui/Sheet.tsx` (add `SheetShell`; `Sheet` composes it — its rendered output is unchanged), `src/screens/garage/Rail.tsx` (delegate to `InfiniteRail`; behaviour unchanged)

**Interfaces (consumed by Tasks 6–11):**
- `StatusChip { bg, fg, icon?, label, size?, ls?, padX?, padY?, testID? }`
- `Toggle { on, label, onPress, testID? }` — `accessibilityRole="switch"`
- `ShineBorder { ramp: 'plus' | 'caution', radius, style?, children, testID? }` — the rotating image has `testID="shine"`
- `SheetShell { onClose, handleMargin?, paddingBottom?, gap?, children, testID? }`
- `InfiniteRail` (forwardRef) `{ count, index, onIndexChange, renderItem(i, active, slot), keyFor(i), extraData?, testID? }`; handle `{ scrollTo(i, animated), advance() }`

- [ ] **Step 1: `src/ui/StatusChip.tsx`** (chip at lines 133, 240, 977)

```tsx
import { View } from 'react-native';
import { Icon } from './Icon';
import { Mono } from './Txt';

export function StatusChip({ bg, fg, icon, label, size = 9, ls = 1.4, padX = 10, padY = 5, testID }:
  { bg: string; fg: string; icon?: string; label: string; size?: number; ls?: number; padX?: number; padY?: number; testID?: string }) {
  return (
    <View testID={testID} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: bg, paddingVertical: padY, paddingHorizontal: padX }}>
      {icon ? <Icon name={icon} size={12} color={fg} /> : null}
      <Mono size={size} ls={ls} color={fg}>{label}</Mono>
    </View>
  );
}
```

- [ ] **Step 2: `src/ui/Toggle.tsx`** (lines 578–583; `sw()` line 1680)

```tsx
import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { bez, color, dur, ease } from '../theme/tokens';
import { Sans } from './Txt';

// Track: background .22s ease (#dcdbd8 → #0F638F). Knob: translate3d(18px) .22s cubic-bezier(.4,0,.2,1).
export function Toggle({ on, label, onPress, testID }: { on: boolean; label: string; onPress: () => void; testID?: string }) {
  const track = useSharedValue(on ? 1 : 0);
  const knob = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    track.value = withTiming(on ? 1 : 0, { duration: dur.toggle, easing: bez(ease.css) });
    knob.value = withTiming(on ? 1 : 0, { duration: dur.toggle, easing: bez(ease.press) });
  }, [on, track, knob]);
  const trackStyle = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(track.value, [0, 1], [color.handle, color.blueDeep]) }));
  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: 18 * knob.value }] }));
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={label} onPress={onPress} testID={testID}
      style={{ minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
      <Sans size={14} color={color.ink2}>{label}</Sans>
      <Animated.View style={[{ width: 44, height: 26, borderRadius: 13, padding: 3 }, trackStyle]}>
        <Animated.View style={[{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.22)' }, knobStyle]} />
      </Animated.View>
    </Pressable>
  );
}
```

- [ ] **Step 3: `src/ui/ShineBorder.tsx`** (lines 762–766, 375–379; `shine-spin 4s linear infinite`)

```tsx
import { type ReactNode, useEffect, useState } from 'react';
import { type LayoutChangeEvent, View, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { dur } from '../theme/tokens';

const RAMP = {
  plus: require('../assets/images/shine-plus.png'),
  caution: require('../assets/images/shine-caution.png'),
};

// A conic-gradient square (inset:-100% in the source) rotating behind the caller's inner card, clipped by the outer radius.
// The square's side is the card's diagonal so every corner stays covered at every angle; the gradient depends on angle only,
// so scaling the baked texture changes nothing but sharpness.
export function ShineBorder({ ramp, radius, style, children, testID }: { ramp: 'plus' | 'caution'; radius: number; style?: ViewStyle; children: ReactNode; testID?: string }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const rot = useSharedValue(0);
  useEffect(() => { rot.value = withRepeat(withTiming(360, { duration: dur.shine, easing: Easing.linear }), -1, false); }, [rot]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  const side = Math.ceil(Math.hypot(box.w, box.h));
  const onLayout = (e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  return (
    <View testID={testID} onLayout={onLayout} style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
      {side > 0 && (
        <Animated.Image testID="shine" pointerEvents="none" source={RAMP[ramp]}
          style={[{ position: 'absolute', left: box.w / 2 - side / 2, top: box.h / 2 - side / 2, width: side, height: side }, spin]} />
      )}
      {children}
    </View>
  );
}
```

- [ ] **Step 4: `src/ui/Sheet.tsx`** — replace the whole file with this (the `Sheet` output is byte-for-byte the same tree as before; `SheetShell` is new)

```tsx
import { BlurView } from 'expo-blur';
import { type ReactNode, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppBlurTarget } from '../overlays/blurTarget';
import { bez, blur, color, dur, ease } from '../theme/tokens';
import { Mono, Sans } from './Txt';

// sheetShell() (line 2203) without its title block: scrim (rgba(23,22,26,.28) + blur(2px), fade-in .2s) and the white panel
// (radius 22 22 0 0, shadow 0 -8px 40px rgba(0,0,0,.18), padding 10 20 <paddingBottom>, sheet-up .28s) with the 36×4 handle.
export function SheetShell({ onClose, handleMargin = 18, paddingBottom = 28, gap, children, testID }:
  { onClose: () => void; handleMargin?: number; paddingBottom?: number; gap?: number; children: ReactNode; testID?: string }) {
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
        <Animated.View onLayout={(e) => setH(e.nativeEvent.layout.height)} style={[styles.panel, { paddingBottom: paddingBottom + insets.bottom, gap }, panelStyle]}>
          <View style={[styles.handle, { marginBottom: handleMargin }]} />
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

export function Sheet({ title, sub, action, onClose, children, testID }: { title: string; sub: string; action?: ReactNode; onClose: () => void; children: ReactNode; testID?: string }) {
  return (
    <SheetShell onClose={onClose} testID={testID}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Sans size={22} weight={600} ls={-0.5} color={color.ink}>{title}</Sans>
          <Mono size={10} ls={1.6} color={color.ink3} style={{ marginTop: 6 }}>{sub}</Mono>
        </View>
        {action}
      </View>
      {children}
    </SheetShell>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: color.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, boxShadow: '0 -8px 40px rgba(0,0,0,0.18)', paddingTop: 10, paddingHorizontal: 20 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: color.handle, alignSelf: 'center' },
});
```

- [ ] **Step 5: `src/ui/InfiniteRail.tsx`** — the tripled, centre-snapping, silently-recentring rail (Slice 1 `Rail.tsx`, generalised; `attachHub`/`startHubAuto` lines 1880–1898)

```tsx
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { forwardRef, type ReactElement, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { FlatList, type NativeScrollEvent, type NativeSyntheticEvent, StyleSheet, useWindowDimensions } from 'react-native';
import { GAP, liveIndex, middleSlot, railPadding, recenterSlot, slotForOffset, STEP } from '../lib/rail';
import { dur } from '../theme/tokens';

export type InfiniteRailHandle = { scrollTo: (i: number, animated: boolean) => void; advance: () => void };
export type InfiniteRailProps = {
  count: number; index: number; onIndexChange: (i: number) => void;
  renderItem: (i: number, active: boolean, slot: number) => ReactElement;
  keyFor: (i: number) => string | number;
  extraData?: unknown; testID?: string;
};

// Data is the index list tripled (3n slots); the middle copy is "home". Scrolling into the first/last copy is undone silently
// by one set once momentum ends (source onRailScroll / onHubScroll). scrollTo(i) always targets the middle copy.
// advance() moves one slot forward (the source's startHubAuto glides to children[n + idx + 1]) and recentres itself on a timer,
// because a programmatic animated scroll does not reliably fire onMomentumScrollEnd on Android.
export const InfiniteRail = forwardRef<InfiniteRailHandle, InfiniteRailProps>(function InfiniteRail({ count: n, index, onIndexChange, renderItem, keyFor, extraData, testID }, ref) {
  const { width } = useWindowDimensions();
  const data = useMemo(() => Array.from({ length: 3 * n }, (_, slot) => slot), [n]);
  const list = useRef<FlatList<number>>(null);
  const scrollIdx = useRef(index);
  const slotRef = useRef(middleSlot(index, n));
  const ready = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const jump = useCallback((slot: number, animated: boolean) => {
    slotRef.current = slot;
    list.current?.scrollToOffset({ offset: slot * STEP, animated });
  }, []);
  const scrollTo = useCallback((i: number, animated: boolean) => {
    scrollIdx.current = i;
    jump(middleSlot(i, n), animated);
  }, [n, jump]);
  const advance = useCallback(() => {
    const slot = slotRef.current + 1;
    jump(slot, true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const rs = recenterSlot(slotRef.current, n);
      if (rs !== slotRef.current) jump(rs, false);
    }, dur.swipe + 60);
  }, [n, jump]);
  useImperativeHandle(ref, () => ({ scrollTo, advance }), [scrollTo, advance]);

  useEffect(() => { if (ready.current && index !== scrollIdx.current) scrollTo(index, true); }, [index, scrollTo]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const onContentSizeChange = useCallback(() => {
    if (!ready.current) { ready.current = true; scrollTo(index, false); }
  }, [index, scrollTo]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slot = slotForOffset(e.nativeEvent.contentOffset.x);
    slotRef.current = slot;
    const live = liveIndex(slot, n);
    if (live !== scrollIdx.current) { scrollIdx.current = live; onIndexChange(live); }
  }, [n, onIndexChange]);

  const onMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slot = slotForOffset(e.nativeEvent.contentOffset.x);
    const rs = recenterSlot(slot, n);
    if (rs !== slot) jump(rs, false);
  }, [n, jump]);

  return (
    <MaskedView maskElement={<LinearGradient colors={['transparent', '#000', '#000', 'transparent']} locations={[0, 0.09, 0.91, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />}>
      <FlatList
        ref={list}
        testID={testID}
        horizontal
        data={data}
        extraData={[index, extraData]}
        keyExtractor={(slot) => `${keyFor(liveIndex(slot, n))}-${slot}`}
        renderItem={({ item: slot }) => { const i = liveIndex(slot, n); return renderItem(i, i === index, slot); }}
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
});
```

- [ ] **Step 6: `src/screens/garage/Rail.tsx`** — replace the whole file (same props, same behaviour, same `testID="rail"`)

```tsx
import { useRef } from 'react';
import { isOpenRecall } from '../../lib/derive';
import { useAppStore } from '../../store/useAppStore';
import { InfiniteRail, type InfiniteRailHandle } from '../../ui/InfiniteRail';
import { VehicleCard } from './VehicleCard';

export function Rail({ onOpenStats }: { onOpenStats: (id: number) => void }) {
  const vehicles = useAppStore((s) => s.vehicles);
  const idx = useAppStore((s) => s.idx);
  const scheduled = useAppStore((s) => s.scheduled);
  const setIdx = useAppStore((s) => s.setIdx);
  const openSheet = useAppStore((s) => s.openSheet);
  const rail = useRef<InfiniteRailHandle>(null);
  return (
    <InfiniteRail
      ref={rail}
      testID="rail"
      count={vehicles.length}
      index={idx}
      onIndexChange={setIdx}
      keyFor={(i) => vehicles[i].id}
      extraData={[scheduled, vehicles]}
      renderItem={(i, active) => {
        const item = vehicles[i];
        return (
          <VehicleCard
            vehicle={item}
            active={active}
            scheduled={scheduled}
            onPress={() => (!active ? rail.current?.scrollTo(i, true) : onOpenStats(item.id))}
            onAction={() => (isOpenRecall(item, scheduled) ? openSheet('recall') : onOpenStats(item.id))}
          />
        );
      }}
    />
  );
}
```

- [ ] **Step 7: Tests** `src/ui/__tests__/slice3-primitives.test.tsx`

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { createRef } from 'react';
import { FlatList, Text } from 'react-native';
import { InfiniteRail, type InfiniteRailHandle } from '../InfiniteRail';
import { Sheet, SheetShell } from '../Sheet';
import { ShineBorder } from '../ShineBorder';
import { StatusChip } from '../StatusChip';
import { Toggle } from '../Toggle';

describe('StatusChip', () => {
  it('renders icon and label', () => {
    const { getByText, getByTestId } = render(<StatusChip bg="#D0021B" fg="#fff" icon="alarm-warning-fill" label="ACTION REQUIRED" />);
    expect(getByText('ACTION REQUIRED')).toBeTruthy();
    expect(getByTestId('icon-alarm-warning-fill')).toBeTruthy();
  });
});

describe('Toggle', () => {
  it('is a switch that reports its state and presses', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<Toggle on label="Push Notifications" onPress={onPress} />);
    const sw = getByRole('switch');
    expect(sw.props.accessibilityState).toEqual({ checked: true });
    fireEvent.press(sw);
    expect(onPress).toHaveBeenCalled();
  });
});

describe('ShineBorder', () => {
  it('mounts the rotating ramp once it has a size', () => {
    const { getByTestId, queryByTestId, getByText } = render(<ShineBorder ramp="plus" radius={16} testID="sb"><Text>card</Text></ShineBorder>);
    expect(getByText('card')).toBeTruthy();
    expect(queryByTestId('shine')).toBeNull();
    fireEvent(getByTestId('sb'), 'layout', { nativeEvent: { layout: { width: 390, height: 300 } } });
    expect(getByTestId('shine').props.style).toEqual(expect.arrayContaining([expect.objectContaining({ width: 493, height: 493 })]));
  });
});

describe('SheetShell / Sheet', () => {
  it('SheetShell closes on scrim tap and renders children', () => {
    const onClose = jest.fn();
    const { getByLabelText, getByText } = render(<SheetShell onClose={onClose} handleMargin={6} gap={14}><Text>body</Text></SheetShell>);
    expect(getByText('body')).toBeTruthy();
    fireEvent.press(getByLabelText('Close sheet'));
    expect(onClose).toHaveBeenCalled();
  });
  it('Sheet still renders title, sub and action', () => {
    const { getByText } = render(<Sheet title="Add a vehicle" sub="ENTER VIN" onClose={jest.fn()} action={<Text>act</Text>}><Text>body</Text></Sheet>);
    expect(getByText('Add a vehicle')).toBeTruthy();
    expect(getByText('ENTER VIN')).toBeTruthy();
    expect(getByText('act')).toBeTruthy();
  });
});

describe('InfiniteRail', () => {
  const items = ['a', 'b', 'c'];
  it('renders the list tripled with the active flag on the middle copy', () => {
    const { getAllByText } = render(
      <InfiniteRail count={3} index={1} onIndexChange={jest.fn()} keyFor={(i) => items[i]} renderItem={(i, active) => <Text>{items[i] + (active ? '*' : '')}</Text>} />,
    );
    expect(getAllByText('b*')).toHaveLength(3);
    expect(getAllByText('a')).toHaveLength(3);
  });
  it('scrollTo targets the middle copy; advance moves one slot and recentres on a timer', () => {
    jest.useFakeTimers();
    const spy = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation(() => {});
    const ref = createRef<InfiniteRailHandle>();
    render(<InfiniteRail ref={ref} count={3} index={2} onIndexChange={jest.fn()} keyFor={(i) => items[i]} renderItem={(i) => <Text>{items[i]}</Text>} />);
    ref.current!.scrollTo(0, true);
    expect(spy).toHaveBeenLastCalledWith({ offset: 3 * 332, animated: true });
    ref.current!.advance();               // slot 3 → 4 (still in the middle copy)
    expect(spy).toHaveBeenLastCalledWith({ offset: 4 * 332, animated: true });
    ref.current!.advance();               // 4 → 5
    ref.current!.advance();               // 5 → 6 = first slot of the last copy → recentred to 3 after the timer
    expect(spy).toHaveBeenLastCalledWith({ offset: 6 * 332, animated: true });
    jest.advanceTimersByTime(500);
    expect(spy).toHaveBeenLastCalledWith({ offset: 3 * 332, animated: false });
    spy.mockRestore();
    jest.useRealTimers();
  });
  it('reports the live index from scroll offsets and recentres after momentum', () => {
    const onIndexChange = jest.fn();
    const spy = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation(() => {});
    const { getByTestId } = render(<InfiniteRail testID="r" count={3} index={0} onIndexChange={onIndexChange} keyFor={(i) => items[i]} renderItem={(i) => <Text>{items[i]}</Text>} />);
    fireEvent.scroll(getByTestId('r'), { nativeEvent: { contentOffset: { x: 4 * 332 } } });
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    fireEvent(getByTestId('r'), 'momentumScrollEnd', { nativeEvent: { contentOffset: { x: 7 * 332 } } });
    expect(spy).toHaveBeenLastCalledWith({ offset: 4 * 332, animated: false });
    spy.mockRestore();
  });
});
```

- [ ] **Step 8: Gate** — `npm test -- ui`, `npm test -- Garage` (the Slice 1 garage tests must pass unchanged), then `npm test && npm run typecheck`. Report.

**Checkpoint commit message (controller):** `feat: StatusChip, Toggle, ShineBorder, SheetShell, InfiniteRail (garage rail refactored onto it)`
