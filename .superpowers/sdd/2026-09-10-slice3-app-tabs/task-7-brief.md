# Task 7 brief — Slice 3 (app tabs)

Extracted verbatim from `docs/superpowers/plans/2026-09-10-slice3-app-tabs.md`. The spec `docs/superpowers/specs/2026-09-10-slice3-app-tabs-design.md` (§8 Service form, Service done, Reason sheet) is the binding authority; the source of truth is `design_handoff_recall_hub/design/GaragePrototype.dc.html` lines 363–535 and 973–1001 (markup), 1562–1677 (logic). References: `docs/reference/app-service-*.png`, `app-geometry.json` (`service`, `reasonSheet`, `serviceDone`).

## Rules for this task
- Work in `C:\GarrsMobile`. **Do not run git. Do not install packages. Do not download anything.**
- Transcribe the code in this brief exactly. Deviate only when something does not compile or pass, keep the deviation minimal, and state exactly what you changed and why in the report.
- Only create/modify the files listed under **Files**. Other tasks are editing other screens at the same time; if the full-tree gate fails inside a file that is not yours, say so in the report and do not touch it.
- Gate: run your own suite first (`npm test -- service`), then the full `npm test && npm run typecheck` before reporting.
- Environment: Windows 11 x64, Node 24, Expo SDK 57, RN 0.86 (`boxShadow` is a real style prop), expo-router 57 (mocked globally: `useRouter()` returns the exported `router` with jest fns), jest-expo 57, TypeScript 6 strict. Already present from Tasks 1–5: `SERVICE_COPY`, `SVC_DATES`, `SVC_TIMES`, `SVC_METHODS`, `SVC_CENTER` (`src/fixtures/service.ts`), `REASONS`, `EMPTY_REASON` (`src/fixtures/recalls.ts`), `src/lib/service.ts` (`openRecallVehicle`, `reasonVals`, `reasonRows`, `doneDetails`, `trackerSteps`), `cssAngleToPoints` (`src/lib/gradient.ts`), store actions, `ShineBorder`, `SheetShell`, `StatusChip`, `TiltMap`, `MetalButton`, `OutlinePill`, `Icon`, `Sans`/`Mono`, tokens `color.infoBg/hair10/doneRing/...`.
- Report: write `.superpowers/sdd/2026-09-10-slice3-app-tabs/task-7-report.md` with: **Status** (DONE / DONE_WITH_CONCERNS / BLOCKED), files created/modified, the test and typecheck output summary (numbers), deviations, deferred steps, concerns.

---

### Task 7: Service tab — form, confirmation, reason sheet

**Files:**
- Create: `src/screens/service/ServiceScreen.tsx`, `src/screens/service/ServiceDone.tsx`, `src/screens/service/ReasonSheet.tsx`, `src/screens/service/__tests__/service.test.tsx`
- Modify: `app/(tabs)/service.tsx` (replace the stub route)

**Interfaces:** `ServiceScreen` (no props), `ServiceDone` (no props), `ReasonSheet` (no props; Task 12 mounts it when `sheet === 'reason'`).

- [ ] **Step 1: `src/screens/service/ServiceDone.tsx`** (lines 490–533; vals 1646–1677)

