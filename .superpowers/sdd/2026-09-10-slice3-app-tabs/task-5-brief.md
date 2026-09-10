# Task 5 brief — Slice 3 (app tabs)

Extracted verbatim from `docs/superpowers/plans/2026-09-10-slice3-app-tabs.md`. The spec `docs/superpowers/specs/2026-09-10-slice3-app-tabs-design.md` (§7 `TiltMap`, §8 Service item 3, §9) is the binding authority; the source of truth is `design_handoff_recall_hub/design/GaragePrototype.dc.html` lines 388–441 (markup) and 1798–1829 (tilt logic). Reference: `docs/reference/app-service-form.png`.

## Rules for this task
- Work in `C:\GarrsMobile`. **Do not run git. Do not install packages. Do not download anything.**
- Transcribe the code in this brief exactly. Deviate only when something does not compile or pass, keep the deviation minimal, and state exactly what you changed and why in the report.
- Only create/modify the files listed under **Files**. Other tasks may be editing other files at the same time; if the full-tree gate fails inside a file that is not yours, say so in the report and do not touch it.
- Gate: run your own suite first (`npm test -- TiltMap`), then the full `npm test && npm run typecheck` before reporting.
- Environment: Windows 11 x64, Node 24, Expo SDK 57, RN 0.86 (New Architecture: `boxShadow` and `filter` style props are real), Reanimated 4.5, expo-sensors 57 (installed; mocked globally in `jest.setup.ts`), jest-expo 57, TypeScript 6 strict. Tasks 1–2 already exist: `SERVICE_COPY`, `SVC_CENTER` in `src/fixtures/service.ts`; `tiltFor`, `tiltChanged`, `RAD_TO_DEG` in `src/lib/service.ts`; tokens `color.mapInk/mapInk2/mapInk3/mapTint/hair10`, `dur.tilt`. Every `Text` goes through `Sans` / `Mono` (`src/ui/Txt.tsx`); icons are `<Icon name="…">`.
- Report: write `.superpowers/sdd/2026-09-10-slice3-app-tabs/task-5-report.md` with: **Status** (DONE / DONE_WITH_CONCERNS / BLOCKED), files created/modified, the test and typecheck output summary (numbers), deviations, deferred steps, concerns.

---

### Task 5: `useTilt` + `TiltMap`

**Files:**
- Create: `src/ui/useTilt.ts`, `src/ui/TiltMap.tsx`, `src/ui/__tests__/TiltMap.test.tsx`

**Interfaces:** `TiltMap` takes no props (Task 7 renders it inside the service form); `useTilt() → { tiltX, tiltY (shared values, degrees), tiltOn }`.

- [ ] **Step 1: `src/ui/useTilt.ts`** (`onTiltMotion` / `enableTilt`, lines 1798–1822)

```ts
import { DeviceMotion } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';
import { RAD_TO_DEG, type Tilt, tiltChanged, tiltFor } from '../lib/service';
import { dur } from '../theme/tokens';

// deviceorientation → expo-sensors DeviceMotion. rotation.beta/gamma arrive in radians; the maths (tiltFor) wants degrees.
// Each accepted reading retargets the card's rotateX/rotateY over 120 ms linear (the source's `transition: transform .12s linear`).
// If the sensor is unavailable or denied, the card stays flat and the pill reads LIVE (spec §9).
export function useTilt() {
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const [tiltOn, setTiltOn] = useState(false);
  const last = useRef<Tilt>({ tiltX: 0, tiltY: 0 });
  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    let cancelled = false;
    (async () => {
      try {
        if (!(await DeviceMotion.isAvailableAsync())) return;
        const p = await DeviceMotion.requestPermissionsAsync();
        if (!p.granted || cancelled) return;
        DeviceMotion.setUpdateInterval(60);
        sub = DeviceMotion.addListener((m) => {
          if (!m.rotation) return;
          const next = tiltFor(m.rotation.beta * RAD_TO_DEG, m.rotation.gamma * RAD_TO_DEG);
          if (!tiltChanged(last.current, next)) return;
          last.current = next;
          tiltX.value = withTiming(next.tiltX, { duration: dur.tilt, easing: Easing.linear });
          tiltY.value = withTiming(next.tiltY, { duration: dur.tilt, easing: Easing.linear });
          setTiltOn(true);
        });
      } catch {
        /* no sensor on this device: stay flat */
      }
    })();
    return () => { cancelled = true; sub?.remove(); };
  }, [tiltX, tiltY]);
  return { tiltX, tiltY, tiltOn };
}
```

