# Task 10 brief — Slice 3 (app tabs)

Extracted verbatim from `docs/superpowers/plans/2026-09-10-slice3-app-tabs.md`. The spec `docs/superpowers/specs/2026-09-10-slice3-app-tabs-design.md` (§8 Profile, Membership) is the binding authority; the source of truth is `design_handoff_recall_hub/design/GaragePrototype.dc.html` lines 537–633 and 749–799 (markup), 1678–1723 and 2087–2127 (logic). References: `docs/reference/app-profile*.png`, `app-membership*.png`, `app-geometry.json` (`profile`, `membership`).

## Rules for this task
- Work in `C:\GarrsMobile`. **Do not run git. Do not install packages. Do not download anything.**
- Transcribe the code in this brief exactly. Deviate only when something does not compile or pass, keep the deviation minimal, and state exactly what you changed and why in the report.
- Only create/modify the files listed under **Files**. Other tasks are editing other screens at the same time; if the full-tree gate fails inside a file that is not yours, say so in the report and do not touch it.
- Gate: run your own suite first (`npm test -- profile`), plus `npm test -- VinHelp`, then the full `npm test && npm run typecheck` before reporting.
- Environment: Windows 11 x64, Node 24, Expo SDK 57, RN 0.86, expo-router 57 (mocked globally: `useRouter()` returns the exported `router` with jest fns), jest-expo 57, TypeScript 6 strict. Already present from Tasks 1–4: `USER`, `ACTIVITY`, `PLANS`, `PROFILE_COPY`, `MEMBERSHIP_COPY` (`src/fixtures/profile.ts`), `src/lib/membership.ts` (`planLabel`, `planLine`, `featureVals`), `isOpenRecall` (`src/lib/derive.ts`), store actions, `Toggle`, `ShineBorder`, `SlideUpScreen`, `MetalButton` (`tint="default"` exists), `Icon`, `Sans`/`Mono`, tokens (`color.infoBg/dangerBg/dangerEdge/dangerInk/hair08/hair10/hair12/hair14/ink7/ink8`).
- Report: write `.superpowers/sdd/2026-09-10-slice3-app-tabs/task-10-report.md` with: **Status** (DONE / DONE_WITH_CONCERNS / BLOCKED), files created/modified, the test and typecheck output summary (numbers), deviations, deferred steps, concerns.

---

### Task 10: Profile tab, membership screen, plan cards

**Files:**
- Create: `src/screens/profile/ProfileScreen.tsx`, `src/screens/profile/MembershipScreen.tsx`, `src/screens/profile/PlanCard.tsx`, `src/screens/profile/__tests__/profile.test.tsx`
- Modify: `app/(tabs)/profile.tsx` (replace the stub route), `src/ui/SlideUpScreen.tsx` (add an optional `gap` prop, default 20 — VIN help keeps 20, membership uses 16)

**Interfaces:** `ProfileScreen` (no props), `MembershipScreen` (no props; Task 12 mounts it while `screen === 'membership'`), `PlanCard { plan, active, onSelect }`.

- [ ] **Step 1: `src/ui/SlideUpScreen.tsx`** — add `gap` (only these two lines change):

```tsx
export function SlideUpScreen({ caption, onClose, footer, children, testID, gap = 20 }: { caption: string; onClose: () => void; footer?: ReactNode; children: ReactNode; testID?: string; gap?: number }) {
```
```tsx
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap, paddingTop: 8, paddingHorizontal: 20, paddingBottom: 32 }}>{children}</ScrollView>
```

- [ ] **Step 2: `src/screens/profile/PlanCard.tsx`** (lines 760–792; vals 2096–2124)