```tsx
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import { SERVICE_COPY } from '../../fixtures/service';
import { cssAngleToPoints } from '../../lib/gradient';
import { doneDetails, trackerSteps } from '../../lib/service';
import { useAppStore } from '../../store/useAppStore';
import { color } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { MetalButton } from '../../ui/MetalButton';
import { Mono, Sans } from '../../ui/Txt';

const FACE = cssAngleToPoints(160, 58, 58);

export function ServiceDone() {
  const router = useRouter();
  const svcMethod = useAppStore((s) => s.svcMethod);
  const svcDate = useAppStore((s) => s.svcDate);
  const svcTime = useAppStore((s) => s.svcTime);
  const returnToGarage = useAppStore((s) => s.returnToGarage);
  const details = doneDetails(svcDate, svcTime, svcMethod);
  const steps = trackerSteps();
  return (
    <View style={{ gap: 26 }} testID="service-done">
      <View style={{ alignItems: 'center', gap: 12, paddingTop: 22, paddingBottom: 4 }}>
        <View style={{ width: 146, height: 146, borderRadius: 73, alignItems: 'center', justifyContent: 'center', backgroundColor: color.sunken, borderWidth: 1, borderColor: color.doneRing, boxShadow: '0 0 34px rgba(15,99,143,0.14)' }}>
          <LinearGradient colors={['#2E93C4', '#0F638F', '#0B4E73']} locations={[0, 0.55, 1]} start={FACE.start} end={FACE.end}
            style={{ width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check-line" size={32} color="#EAF7FF" />
          </LinearGradient>
        </View>
        <Sans size={28} lh={32} weight={600} ls={-0.9} color={color.ink} style={{ marginTop: 6 }}>{SERVICE_COPY.confirmed}</Sans>
        <Sans size={13} color={color.ink5}>{SERVICE_COPY.scheduledSub}</Sans>
      </View>

      <View style={{ borderRadius: 16, backgroundColor: color.sunken, paddingHorizontal: 18 }}>
        {details.map((x) => (
          <View key={x.label} style={{ minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 18, borderTopWidth: 1, borderTopColor: x.line }}>
            <View style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface }}>
              <Icon name={x.icon} size={20} color={color.ink2} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Mono size={9} ls={1.3} color={color.ink3}>{x.label}</Mono>
              <Sans size={18} weight={600} ls={-0.3} color={color.ink}>{x.value}</Sans>
              <Sans size={12} color={color.ink5}>{x.secondary}</Sans>
            </View>
          </View>
        ))}
      </View>

      <View style={{ gap: 14 }}>
        <Mono size={10} ls={1.8} color={color.ink4}>{SERVICE_COPY.tracker}</Mono>
        <View>
          {steps.map((st) => (
            <View key={st.label} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 52 }}>
              <View style={{ width: 20, alignItems: 'center' }}>
                <View style={{ position: 'absolute', top: 20, bottom: -32, width: 1, backgroundColor: st.rail }} />
                <View style={{ width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: st.nodeBg, borderWidth: st.nodeBorderWidth, borderColor: st.nodeBorderColor }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: st.dot }} />
                </View>
              </View>
              <Sans size={st.size} weight={st.weight} ls={st.track} color={st.fg}>{st.label}</Sans>
            </View>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row' }}>
        <MetalButton tint="blue" label={SERVICE_COPY.returnToGarage} icon="inbox-line" flex={1} width="auto" height={54} radius={999} gap={9} iconSize={17} fontSize={15}
          onPress={() => { returnToGarage(); router.navigate('/(tabs)/garage'); }} />
      </View>
    </View>
  );
}
```

- [ ] **Step 2: `src/screens/service/ServiceScreen.tsx`** (lines 363–488; vals 1562–1645)

