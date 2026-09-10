# Task 6 brief — Slice 3 (app tabs)

Extracted verbatim from `docs/superpowers/plans/2026-09-10-slice3-app-tabs.md`. The spec `docs/superpowers/specs/2026-09-10-slice3-app-tabs-design.md` (§4 navigation, §8 Recalls + Recall detail) is the binding authority; the source of truth is `design_handoff_recall_hub/design/GaragePrototype.dc.html` lines 127–273 (markup) and 1431–1561 (logic). References: `docs/reference/app-recalls-*.png`, `app-recall-detail-*.png`, `app-geometry.json` (`recalls`, `detail`).

## Rules for this task
- Work in `C:\GarrsMobile`. **Do not run git. Do not install packages. Do not download anything.**
- Transcribe the code in this brief exactly. Deviate only when something does not compile or pass, keep the deviation minimal, and state exactly what you changed and why in the report.
- Only create/modify/delete the files listed under **Files**. Other tasks are editing other screens at the same time; if the full-tree gate fails inside a file that is not yours, say so in the report and do not touch it.
- Gate: run your own suite first (`npm test -- recalls`), plus `npm test -- OverlayHost` and `npm test -- VehicleStats`, then the full `npm test && npm run typecheck` before reporting.
- Environment: Windows 11 x64, Node 24, Expo SDK 57, RN 0.86, Reanimated 4.5, expo-router 57 (mocked globally in `jest.setup.ts`: `useRouter()` returns the exported `router` object with `navigate/push/back/replace` jest fns), jest-expo 57, TypeScript 6 strict. Already present from Tasks 1–4: fixtures (`RECALLS_COPY`, `STATE_META`), `src/lib/recalls.ts`, the store actions, `StatusChip`, `GlowCard`, `MetalButton`, `OutlinePill`, `Sans`/`Mono`, `Icon`.
- Report: write `.superpowers/sdd/2026-09-10-slice3-app-tabs/task-6-report.md` with: **Status** (DONE / DONE_WITH_CONCERNS / BLOCKED), files created/modified/deleted, the test and typecheck output summary (numbers), deviations, deferred steps, concerns.

---

### Task 6: Recalls tab, recall card, recall detail, routes

**Files:**
- Create: `src/screens/recalls/RecallsScreen.tsx`, `src/screens/recalls/RecallCard.tsx`, `src/screens/recalls/RecallDetailScreen.tsx`, `src/screens/recalls/__tests__/recalls.test.tsx`, `app/(tabs)/recalls/_layout.tsx`, `app/(tabs)/recalls/index.tsx`, `app/(tabs)/recalls/[id].tsx`
- Delete: `app/(tabs)/recalls.tsx` (a file and a directory cannot share the route name)
- Modify: `src/ui/HumpTabBar.tsx` (one line: the recalls tab also navigates to `{ screen: 'index' }`), `app/(tabs)/garage/[id].tsx` (stats "Details" → `showRecall`)

- [ ] **Step 1: `src/screens/recalls/RecallCard.tsx`** (lines 231–264; item vals 1536–1557)