```tsx
import { Pressable, View } from 'react-native';
import { MEMBERSHIP_COPY } from '../../fixtures/profile';
import type { Plan } from '../../fixtures/types';
import { featureVals } from '../../lib/membership';
import { color } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { MetalButton } from '../../ui/MetalButton';
import { ShineBorder } from '../../ui/ShineBorder';
import { Sans } from '../../ui/Txt';

export function PlanCard({ plan: p, active, onSelect }: { plan: Plan; active: boolean; onSelect: () => void }) {
  const label = active ? MEMBERSHIP_COPY.current : p.cta;
  const inner = (
    <View style={{ borderRadius: 14, backgroundColor: color.surface, borderWidth: 1, borderColor: p.recommend ? 'transparent' : color.hair10, padding: 18, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ gap: 5 }}>
          <Sans size={18} weight={600} ls={-0.3} color={color.ink}>{p.name}</Sans>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Sans size={32} weight={600} ls={-1.3} color={color.ink}>{p.price}</Sans>
            <Sans size={13} color={color.ink5}>{MEMBERSHIP_COPY.perMonth}</Sans>
          </View>
        </View>
        {p.recommend ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, backgroundColor: color.ink, paddingVertical: 5, paddingHorizontal: 10 }}>
            <Icon name="fire-fill" size={13} color={color.textOnDark} />
            <Sans size={11} weight={500} color={color.textOnDark}>{MEMBERSHIP_COPY.recommend}</Sans>
          </View>
        ) : null}
      </View>
      <View style={{ height: 1, backgroundColor: color.hair08 }} />
      <View style={{ gap: 10 }}>
        {p.features.map((f) => {
          const v = featureVals(f);
          return (
            <View key={v.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <Icon name={v.icon} size={15} color={v.color} />
              <Sans size={13} color={v.text}>{v.label}</Sans>
            </View>
          );
        })}
      </View>
      {p.recommend ? (
        // metalPill without a tint (line 2109): the default chrome ramp over the dark face, r12, full width
        <MetalButton tint="default" label={label} icon="sparkling-2-line" width="auto" height={48} radius={12} gap={8} iconSize={16} fontSize={14} onPress={onSelect} testID={`plan-cta-${p.id}`} />
      ) : (
        <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: active }} disabled={active} onPress={onSelect} testID={`plan-cta-${p.id}`}
          style={{ height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: active ? color.sunken : color.surface, borderWidth: 1, borderColor: active ? 'transparent' : color.hair14 }}>
          <Sans size={14} weight={500} color={active ? color.ink5 : color.ink}>{label}</Sans>
        </Pressable>
      )}
    </View>
  );
  return p.recommend
    ? <ShineBorder ramp="plus" radius={16} style={{ padding: 2 }} testID={`plan-${p.id}`}>{inner}</ShineBorder>
    : <View testID={`plan-${p.id}`} style={{ borderRadius: 16, backgroundColor: color.surface }}>{inner}</View>;
}
```

- [ ] **Step 3: `src/screens/profile/MembershipScreen.tsx`** (lines 749–799)

```tsx
import { View } from 'react-native';
import { MEMBERSHIP_COPY, PLANS } from '../../fixtures/profile';
import { useAppStore } from '../../store/useAppStore';
import { color } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { SlideUpScreen } from '../../ui/SlideUpScreen';
import { Sans } from '../../ui/Txt';
import { PlanCard } from './PlanCard';

export function MembershipScreen() {
  const plan = useAppStore((s) => s.plan);
  const setPlan = useAppStore((s) => s.setPlan);
  const closeScreen = useAppStore((s) => s.closeScreen);
  return (
    <SlideUpScreen caption={MEMBERSHIP_COPY.caption} onClose={closeScreen} gap={16} testID="screen-membership">
      <View style={{ gap: 7 }}>
        <Sans size={32} lh={36} weight={600} ls={-1.1} color={color.ink}>{MEMBERSHIP_COPY.title}</Sans>
        <Sans size={14} lh={21} color={color.ink5}>{MEMBERSHIP_COPY.sub}</Sans>
      </View>
      {PLANS.map((p) => <PlanCard key={p.id} plan={p} active={p.id === plan} onSelect={() => setPlan(p.id)} />)}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingTop: 2, paddingHorizontal: 2 }}>
        <Icon name="lock-line" size={14} color={color.ink4} />
        <Sans size={12} lh={18} color={color.ink5} style={{ flex: 1 }}>{MEMBERSHIP_COPY.billed}</Sans>
      </View>
    </SlideUpScreen>
  );
}
```

- [ ] **Step 4: `src/screens/profile/ProfileScreen.tsx`** (lines 537–633; `profileVals` 1678)