- [ ] **Step 2: `src/ui/TiltMap.tsx`** (lines 388–441)

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { type DimensionValue, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { SERVICE_COPY, SVC_CENTER } from '../fixtures/service';
import { color } from '../theme/tokens';
import { Icon } from './Icon';
import { Mono, Sans } from './Txt';
import { useTilt } from './useTilt';

type Pct = `${number}%`;
const pct = (n: number): Pct => `${n}%`;

// Roads (lines 391–402): orientation, position %, stroke width, colour — each line centred on its percentage.
const ROADS: ['h' | 'v', number, number, string][] = [
  ['h', 35, 4, color.mapInk], ['h', 65, 4, color.mapInk],
  ['v', 30, 3, color.mapInk2], ['v', 70, 3, color.mapInk2],
  ['h', 20, 1.5, color.mapInk3], ['h', 50, 1.5, color.mapInk3], ['h', 80, 1.5, color.mapInk3],
  ['v', 15, 1.5, color.mapInk3], ['v', 45, 1.5, color.mapInk3], ['v', 55, 1.5, color.mapInk3], ['v', 85, 1.5, color.mapInk3],
];
// Buildings (lines 403–408): percentage boxes, r3, rgba(107,106,114, fill) with a 1 px rgba(107,106,114, edge) border.
const BUILDINGS: { top: Pct; left?: Pct; right?: Pct; width: Pct; height: Pct; fill: number; edge: number }[] = [
  { top: '40%', left: '10%', width: '15%', height: '20%', fill: 0.3, edge: 0.2 },
  { top: '15%', left: '35%', width: '12%', height: '15%', fill: 0.25, edge: 0.15 },
  { top: '70%', left: '75%', width: '18%', height: '18%', fill: 0.28, edge: 0.18 },
  { top: '20%', right: '10%', width: '10%', height: '25%', fill: 0.22, edge: 0.15 },
  { top: '55%', left: '5%', width: '8%', height: '12%', fill: 0.2, edge: 0.12 },
  { top: '8%', left: '75%', width: '14%', height: '10%', fill: 0.22, edge: 0.15 },
];
const PIN = 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z';

export function TiltMap() {
  const { tiltX, tiltY, tiltOn } = useTilt();
  // perspective:1000px on the wrapper + rotateX(tiltX) rotateY(tiltY) on the card (line 388–389)
  const tilt = useAnimatedStyle(() => ({ transform: [{ perspective: 1000 }, { rotateX: `${tiltX.value}deg` }, { rotateY: `${tiltY.value}deg` }] }));
  return (
    <Animated.View testID="tilt-map" style={[styles.card, tilt]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[StyleSheet.absoluteFill, { backgroundColor: color.sunken }]} />
        {ROADS.map(([o, pos, w, c], i) => o === 'h'
          ? <View key={i} style={{ position: 'absolute', left: 0, right: 0, top: pct(pos) as DimensionValue, height: w, marginTop: -w / 2, backgroundColor: c }} />
          : <View key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: pct(pos) as DimensionValue, width: w, marginLeft: -w / 2, backgroundColor: c }} />)}
        {BUILDINGS.map((b, i) => (
          <View key={i} style={{ position: 'absolute', top: b.top, left: b.left, right: b.right, width: b.width, height: b.height, borderRadius: 3, backgroundColor: `rgba(107,106,114,${b.fill})`, borderWidth: 1, borderColor: `rgba(107,106,114,${b.edge})` }} />
        ))}
        <View style={styles.pin}>
          <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
            <Path d={PIN} fill={color.blueDeep} />
            <Circle cx={12} cy={9} r={2.5} fill="#FFFFFF" />
          </Svg>
        </View>
        <LinearGradient colors={['#FFFFFF', 'rgba(255,255,255,0)']} locations={[0, 0.55]} start={{ x: 0.5, y: 1 }} end={{ x: 0.5, y: 0 }} style={[StyleSheet.absoluteFill, { opacity: 0.72 }]} />
      </View>
      <View style={styles.content}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.86)' }}>
            <Icon name="map-pin-line" size={20} color={color.ink} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: color.mapTint, paddingVertical: 5, paddingHorizontal: 9 }}>
            <View style={{ width: 6, height: 6, borderRadius: 4, backgroundColor: color.teal }} />
            <Mono size={9} ls={1.2} color={color.ink3}>{tiltOn ? SERVICE_COPY.liveTilt : SERVICE_COPY.live}</Mono>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ gap: 3 }}>
            <Sans size={18} weight={600} ls={-0.3} color={color.ink}>{SVC_CENTER.name}</Sans>
            <Sans size={13} color={color.ink5}>{SVC_CENTER.address}</Sans>
            <Mono size={11} ls={0.6} color={color.ink3}>{SVC_CENTER.coords}</Mono>
            <LinearGradient colors={['rgba(15,99,143,0.5)', 'rgba(15,99,143,0.25)', 'rgba(15,99,143,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ height: 1, marginTop: 3 }} />
          </View>
          <Mono size={11} color={color.blueDeep}>{SVC_CENTER.distance}</Mono>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { height: 250, borderRadius: 16, backgroundColor: color.surface, borderWidth: 1, borderColor: color.hair10, overflow: 'hidden' },
  pin: { position: 'absolute', left: '50%', top: '50%', marginLeft: -15, marginTop: -15, width: 30, height: 30, filter: [{ dropShadow: '0 0 10px rgba(15,99,143,0.45)' }] },
  content: { flex: 1, justifyContent: 'space-between', paddingVertical: 15, paddingHorizontal: 16 },
});
```

- [ ] **Step 3: Tests** `src/ui/__tests__/TiltMap.test.tsx`

```tsx
import { act, render, waitFor } from '@testing-library/react-native';
import { DeviceMotion } from 'expo-sensors';
import { TiltMap } from '../TiltMap';