```tsx
import { type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SERVICE_COPY, SVC_DATES, SVC_METHODS, SVC_TIMES } from '../../fixtures/service';
import { openRecallVehicle, reasonVals } from '../../lib/service';
import { useAppStore } from '../../store/useAppStore';
import { color } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { MetalButton } from '../../ui/MetalButton';
import { ShineBorder } from '../../ui/ShineBorder';
import { TiltMap } from '../../ui/TiltMap';
import { Mono, Sans } from '../../ui/Txt';
import { ServiceDone } from './ServiceDone';

// Reason card shell (lines 374–379): r16, padding 2, overflow hidden; the caution ramp spins behind it when a recall is open.
function ReasonShell({ caution, shell, children }: { caution: boolean; shell: string; children: ReactNode }) {
  return caution
    ? <ShineBorder ramp="caution" radius={16} style={{ padding: 2 }}>{children}</ShineBorder>
    : <View style={{ borderRadius: 16, padding: 2, overflow: 'hidden', backgroundColor: shell }}>{children}</View>;
}

export function ServiceScreen() {
  const insets = useSafeAreaInsets();
  const vehicles = useAppStore((s) => s.vehicles);
  const svcMethod = useAppStore((s) => s.svcMethod);
  const svcDate = useAppStore((s) => s.svcDate);
  const svcTime = useAppStore((s) => s.svcTime);
  const svcDone = useAppStore((s) => s.svcDone);
  const openSheet = useAppStore((s) => s.openSheet);
  const setSvcMethod = useAppStore((s) => s.setSvcMethod);
  const setSvcDate = useAppStore((s) => s.setSvcDate);
  const setSvcTime = useAppStore((s) => s.setSvcTime);
  const confirmService = useAppStore((s) => s.confirmService);
  const flash = useAppStore((s) => s.flash);
  const open = openRecallVehicle(vehicles);
  const r = reasonVals(open);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 24, paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
      {svcDone ? <ServiceDone /> : (
        <View style={{ gap: 24 }}>
          <View style={{ gap: 5 }}>
            <Sans size={30} lh={34} weight={600} ls={-1} color={color.ink}>{SERVICE_COPY.title}</Sans>
            <Sans size={13} color={color.ink5}>{SERVICE_COPY.sub}</Sans>
          </View>

          <Pressable accessibilityRole="button" accessibilityLabel={r.reason} onPress={() => { if (open) openSheet('reason'); }} testID="reason-card">
            <ReasonShell caution={r.caution} shell={r.shell}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, backgroundColor: color.sunken, paddingVertical: 15, paddingHorizontal: 16 }}>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <Icon name={r.icon} size={13} color={r.tone} />
                    <Mono size={9} ls={1.4} color={r.tone}>{r.ref}</Mono>
                  </View>
                  <Sans size={18} lh={23} weight={600} ls={-0.3} color={color.ink}>{r.reason}</Sans>
                  <Mono size={9} ls={1.2} color={color.ink3}>{r.hint}</Mono>
                </View>
                <Icon name="arrow-right-s-line" size={20} color={color.ink4} />
              </View>
            </ReasonShell>
          </Pressable>

          <View style={{ gap: 11 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <Mono size={10} ls={1.8} color={color.ink4}>{SERVICE_COPY.selectedCenter}</Mono>
              <Pressable accessibilityRole="button" accessibilityLabel={SERVICE_COPY.change} onPress={() => flash(SERVICE_COPY.changeToast)} hitSlop={8}>
                <Sans size={12} weight={500} color={color.blueDeep}>{SERVICE_COPY.change}</Sans>
              </Pressable>
            </View>
            <TiltMap />
          </View>

          <View style={{ gap: 11 }}>
            <Mono size={10} ls={1.8} color={color.ink4}>{SERVICE_COPY.method}</Mono>
            <View style={{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 14, backgroundColor: color.sunken }}>
              {SVC_METHODS.map((m) => {
                const on = svcMethod === m.key;
                return (
                  <Pressable key={m.key} accessibilityRole="button" accessibilityLabel={m.label} accessibilityState={{ selected: on }} onPress={() => setSvcMethod(m.key)}
                    style={{ flex: 1, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, backgroundColor: on ? color.surface : 'transparent', boxShadow: on ? '0 1px 2px rgba(0,0,0,0.08)' : undefined }}>
                    <Icon name={m.icon} size={16} color={on ? color.ink : color.ink5} />
                    <Sans size={13} weight={500} color={on ? color.ink : color.ink5}>{m.label}</Sans>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ gap: 11 }}>
            <Mono size={10} ls={1.8} color={color.ink4}>{SERVICE_COPY.selectDate}</Mono>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }}>
              {SVC_DATES.map((d) => {
                const on = svcDate === d.date;
                return (
                  <Pressable key={d.date} accessibilityRole="button" accessibilityLabel={d.day + ' ' + d.date} accessibilityState={{ selected: on }} onPress={() => setSvcDate(d.date)}
                    style={{ width: 66, height: 82, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 16, backgroundColor: on ? color.infoBg : color.surface, borderWidth: 1, borderColor: on ? color.blueDeep : color.hair10 }}>
                    <Mono size={9} ls={1.2} color={on ? color.blueDeep : color.ink4}>{d.day}</Mono>
                    <Sans size={22} weight={600} ls={-0.6} color={on ? color.blueDeep : color.ink}>{d.date}</Sans>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={{ gap: 11 }}>
            <Mono size={10} ls={1.8} color={color.ink4}>{SERVICE_COPY.times}</Mono>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {SVC_TIMES.map((t, i) => {
                const off = i === 0;                       // line 1626: the first slot is unavailable
                const on = !off && svcTime === t;
                return (
                  <Pressable key={t} accessibilityRole="button" accessibilityLabel={t} accessibilityState={{ selected: on, disabled: off }} disabled={off} onPress={() => setSvcTime(t)}
                    style={{ width: '31%', flexGrow: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: on ? color.infoBg : color.surface, borderWidth: 1, borderColor: on ? color.blueDeep : color.hair10, opacity: off ? 0.35 : 1 }}>
                    <Mono size={12} color={on ? color.blueDeep : color.ink}>{t}</Mono>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ flexDirection: 'row', paddingTop: 2 }}>
            <MetalButton tint="blue" label={SERVICE_COPY.confirm} icon="calendar-check-line" flex={1} width="auto" height={54} radius={999} gap={9} iconSize={17} fontSize={15} onPress={confirmService} />
          </View>
        </View>
      )}
    </ScrollView>
  );
}
```