```tsx
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACTIVITY, PROFILE_COPY, USER } from '../../fixtures/profile';
import { isOpenRecall } from '../../lib/derive';
import { planLabel, planLine } from '../../lib/membership';
import { useAppStore } from '../../store/useAppStore';
import { color } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { MetalButton } from '../../ui/MetalButton';
import { Toggle } from '../../ui/Toggle';
import { Mono, Sans } from '../../ui/Txt';

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const vehicles = useAppStore((s) => s.vehicles);
  const scheduled = useAppStore((s) => s.scheduled);
  const plan = useAppStore((s) => s.plan);
  const pfPush = useAppStore((s) => s.pfPush);
  const pfEmail = useAppStore((s) => s.pfEmail);
  const pfBio = useAppStore((s) => s.pfBio);
  const openSheet = useAppStore((s) => s.openSheet);
  const openScreen = useAppStore((s) => s.openScreen);
  const togglePref = useAppStore((s) => s.togglePref);
  const switchTab = useAppStore((s) => s.switchTab);
  const flash = useAppStore((s) => s.flash);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16, paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
      <View style={{ alignItems: 'center', gap: 8, paddingTop: 20, paddingBottom: 22 }}>
        <View style={{ width: 118, height: 118, borderRadius: 59, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface, borderWidth: 2, borderColor: color.hair12 }}>
          <Sans size={42} lh={49} weight={600} ls={-1.5} color={color.ink7}>{USER.initials}</Sans>
        </View>
        <Sans size={28} lh={32} weight={600} ls={-0.9} color={color.ink} style={{ marginTop: 4 }}>{USER.name}</Sans>
        <Sans size={13} color={color.ink5}>{USER.memberSince}</Sans>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, backgroundColor: color.sunken, paddingVertical: 5, paddingHorizontal: 12 }}>
          <Icon name="shield-check-fill" size={12} color={color.blueDeep} />
          <Mono size={9} ls={1.4} color={color.blueDeep}>{planLabel(plan)}</Mono>
        </View>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel={PROFILE_COPY.membership} onPress={() => openScreen('membership')} style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
        <Icon name="vip-crown-2-line" size={20} color={color.blueDeep} />
        <View style={{ flex: 1, gap: 3 }}>
          <Sans size={18} weight={600} ls={-0.3} color={color.ink}>{PROFILE_COPY.membership}</Sans>
          <Mono size={9} ls={1.3} color={color.ink3}>{planLine(plan)}</Mono>
        </View>
        <Icon name="arrow-right-s-line" size={22} color={color.ink4} />
      </Pressable>

      <View style={[styles.card, { gap: 16 }]}>
        <Sans size={18} weight={600} ls={-0.3} color={color.ink}>{PROFILE_COPY.account}</Sans>
        <View style={{ gap: 3 }}>
          <Mono size={9} ls={1.3} color={color.ink3}>{PROFILE_COPY.email}</Mono>
          <Sans size={13} color={color.ink2}>{USER.email}</Sans>
        </View>
        <View style={{ gap: 3 }}>
          <Mono size={9} ls={1.3} color={color.ink3}>{PROFILE_COPY.phone}</Mono>
          <Sans size={13} color={color.ink2}>{USER.phone}</Sans>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={PROFILE_COPY.edit} onPress={() => flash(PROFILE_COPY.editToast)}
          style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: color.hair14 }}>
          <Icon name="pencil-line" size={15} color={color.ink2} />
          <Sans size={13} weight={500} color={color.ink2}>{PROFILE_COPY.edit}</Sans>
        </Pressable>
      </View>

      <View style={[styles.card, { gap: 6 }]}>
        <Sans size={18} weight={600} ls={-0.3} color={color.ink} style={{ marginBottom: 8 }}>{PROFILE_COPY.preferences}</Sans>
        <Toggle on={pfPush} label={PROFILE_COPY.toggles[0]} onPress={() => togglePref('pfPush')} />
        <Toggle on={pfEmail} label={PROFILE_COPY.toggles[1]} onPress={() => togglePref('pfEmail')} />
        <Toggle on={pfBio} label={PROFILE_COPY.toggles[2]} onPress={() => togglePref('pfBio')} />
      </View>

      <View style={[styles.card, { gap: 14 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Sans size={18} weight={600} ls={-0.3} color={color.ink}>{PROFILE_COPY.garage}</Sans>
          <Pressable accessibilityRole="button" accessibilityLabel={PROFILE_COPY.addVehicle} onPress={() => openSheet('add')} hitSlop={8}>
            <Mono size={9} ls={1.4} color={color.blueDeep}>{PROFILE_COPY.addVehicle}</Mono>
          </Pressable>
        </View>
        {vehicles.map((v) => {
          const open = isOpenRecall(v, scheduled);
          const tone = open ? color.red : color.teal;
          return (
            <Pressable key={v.id} accessibilityRole="button" accessibilityLabel={v.name}
              onPress={() => { switchTab('garage'); router.navigate({ pathname: '/(tabs)/garage/[id]', params: { id: String(v.id) } }); }}
              style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 12, backgroundColor: color.surface, borderWidth: 1, borderColor: color.hair08, paddingVertical: 15, paddingHorizontal: 16 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Sans size={15} weight={600} ls={-0.2} color={color.ink}>{v.name}</Sans>
                <Sans size={12} color={color.ink5}>{v.meta}</Sans>
                <View style={{ alignSelf: 'flex-start', marginTop: 2, borderRadius: 4, backgroundColor: color.sunken, paddingVertical: 4, paddingHorizontal: 6 }}>
                  <Mono size={9} ls={1.1} color={color.ink3}>{'VIN: ' + v.vin.replace('···· ', '') + 'XXXXXX'}</Mono>
                </View>
                <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: tone }} />
                  <Sans size={12} color={tone}>{open ? PROFILE_COPY.activeRecall : PROFILE_COPY.allClear}</Sans>
                </View>
              </View>
              <Icon name="car-fill" size={18} color={open ? color.red : color.ink7} />
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.card, { gap: 12 }]}>
        <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: color.infoBg }}>
          <Icon name="customer-service-2-line" size={23} color={color.blueDeep} />
        </View>
        <Sans size={18} weight={600} ls={-0.3} color={color.ink}>{PROFILE_COPY.concierge}</Sans>
        <Sans size={13} lh={20} color={color.ink5}>{PROFILE_COPY.conciergeBody}</Sans>
        <View style={{ flexDirection: 'row', paddingTop: 2 }}>
          <MetalButton tint="blue" label={PROFILE_COPY.startChat} icon="chat-3-line" flex={1} width="auto" height={50} radius={999} gap={8} iconSize={16} fontSize={14} onPress={() => openScreen('chat')} />
        </View>
      </View>

      <View style={[styles.card, { gap: 14 }]}>
        <Sans size={18} weight={600} ls={-0.3} color={color.ink}>{PROFILE_COPY.activity}</Sans>
        {ACTIVITY.map((a) => (
          <View key={a.title} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ width: 8, height: 8, marginTop: 6, borderRadius: 4, backgroundColor: a.color }} />
            <View style={{ flex: 1, gap: 3 }}>
              <Sans size={13} color={color.ink2}>{a.title}</Sans>
              <Mono size={9} ls={1.2} color={color.ink3}>{a.detail}</Mono>
            </View>
          </View>
        ))}
      </View>

      <View style={{ borderRadius: 16, backgroundColor: color.dangerBg, borderWidth: 1, borderColor: color.dangerEdge, padding: 18, gap: 12 }}>
        <Sans size={18} weight={600} ls={-0.3} color={color.red}>{PROFILE_COPY.danger}</Sans>
        <Sans size={13} lh={20} color={color.dangerInk}>{PROFILE_COPY.dangerBody}</Sans>
        <Pressable accessibilityRole="button" accessibilityLabel={PROFILE_COPY.deleteAccount} onPress={() => flash(PROFILE_COPY.deleteToast)}
          style={{ alignSelf: 'flex-start', minHeight: 46, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: color.red }}>
          <Sans size={13} weight={500} color={color.red}>{PROFILE_COPY.deleteAccount}</Sans>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ card: { borderRadius: 16, backgroundColor: color.sunken, padding: 18 } });
```