```tsx
import { Pressable, View } from 'react-native';
import { RECALLS_COPY, STATE_META } from '../../fixtures/recalls';
import type { RecallItem } from '../../fixtures/types';
import { itemRows } from '../../lib/recalls';
import { color } from '../../theme/tokens';
import { GlowCard } from '../../ui/GlowCard';
import { Icon } from '../../ui/Icon';
import { MetalButton } from '../../ui/MetalButton';
import { OutlinePill } from '../../ui/OutlinePill';
import { StatusChip } from '../../ui/StatusChip';
import { Mono, Sans } from '../../ui/Txt';

export function RecallCard({ item: x, vehicleLabel, expanded, onToggle, onSchedule, onDetails }:
  { item: RecallItem; vehicleLabel: string; expanded: boolean; onToggle: () => void; onSchedule: () => void; onDetails: () => void }) {
  const m = STATE_META[x.state];
  const open = x.state === 'open';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={x.title} onPress={onToggle} testID={`recall-${x.id}`}>
      <GlowCard shell={open ? color.shellDark : color.sunken} radius={18} glow={open} blobSize={200} faceOpacity={open ? 0.86 : 0} faceRadius={16} faceStyle={{ padding: 16, gap: 12 }} outline="rgba(0,0,0,0.08)">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <StatusChip bg={m.chipBg} fg={m.chipFg} icon={m.icon} label={m.status} />
          <Mono size={10} ls={1.2} color={color.ink3}>{x.code}</Mono>
          <Icon name={expanded ? 'arrow-up-s-line' : 'arrow-down-s-line'} size={20} color={color.ink4} style={{ marginLeft: 'auto' }} />
        </View>
        <View style={{ gap: 3 }}>
          <Sans size={18} lh={23} weight={600} ls={-0.3} color={color.ink}>{x.title}</Sans>
          <Sans size={13} color={color.ink5}>{vehicleLabel}</Sans>
        </View>
        {expanded && (
          <View testID={`recall-rows-${x.id}`}>
            {itemRows(x).map(([k, v]) => (
              <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: color.hair07 }}>
                <Mono size={9} ls={1.2} color={color.ink3}>{k}</Mono>
                <Sans size={13} color={color.ink} style={{ textAlign: 'right', flexShrink: 1 }}>{v}</Sans>
              </View>
            ))}
          </View>
        )}
        {open && (
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'stretch' }}>
            <MetalButton tint="blue" label={RECALLS_COPY.scheduleRepair} icon="calendar-2-line" flex={1.4} width="auto" height={48} radius={999} gap={8} iconSize={16} fontSize={14} onPress={onSchedule} />
            <OutlinePill label={RECALLS_COPY.seeDetails} icon="arrow-right-line" height={48} onPress={onDetails} />
          </View>
        )}
      </GlowCard>
    </Pressable>
  );
}
```

- [ ] **Step 2: `src/screens/recalls/RecallsScreen.tsx`** (lines 182–273; `recallsVals` 1481)