- [ ] **Step 3: `src/screens/service/ReasonSheet.tsx`** (lines 973–1001; vals 1580–1591)

```tsx
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { EMPTY_REASON, REASONS } from '../../fixtures/recalls';
import { SERVICE_COPY } from '../../fixtures/service';
import { openRecallVehicle, reasonRows } from '../../lib/service';
import { useAppStore } from '../../store/useAppStore';
import { color } from '../../theme/tokens';
import { OutlinePill } from '../../ui/OutlinePill';
import { SheetShell } from '../../ui/Sheet';
import { StatusChip } from '../../ui/StatusChip';
import { Mono, Sans } from '../../ui/Txt';

export function ReasonSheet() {
  const router = useRouter();
  const vehicles = useAppStore((s) => s.vehicles);
  const closeSheet = useAppStore((s) => s.closeSheet);
  const switchTab = useAppStore((s) => s.switchTab);
  const setRecallFilter = useAppStore((s) => s.setRecallFilter);
  const open = openRecallVehicle(vehicles);
  if (!open || !open.recall) return null;
  const recall = open.recall;
  const why = (REASONS[recall.code] ?? EMPTY_REASON).why;
  return (
    <SheetShell onClose={closeSheet} handleMargin={6} paddingBottom={26} gap={14} testID="sheet-reason">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <StatusChip bg={color.red} fg="#fff" icon="alarm-warning-fill" label={SERVICE_COPY.activeRecall} />
        <Mono size={10} ls={1.2} color={color.ink3}>{recall.code}</Mono>
      </View>
      <View style={{ gap: 4 }}>
        <Sans size={21} lh={26} weight={600} ls={-0.5} color={color.ink}>{recall.title}</Sans>
        <Sans size={13} color={color.ink5}>{open.name + ' · ' + open.meta}</Sans>
      </View>
      <View>
        {reasonRows().map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: color.hair07 }}>
            <Mono size={9} ls={1.2} color={color.ink3}>{k}</Mono>
            <Sans size={13} color={color.ink} style={{ textAlign: 'right', flexShrink: 1 }}>{v}</Sans>
          </View>
        ))}
      </View>
      <Sans size={13.5} lh={20} color={color.ink2}>{why}</Sans>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'stretch' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={SERVICE_COPY.continueBooking} onPress={closeSheet}
          style={{ flex: 1.4, height: 50, borderRadius: 999, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' }}>
          <Sans size={14} weight={500} color={color.textOnDark}>{SERVICE_COPY.continueBooking}</Sans>
        </Pressable>
        <OutlinePill label={SERVICE_COPY.fullRecall} icon="arrow-right-up-line" height={50}
          onPress={() => { closeSheet(); switchTab('recalls'); setRecallFilter('open'); router.navigate({ pathname: '/(tabs)/recalls/[id]', params: { id: 'v' + open.id } }); }} />
      </View>
    </SheetShell>
  );
}
```

- [ ] **Step 4: `app/(tabs)/service.tsx`** — replace the whole file

```tsx
import { ServiceScreen } from '../../src/screens/service/ServiceScreen';
export default function ServiceRoute() { return <ServiceScreen />; }
```

- [ ] **Step 5: Tests** `src/screens/service/__tests__/service.test.tsx`

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ReasonSheet } from '../ReasonSheet';
import { ServiceScreen } from '../ServiceScreen';
import { resetAppStore, useAppStore } from '../../../store/useAppStore';

const s = () => useAppStore.getState();
beforeEach(() => { resetAppStore(); jest.clearAllMocks(); });