- [ ] **Step 5: `app/(tabs)/profile.tsx`** — replace the whole file

```tsx
import { ProfileScreen } from '../../src/screens/profile/ProfileScreen';
export default function ProfileRoute() { return <ProfileScreen />; }
```

- [ ] **Step 6: Tests** `src/screens/profile/__tests__/profile.test.tsx`

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { MembershipScreen } from '../MembershipScreen';
import { ProfileScreen } from '../ProfileScreen';
import { resetAppStore, useAppStore } from '../../../store/useAppStore';

const s = () => useAppStore.getState();
beforeEach(() => { resetAppStore(); jest.clearAllMocks(); });

describe('ProfileScreen', () => {
  it('renders the header, membership line, account details, toggles, garage, concierge, activity and danger zone', () => {
    const { getByText, getAllByRole, getByRole } = render(<ProfileScreen />);
    expect(getByText('AV')).toBeTruthy();
    expect(getByText('Alexander Vance')).toBeTruthy();
    expect(getByText('Premium Member since 2022')).toBeTruthy();
    expect(getByText('AEGIS PRO ACTIVE')).toBeTruthy();
    expect(getByText('Pro · $29/month')).toBeTruthy();
    expect(getByText('alexander.vance@example.com')).toBeTruthy();
    expect(getByText('+1 (555) 019-8234')).toBeTruthy();
    expect(getAllByRole('switch')).toHaveLength(3);
    expect(getByRole('switch', { name: 'Biometric Login' }).props.accessibilityState).toEqual({ checked: false });
    expect(getByText('VIN: F12345XXXXXX')).toBeTruthy();
    expect(getByText('1 Active Recall')).toBeTruthy();
    expect(getByText('All Clear')).toBeTruthy();
    expect(getByText('Concierge Support')).toBeTruthy();
    expect(getByText('System scan completed.')).toBeTruthy();
    expect(getByText('YESTERDAY, 14:15 PM')).toBeTruthy();
    expect(getByText('Danger Zone')).toBeTruthy();
  });
  it('toggles flip preferences', () => {
    const { getByRole } = render(<ProfileScreen />);
    fireEvent.press(getByRole('switch', { name: 'Biometric Login' }));
    expect(s().pfBio).toBe(true);
    fireEvent.press(getByRole('switch', { name: 'Push Notifications' }));
    expect(s().pfPush).toBe(false);
  });
  it('rows open the membership screen, the add sheet, the chat, stats, and the two toasts', () => {
    const { getByLabelText } = render(<ProfileScreen />);
    fireEvent.press(getByLabelText('Membership'));
    expect(s().screen).toBe('membership');
    fireEvent.press(getByLabelText('+ ADD VEHICLE'));
    expect(s().sheet).toBe('add');
    fireEvent.press(getByLabelText('Start Chat'));
    expect(s().screen).toBe('chat');
    fireEvent.press(getByLabelText('Taycan 4S'));
    expect(s().tab).toBe('garage');
    expect(router.navigate).toHaveBeenCalledWith({ pathname: '/(tabs)/garage/[id]', params: { id: '2' } });
    fireEvent.press(getByLabelText('Edit Profile'));
    expect(s().toast).toBe('Profile editing stays local in this prototype');
    fireEvent.press(getByLabelText('Delete Account'));
    expect(s().toast).toBe('No account data is stored by this build');
  });
  it('the garage rows go clear once scheduled', () => {
    s().schedule();
    const { getAllByText, queryByText } = render(<ProfileScreen />);
    expect(getAllByText('All Clear')).toHaveLength(3);
    expect(queryByText('1 Active Recall')).toBeNull();
  });
});