type Listener = (m: { rotation: { alpha: number; beta: number; gamma: number; timestamp: number } }) => void;
const mocked = DeviceMotion as unknown as { isAvailableAsync: jest.Mock; requestPermissionsAsync: jest.Mock; addListener: jest.Mock; setUpdateInterval: jest.Mock };

afterEach(() => { mocked.isAvailableAsync.mockResolvedValue(false); jest.clearAllMocks(); });

describe('TiltMap', () => {
  it('renders the centre copy and LIVE when no sensor is available', async () => {
    const { getByText, getByTestId } = render(<TiltMap />);
    expect(getByText('Prime Center')).toBeTruthy();
    expect(getByText('1200 Technical Blvd')).toBeTruthy();
    expect(getByText('37.7749° N, 122.4194° W')).toBeTruthy();
    expect(getByText('4.2 mi')).toBeTruthy();
    expect(getByText('LIVE')).toBeTruthy();
    expect(getByTestId('icon-map-pin-line')).toBeTruthy();
    await waitFor(() => expect(mocked.isAvailableAsync).toHaveBeenCalled());
    expect(mocked.addListener).not.toHaveBeenCalled();
  });
  it('subscribes at 60 ms when available and flips to LIVE TILT on the first changed reading', async () => {
    mocked.isAvailableAsync.mockResolvedValue(true);
    let listener: Listener | undefined;
    mocked.addListener.mockImplementation((l: Listener) => { listener = l; return { remove: jest.fn() }; });
    const { getByText, queryByText } = render(<TiltMap />);
    await waitFor(() => expect(listener).toBeDefined());
    expect(mocked.setUpdateInterval).toHaveBeenCalledWith(60);
    expect(queryByText('LIVE TILT')).toBeNull();
    act(() => { listener!({ rotation: { alpha: 0, beta: Math.PI / 2, gamma: 0, timestamp: 0 } }); });   // beta 90° → tiltX −8
    expect(getByText('LIVE TILT')).toBeTruthy();
  });
});
```

- [ ] **Step 4: Gate** — `npm test -- TiltMap`, then `npm test && npm run typecheck`. If `filter: [{ dropShadow: … }]` is rejected by the RN 0.86 types, use the string form `filter: 'drop-shadow(0 0 10px rgba(15,99,143,0.45))'` and say so in the report. Report.

**Checkpoint commit message (controller):** `feat: tilt map (expo-sensors DeviceMotion) for the service form`