describe('ServiceScreen (form)', () => {
  it('renders the title, the caution reason card, the centre and every picker', () => {
    const { getByText, getByLabelText } = render(<ServiceScreen />);
    expect(getByText('Schedule Service')).toBeTruthy();
    expect(getByText('REF: NHTSA-24V-137')).toBeTruthy();
    expect(getByText('Rear camera image failure')).toBeTruthy();
    expect(getByText('TAP FOR RECALL DETAILS')).toBeTruthy();
    expect(getByText('SELECTED CENTER')).toBeTruthy();
    expect(getByText('Prime Center')).toBeTruthy();
    expect(getByText('SERVICE METHOD')).toBeTruthy();
    expect(getByLabelText('Drop-off').props.accessibilityState).toEqual({ selected: true });
    expect(getByLabelText('TUE 13').props.accessibilityState).toEqual({ selected: true });
    expect(getByLabelText('09:30 AM').props.accessibilityState).toEqual({ selected: true, disabled: false });
    expect(getByLabelText('08:00 AM').props.accessibilityState).toEqual({ selected: false, disabled: true });
    expect(getByLabelText('Confirm Appointment')).toBeTruthy();
  });
  it('the reason card opens the reason sheet; Change toasts', () => {
    const { getByTestId, getByLabelText } = render(<ServiceScreen />);
    fireEvent.press(getByTestId('reason-card'));
    expect(s().sheet).toBe('reason');
    fireEvent.press(getByLabelText('Change'));
    expect(s().toast).toBe('Dealer map is not wired up here');
  });
  it('pickers update the store; the disabled slot does not', () => {
    const { getByLabelText } = render(<ServiceScreen />);
    fireEvent.press(getByLabelText('Concierge'));
    fireEvent.press(getByLabelText('THU 15'));
    fireEvent.press(getByLabelText('02:30 PM'));
    fireEvent.press(getByLabelText('08:00 AM'));
    expect(s()).toMatchObject({ svcMethod: 'concierge', svcDate: '15', svcTime: '02:30 PM' });
  });
  it('Confirm Appointment books it, toasts and shows the confirmation', () => {
    const { getByLabelText, getByText } = render(<ServiceScreen />);
    fireEvent.press(getByLabelText('Confirm Appointment'));
    expect(s()).toMatchObject({ svcDone: true, scheduled: true, toast: 'Service booked · Tuesday, Oct 13 at 09:30 AM' });
    expect(getByText('Confirmed')).toBeTruthy();
    expect(getByText('Your service request is scheduled.')).toBeTruthy();
    expect(getByText('Tuesday, Oct 13 at 09:30 AM')).toBeTruthy();
    expect(getByText('Drop-off')).toBeTruthy();
    expect(getByText('1200 Technical Blvd')).toBeTruthy();
    expect(getByText('STATUS TRACKER')).toBeTruthy();
    expect(getByText('Appointment confirmed')).toBeTruthy();
    fireEvent.press(getByLabelText('Return to Garage'));
    expect(s()).toMatchObject({ tab: 'garage', svcDone: false });
    expect(router.navigate).toHaveBeenCalledWith('/(tabs)/garage');
  });
  it('shows the routine card when no vehicle has a recall', () => {
    useAppStore.setState({ vehicles: s().vehicles.map((v) => ({ ...v, recall: null })) });
    const { getByText, getByTestId } = render(<ServiceScreen />);
    expect(getByText('REF: NHTSA-24V001')).toBeTruthy();
    expect(getByText('System Diagnostic & Update')).toBeTruthy();
    expect(getByText('ROUTINE MAINTENANCE VISIT')).toBeTruthy();
    fireEvent.press(getByTestId('reason-card'));
    expect(s().sheet).toBeNull();
  });
});

describe('ReasonSheet', () => {
  it('renders the recall, rows and why; Continue booking closes; Full recall opens the detail', () => {
    s().openSheet('reason');
    const { getByText, getByLabelText } = render(<ReasonSheet />);
    expect(getByText('ACTIVE SAFETY RECALL')).toBeTruthy();
    expect(getByText('NHTSA 24V-137')).toBeTruthy();
    expect(getByText('Model S Plaid · 2024 Tesla · 42,000 mi')).toBeTruthy();
    expect(getByText('Prime Center — 4.2 mi')).toBeTruthy();
    expect(getByText(/rear camera image while the vehicle is in reverse/)).toBeTruthy();
    fireEvent.press(getByLabelText('Continue booking'));
    expect(s().sheet).toBeNull();
    s().openSheet('reason');
    fireEvent.press(getByLabelText('Full recall'));
    expect(s()).toMatchObject({ sheet: null, tab: 'recalls', rFilter: 'open' });
    expect(router.navigate).toHaveBeenCalledWith({ pathname: '/(tabs)/recalls/[id]', params: { id: 'v1' } });
  });
  it('renders nothing without an open recall', () => {
    useAppStore.setState({ vehicles: s().vehicles.map((v) => ({ ...v, recall: null })) });
    expect(render(<ReasonSheet />).toJSON()).toBeNull();
  });
});
```

- [ ] **Step 6: Gate** — `npm test -- service`, then `npm test && npm run typecheck`. Report.

**Checkpoint commit message (controller):** `feat: Service tab — booking form with tilt map, reason sheet, confirmation`