```tsx
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RECALLS_COPY } from '../../fixtures/recalls';
import { allRecalls, emptyText, FILTERS, filterVals, heroVals, recallCounts, vehicleName } from '../../lib/recalls';
import { useAppStore } from '../../store/useAppStore';
import { bez, color, dur, ease } from '../../theme/tokens';
import { GlowCard } from '../../ui/GlowCard';
import { Icon } from '../../ui/Icon';
import { MetalButton } from '../../ui/MetalButton';
import { Mono, Sans } from '../../ui/Txt';
import { RecallCard } from './RecallCard';

export function RecallsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const vehicles = useAppStore((s) => s.vehicles);
  const scheduled = useAppStore((s) => s.scheduled);
  const rFilter = useAppStore((s) => s.rFilter);
  const rOpen = useAppStore((s) => s.rOpen);
  const openSheet = useAppStore((s) => s.openSheet);
  const setRecallFilter = useAppStore((s) => s.setRecallFilter);
  const toggleRecall = useAppStore((s) => s.toggleRecall);
  const scheduleFromRecalls = useAppStore((s) => s.scheduleFromRecalls);
  const items = allRecalls(vehicles, scheduled);
  const counts = recallCounts(items);
  const hero = heroVals(counts, vehicles.length);
  const shown = items.filter((x) => x.state === rFilter);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 20, paddingTop: insets.top + 24, paddingHorizontal: 20, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <View style={{ flexShrink: 1, gap: 6 }}>
          <Sans size={38} lh={42} weight={600} ls={-1.2} color={color.ink}>{RECALLS_COPY.title}</Sans>
          <Mono size={11} ls={1.4} color={color.ink4}>{hero.headline}</Mono>
        </View>
        <MetalButton tint="blue" label="Add Vehicle" icon="sparkling-2-line" onPress={() => openSheet('add')} />
      </View>

      <GlowCard testID="recalls-hero" shell={hero.shell} radius={18} glow={hero.glow} blobSize={220} faceOpacity={hero.faceOpacity} faceRadius={16} faceStyle={{ padding: 18, gap: 14 }} outline="rgba(0,0,0,0.08)">
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
          <View style={{ flex: 1, gap: 3 }}>
            <Sans size={30} lh={34} weight={600} ls={-1} color={color.ink}>{hero.title}</Sans>
            <Sans size={13} color={color.ink5}>{hero.sub}</Sans>
          </View>
          <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: hero.iconBg }}>
            <Icon name={hero.icon} size={19} color="#ffffff" />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 3, height: 6 }}>
          {hero.strip.map((s) => <StripSegment key={s.color} grow={s.grow} tone={s.color} />)}
        </View>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          {hero.legend.map((l) => (
            <View key={l.color} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: l.color }} />
              <Mono size={9} ls={1.1} color={color.ink3}>{l.text}</Mono>
            </View>
          ))}
        </View>
      </GlowCard>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {FILTERS.map((k) => {
          const f = filterVals(k, counts, rFilter);
          return (
            <Pressable key={k} accessibilityRole="button" accessibilityLabel={f.label} accessibilityState={{ selected: f.on }} onPress={() => setRecallFilter(k)}
              style={{ flex: 1, gap: 3, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 14, backgroundColor: f.bg, borderWidth: 1, borderColor: f.border }}>
              <Sans size={22} weight={600} ls={-0.6} color={f.fg}>{String(f.count)}</Sans>
              <Mono size={9} ls={1.2} color={f.meta}>{f.label}</Mono>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: 12 }}>
        {shown.map((x) => (
          <RecallCard
            key={x.id}
            item={x}
            vehicleLabel={vehicleName(vehicles, x.vid) + ' · ' + x.done}
            expanded={rOpen === x.id}
            onToggle={() => toggleRecall(x.id)}
            onSchedule={scheduleFromRecalls}
            onDetails={() => router.navigate({ pathname: '/(tabs)/recalls/[id]', params: { id: x.id } })}
          />
        ))}
        {shown.length === 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 16, backgroundColor: color.sunken, padding: 16 }}>
            <Icon name="shield-check-fill" size={19} color={color.teal} />
            <Sans size={14} color={color.ink2}>{emptyText(rFilter)}</Sans>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// `flex: {{ grow }}` with `transition: flex-grow .5s ease` (line 207)
function StripSegment({ grow, tone }: { grow: number; tone: string }) {
  const g = useSharedValue(grow);
  useEffect(() => { g.value = withTiming(grow, { duration: dur.strip, easing: bez(ease.css) }); }, [grow, g]);
  const style = useAnimatedStyle(() => ({ flexGrow: g.value }));
  return <Animated.View testID="strip-segment" style={[{ flexBasis: 0, borderRadius: 3, backgroundColor: tone }, style]} />;
}
```

- [ ] **Step 3: `src/screens/recalls/RecallDetailScreen.tsx`** (lines 127–180; `detailVals` 1455)