describe('MembershipScreen', () => {
  it('renders the three plans with Plus recommended and Pro current', () => {
    const { getByText, getByLabelText, getByTestId } = render(<MembershipScreen />);
    expect(getByText('MEMBERSHIP')).toBeTruthy();
    expect(getByText('Select your protection level')).toBeTruthy();
    expect(getByText('Standard')).toBeTruthy();
    expect(getByText('$9')).toBeTruthy();
    expect(getByText('Recommend')).toBeTruthy();
    expect(getByLabelText('Upgrade to Plus')).toBeTruthy();
    expect(getByLabelText('Switch to Standard')).toBeTruthy();
    expect(getByLabelText('Current plan').props.accessibilityState).toEqual({ disabled: true });
    expect(getByText('Real-time alerts')).toBeTruthy();
    expect(getByText('Billed monthly. Cancel any time from this screen.')).toBeTruthy();
    expect(getByTestId('plan-plus')).toBeTruthy();
  });
  it('selecting Plus makes it current and toasts; Pro becomes selectable', () => {
    const { getByLabelText, getAllByLabelText } = render(<MembershipScreen />);
    fireEvent.press(getByLabelText('Upgrade to Plus'));
    expect(s()).toMatchObject({ plan: 'plus', toast: 'Plus membership active' });
    expect(getByLabelText('Upgrade to Pro')).toBeTruthy();
    expect(getAllByLabelText('Current plan').length).toBeGreaterThan(0);
  });
  it('Close closes the screen', () => {
    const { getByLabelText } = render(<MembershipScreen />);
    fireEvent.press(getByLabelText('Close'));
    expect(s().screen).toBeNull();
  });
});
```

- [ ] **Step 7: Gate** — `npm test -- profile`, `npm test -- VinHelp`, then `npm test && npm run typecheck`. Report.

**Checkpoint commit message (controller):** `feat: Profile tab and membership screen with the Plus shine card`