```tsx
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RECALLS_COPY } from '../../fixtures/recalls';
import { allRecalls, detailFor } from '../../lib/recalls';
import { useAppStore } from '../../store/useAppStore';
import { color } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { MetalButton } from '../../ui/MetalButton';
import { StatusChip } from '../../ui/StatusChip';
import { Mono, Sans } from '../../ui/Txt';

export function RecallDetailScreen({ id, onBack }: { id: string; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const vehicles = useAppStore((s) => s.vehicles);
  const scheduled = useAppStore((s) => s.scheduled);
  const scheduleFromRecalls = useAppStore((s) => s.scheduleFromRecalls);
  const flash = useAppStore((s) => s.flash);
  const d = detailFor(allRecalls(vehicles, scheduled), vehicles, id);
  if (!d) return null;
  return (
    <View style={{ flex: 1 }} testID="recall-detail">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 20, paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable accessibilityLabel="Back" onPress={onBack} style={{ width: 36, height: 36, marginLeft: -8, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="arrow-left-line" size={20} color={color.ink} />
          </Pressable>
          <Mono size={10} ls={1.6} color={color.ink3}>{d.code}</Mono>
          <View style={{ marginLeft: 'auto' }}>
            <StatusChip bg={d.meta.chipBg} fg={d.meta.chipFg} icon={d.meta.icon} label={d.meta.status} />
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Sans size={28} lh={33} weight={600} ls={-0.9} color={color.ink}>{d.title}</Sans>
          <Sans size={14} color={color.ink5}>{d.vehicle}</Sans>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {d.facts.map((f) => (
            <View key={f.k} style={{ width: '48%', flexGrow: 1, borderRadius: 14, backgroundColor: color.sunken, paddingVertical: 13, paddingHorizontal: 14, gap: 5 }}>
              <Mono size={9} ls={1.3} color={color.ink3}>{f.k}</Mono>
              <Sans size={15} weight={500} color={color.ink}>{f.v}</Sans>
            </View>
          ))}
        </View>

        <View style={{ gap: 9 }}>
          <Mono size={10} ls={1.8} color={color.ink4}>{RECALLS_COPY.why}</Mono>
          <Sans size={15} lh={23} color={color.ink2}>{d.why}</Sans>
        </View>

        <View style={{ gap: 11 }}>
          <Mono size={10} ls={1.8} color={color.ink4}>{RECALLS_COPY.remedy}</Mono>
          {d.steps.map((st) => (
            <View key={st.n} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' }}>
                <Mono size={11} color={color.textOnDark}>{String(st.n)}</Mono>
              </View>
              <View style={{ flex: 1, gap: 2, paddingTop: 2 }}>
                <Sans size={14} weight={500} color={color.ink}>{st.title}</Sans>
                <Sans size={13} lh={19} color={color.ink5}>{st.body}</Sans>
              </View>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, backgroundColor: color.sunken, paddingVertical: 14, paddingHorizontal: 15 }}>
          <Icon name="information-line" size={17} color={color.blueDeep} />
          <Sans size={13} lh={19} color={color.ink2} style={{ flex: 1 }}>{d.note}</Sans>
        </View>
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'stretch', paddingTop: 12, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: 'rgba(255,255,255,0.94)', borderTopWidth: 1, borderTopColor: color.hair07 }}>
        {d.state === 'open' ? (
          <MetalButton tint="blue" label={RECALLS_COPY.scheduleRepair} icon="calendar-2-line" flex={1} width="auto" height={54} radius={999} gap={9} iconSize={17} fontSize={15} onPress={scheduleFromRecalls} />
        ) : (
          <View style={{ flex: 1, height: 54, borderRadius: 999, backgroundColor: color.sunken, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icon name="checkbox-circle-line" size={17} color={color.ink5} />
            <Sans size={15} weight={500} color={color.ink5}>{d.state === 'scheduled' ? RECALLS_COPY.scheduledLabel : RECALLS_COPY.repairComplete}</Sans>
          </View>
        )}
        <Pressable accessibilityLabel="Call the service centre" onPress={() => flash(RECALLS_COPY.callToast)}
          style={{ width: 54, height: 54, borderRadius: 999, borderWidth: 1, borderColor: color.hair14, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="phone-line" size={19} color={color.ink} />
        </Pressable>
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Routes** — delete `app/(tabs)/recalls.tsx`, then create:

`app/(tabs)/recalls/_layout.tsx`
```tsx
import { Stack } from 'expo-router';
export default function RecallsStack() {
  return <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: 'transparent' } }} />;
}
```
`app/(tabs)/recalls/index.tsx`
```tsx
import { RecallsScreen } from '../../../src/screens/recalls/RecallsScreen';
export default function RecallsRoute() { return <RecallsScreen />; }
```
`app/(tabs)/recalls/[id].tsx`
```tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RecallDetailScreen } from '../../../src/screens/recalls/RecallDetailScreen';

export default function RecallDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  return <RecallDetailScreen id={String(id)} onBack={() => router.back()} />;
}
```

- [ ] **Step 5: `src/ui/HumpTabBar.tsx`** — change the tab item's `onPress` so both stacks pop to their root on a tab tap (line 2366's `rDetail: null`):

```tsx
              onPress={() => { switchTab(t.id); navigation.navigate(t.id, t.id === 'garage' || t.id === 'recalls' ? { screen: 'index' } : undefined); }}
```

- [ ] **Step 6: `app/(tabs)/garage/[id].tsx`** — replace the whole file (stats "Details", source line 1401: recalls tab, filter `open`, that recall expanded):

```tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VehicleStatsScreen } from '../../../src/screens/VehicleStatsScreen';
import { useAppStore } from '../../../src/store/useAppStore';

export default function StatsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const showRecall = useAppStore((s) => s.showRecall);
  return (
    <VehicleStatsScreen
      id={Number(id)}
      onBack={() => router.back()}
      onRecallDetails={() => { showRecall('v' + id); router.navigate('/(tabs)/recalls'); }}
    />
  );
}
```

- [ ] **Step 7: Tests** `src/screens/recalls/__tests__/recalls.test.tsx`

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { RecallDetailScreen } from '../RecallDetailScreen';
import { RecallsScreen } from '../RecallsScreen';
import { resetAppStore, useAppStore } from '../../../store/useAppStore';

const s = () => useAppStore.getState();
beforeEach(() => { resetAppStore(); jest.clearAllMocks(); });

describe('RecallsScreen', () => {
  it('renders the title, headline, hero, filters and the open recall card', () => {
    const { getByText, getByLabelText } = render(<RecallsScreen />);
    expect(getByText('Recalls')).toBeTruthy();
    expect(getByText('1 OPEN RECALL · 3 VEHICLES MONITORED')).toBeTruthy();
    expect(getByText('1 needs action')).toBeTruthy();
    expect(getByText('A free remedy is available. Booking it clears the flag on your vehicle health score.')).toBeTruthy();
    expect(getByText('1 OPEN')).toBeTruthy();
    expect(getByText('3 RESOLVED')).toBeTruthy();
    expect(getByLabelText('OPEN').props.accessibilityState).toEqual({ selected: true });
    expect(getByText('ACTION REQUIRED')).toBeTruthy();
    expect(getByText('NHTSA 24V-137')).toBeTruthy();
    expect(getByText('Model S Plaid · Reported 12 Feb 2026')).toBeTruthy();
    expect(getByLabelText('Schedule Repair')).toBeTruthy();
    expect(getByLabelText('Add Vehicle')).toBeTruthy();
  });
  it('tapping the card expands its rows; tapping again collapses', () => {
    const { getByTestId, queryByTestId, getByText } = render(<RecallsScreen />);
    expect(queryByTestId('recall-rows-v1')).toBeNull();
    fireEvent.press(getByTestId('recall-v1'));
    expect(getByTestId('recall-rows-v1')).toBeTruthy();
    expect(getByText('Tesla Service — 6.2 mi')).toBeTruthy();
    fireEvent.press(getByTestId('recall-v1'));
    expect(queryByTestId('recall-rows-v1')).toBeNull();
  });
  it('filters: scheduled is empty at first; resolved lists the three history rows', () => {
    const { getByLabelText, getByText, queryByText } = render(<RecallsScreen />);
    fireEvent.press(getByLabelText('SCHEDULED'));
    expect(getByText('Nothing scheduled right now.')).toBeTruthy();
    fireEvent.press(getByLabelText('RESOLVED'));
    expect(getByText('Front seat belt anchor torque')).toBeTruthy();
    expect(getByText('Civic Type R · Repaired 27 Jun 2023')).toBeTruthy();
    expect(queryByText('Rear camera image failure')).toBeNull();
  });
  it('Schedule Repair books it, toasts and switches to the scheduled filter', () => {
    const { getByLabelText, getByText } = render(<RecallsScreen />);
    fireEvent.press(getByLabelText('Schedule Repair'));
    expect(s()).toMatchObject({ scheduled: true, rFilter: 'scheduled', toast: 'Service booked · Thu 10:30 AM' });
    expect(getByText('1 in the shop')).toBeTruthy();
    expect(getByText('REPAIR SCHEDULED')).toBeTruthy();
    expect(getByText('Model S Plaid · Booked Thu 10:30 AM')).toBeTruthy();
    expect(getByText('NOTHING OPEN · 3 VEHICLES MONITORED')).toBeTruthy();
  });
  it('See details navigates to the detail route', () => {
    const { getByLabelText } = render(<RecallsScreen />);
    fireEvent.press(getByLabelText('See details'));
    expect(router.navigate).toHaveBeenCalledWith({ pathname: '/(tabs)/recalls/[id]', params: { id: 'v1' } });
  });
  it('Add Vehicle opens the add sheet', () => {
    const { getByLabelText } = render(<RecallsScreen />);
    fireEvent.press(getByLabelText('Add Vehicle'));
    expect(s().sheet).toBe('add');
  });
});

describe('RecallDetailScreen', () => {
  it('renders the open recall with facts, remedy steps, note and the Schedule Repair CTA', () => {
    const onBack = jest.fn();
    const { getByText, getByLabelText } = render(<RecallDetailScreen id="v1" onBack={onBack} />);
    expect(getByText('NHTSA 24V-137')).toBeTruthy();
    expect(getByText('ACTION REQUIRED')).toBeTruthy();
    expect(getByText('Rear camera image failure')).toBeTruthy();
    expect(getByText('Model S Plaid · Reported 12 Feb 2026')).toBeTruthy();
    expect(getByText('UNITS AFFECTED')).toBeTruthy();
    expect(getByText('125,227')).toBeTruthy();
    expect(getByText('WHY THIS MATTERS')).toBeTruthy();
    expect(getByText('THE REMEDY')).toBeTruthy();
    expect(getByText('Display self-test')).toBeTruthy();
    expect(getByText('Until the update is applied, check behind the vehicle before reversing rather than relying on the screen.')).toBeTruthy();
    fireEvent.press(getByLabelText('Schedule Repair'));
    expect(s()).toMatchObject({ scheduled: true, rFilter: 'scheduled' });
    fireEvent.press(getByLabelText('Back'));
    expect(onBack).toHaveBeenCalled();
  });
  it('shows the scheduled and complete footers, and the phone toast', () => {
    s().schedule();
    const { getByText, getByLabelText, rerender } = render(<RecallDetailScreen id="v1" onBack={jest.fn()} />);
    expect(getByText('REPAIR SCHEDULED')).toBeTruthy();
    expect(getByText('Scheduled Thu 10:30 AM')).toBeTruthy();
    fireEvent.press(getByLabelText('Call the service centre'));
    expect(s().toast).toBe('Calling the service centre is not wired up here');
    rerender(<RecallDetailScreen id="h2" onBack={jest.fn()} />);
    expect(getByText('RESOLVED')).toBeTruthy();
    expect(getByText('Repair complete')).toBeTruthy();
    expect(getByText('Taycan 4S · Repaired 02 Nov 2024')).toBeTruthy();
  });
  it('renders nothing for an unknown id', () => {
    const { toJSON } = render(<RecallDetailScreen id="nope" onBack={jest.fn()} />);
    expect(toJSON()).toBeNull();
  });
});
```

- [ ] **Step 8: Gate** — `npm test -- recalls`, `npm test -- OverlayHost`, `npm test -- VehicleStats`, then `npm test && npm run typecheck`. Report.

**Checkpoint commit message (controller):** `feat: Recalls tab, recall cards and the recall detail route`
