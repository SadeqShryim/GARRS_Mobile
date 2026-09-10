# Task 8 brief — Slice 3 (app tabs)

Extracted verbatim from `docs/superpowers/plans/2026-09-10-slice3-app-tabs.md`. The spec `docs/superpowers/specs/2026-09-10-slice3-app-tabs-design.md` (§8 Hub, Light sheet) is the binding authority; the source of truth is `design_handoff_recall_hub/design/GaragePrototype.dc.html` lines 635–710 and 897–922 (markup), 1831–1948 (logic). References: `docs/reference/app-hub-*.png`, `app-geometry.json` (`hub`, `lightSheet`).

## Rules for this task
- Work in `C:\GarrsMobile`. **Do not run git. Do not install packages. Do not download anything.**
- Transcribe the code in this brief exactly. Deviate only when something does not compile or pass, keep the deviation minimal, and state exactly what you changed and why in the report.
- Only create/modify the files listed under **Files**. Other tasks are editing other screens at the same time; if the full-tree gate fails inside a file that is not yours, say so in the report and do not touch it.
- Gate: run your own suite first (`npm test -- hub`), then the full `npm test && npm run typecheck` before reporting.
- Environment: Windows 11 x64, Node 24, Expo SDK 57, RN 0.86, Reanimated 4.5, expo-router 57 (mocked globally: `useIsFocused()` returns true), jest-expo 57, TypeScript 6 strict. Already present from Tasks 1–4: `ARTICLES`, `LIGHTS`, `src/lib/hub.ts` (`GROUPS`, `groupChip`, `HUB_COPY`, `hubCounter`, `hubHeadline`, `visibleLights`, `lightById`, `BADGE`), `cssAngleToPoints` (`src/lib/gradient.ts`), store actions, `InfiniteRail` (+ `InfiniteRailHandle` with `scrollTo`/`advance`), `SheetShell`, `StatusChip`, `Icon`, `Sans`/`Mono`, tokens (`color.hair20`, `dur.hubAuto`, `dur.color`, `ease.css`, `bez`).
- Report: write `.superpowers/sdd/2026-09-10-slice3-app-tabs/task-8-report.md` with: **Status** (DONE / DONE_WITH_CONCERNS / BLOCKED), files created/modified, the test and typecheck output summary (numbers), deviations, deferred steps, concerns.

---

### Task 8: Hub tab — article rail, dots, light filter, light grid, light sheet

**Files:**
- Create: `src/screens/hub/HubScreen.tsx`, `src/screens/hub/ArticleCard.tsx`, `src/screens/hub/LightSheet.tsx`, `src/screens/hub/__tests__/hub.test.tsx`
- Modify: `app/(tabs)/hub.tsx` (replace the stub route)

**Interfaces:** `HubScreen` (no props), `ArticleCard { article, onPress }`, `LightSheet` (no props; Task 12 mounts it while `hubLight` is set).

- [ ] **Step 1: `src/screens/hub/ArticleCard.tsx`** (lines 651–664)

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, View } from 'react-native';
import type { Article } from '../../fixtures/types';
import { cssAngleToPoints } from '../../lib/gradient';
import { color } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { Mono, Sans } from '../../ui/Txt';

const WASH = cssAngleToPoints(135, 318, 132);   // linear-gradient(135deg, from 0%, to 100%) over the 318×132 wash

export function ArticleCard({ article: a, onPress }: { article: Article; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={a.title} onPress={onPress} testID={`article-${a.id}`}
      style={{ width: 318, borderRadius: 18, overflow: 'hidden', backgroundColor: color.sunken }}>
      <LinearGradient colors={a.wash} start={WASH.start} end={WASH.end} style={{ height: 132, justifyContent: 'space-between', padding: 16 }}>
        <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.9)', paddingVertical: 5, paddingHorizontal: 10 }}>
          <Icon name={a.icon} size={12} color={color.ink} />
          <Mono size={9} ls={1.3} color={color.ink}>{a.kicker}</Mono>
        </View>
        <Icon name={a.icon} size={44} color="rgba(255,255,255,0.85)" style={{ alignSelf: 'flex-end' }} />
      </LinearGradient>
      <View style={{ paddingTop: 15, paddingHorizontal: 16, paddingBottom: 17, gap: 6 }}>
        <Sans size={18} lh={23} weight={600} ls={-0.4} color={color.ink}>{a.title}</Sans>
        <Sans size={13} lh={19} color={color.ink5}>{a.dek}</Sans>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <Mono size={9} ls={1.2} color={color.ink3}>{a.read}</Mono>
          <Icon name="arrow-right-up-line" size={14} color={color.ink4} />
        </View>
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 2: `src/screens/hub/HubScreen.tsx`** (lines 635–710; `hubVals` 1901, `startHubAuto` 1890)

```tsx
import { useIsFocused } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ARTICLES } from '../../fixtures/articles';
import { GROUPS, groupChip, HUB_COPY, hubCounter, hubHeadline, visibleLights } from '../../lib/hub';
import { useAppStore } from '../../store/useAppStore';
import { bez, color, dur, ease } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { InfiniteRail, type InfiniteRailHandle } from '../../ui/InfiniteRail';
import { Mono, Sans } from '../../ui/Txt';
import { ArticleCard } from './ArticleCard';

export function HubScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const focused = useIsFocused();
  const hubIdx = useAppStore((s) => s.hubIdx);
  const hubGroup = useAppStore((s) => s.hubGroup);
  const hubLight = useAppStore((s) => s.hubLight);
  const screen = useAppStore((s) => s.screen);
  const sheet = useAppStore((s) => s.sheet);
  const setHubIdx = useAppStore((s) => s.setHubIdx);
  const setHubGroup = useAppStore((s) => s.setHubGroup);
  const openLight = useAppStore((s) => s.openLight);
  const openArticle = useAppStore((s) => s.openArticle);
  const rail = useRef<InfiniteRailHandle>(null);

  // startHubAuto (line 1890): a 5 s interval that glides one card forward unless the tab is hidden or an overlay is open.
  // The interval is never reset by a manual swipe (the source does not reset it either).
  const paused = !focused || !!screen || !!hubLight || !!sheet;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  useEffect(() => {
    const id = setInterval(() => { if (!pausedRef.current) rail.current?.advance(); }, dur.hubAuto);
    return () => clearInterval(id);
  }, []);

  const tile = (width - 40 - 3 * 8) / 4;
  const lights = visibleLights(hubGroup);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 24, paddingTop: insets.top + 24, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
      <View style={{ gap: 6, paddingHorizontal: 20 }}>
        <Sans size={38} lh={42} weight={600} ls={-1.2} color={color.ink}>{HUB_COPY.title}</Sans>
        <Mono size={11} ls={1.4} color={color.ink4}>{hubHeadline()}</Mono>
      </View>

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 20 }}>
          <Mono size={10} ls={1.8} color={color.ink4}>{HUB_COPY.featured}</Mono>
          <Mono size={10} ls={1.8} color={color.ink4}>{hubCounter(hubIdx)}</Mono>
        </View>
        <InfiniteRail
          ref={rail}
          testID="hub-rail"
          count={ARTICLES.length}
          index={hubIdx}
          onIndexChange={setHubIdx}
          keyFor={(i) => ARTICLES[i].id}
          renderItem={(i) => <ArticleCard article={ARTICLES[i]} onPress={() => openArticle(ARTICLES[i].id)} />}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20 }} testID="hub-dots">
          {ARTICLES.map((a, i) => <Dot key={a.id} active={i === hubIdx} onPress={() => rail.current?.scrollTo(i, true)} />)}
        </View>
      </View>

      <View style={{ gap: 12, paddingHorizontal: 20 }}>
        <View style={{ gap: 5 }}>
          <Mono size={10} ls={1.8} color={color.ink4}>{HUB_COPY.lights}</Mono>
          <Sans size={13} lh={19} color={color.ink5}>{HUB_COPY.lightsSub}</Sans>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
          {GROUPS.map((k) => {
            const g = groupChip(k, hubGroup);
            return (
              <Pressable key={k} accessibilityRole="button" accessibilityLabel={g.label} accessibilityState={{ selected: g.on }} onPress={() => setHubGroup(k)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12, backgroundColor: g.bg, borderWidth: 1, borderColor: g.edge }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: g.dot }} />
                <Mono size={9} ls={1.2} color={g.fg}>{g.label}</Mono>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {lights.map((l) => (
            <Pressable key={l.id} accessibilityRole="button" accessibilityLabel={l.name} onPress={() => openLight(l.id)} testID={`light-${l.id}`}
              style={{ width: tile, aspectRatio: 1, borderRadius: 14, backgroundColor: color.sunken, borderWidth: 1, borderColor: hubLight === l.id ? color.hair20 : 'transparent', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 6 }}>
              <View style={{ height: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                {l.icon ? <Icon name={l.icon} size={23} color={l.tone} /> : null}
                {l.glyph ? <Mono size={13} weight={500} ls={0.4} color={l.tone}>{l.glyph}</Mono> : null}
              </View>
              <Sans size={9.5} lh={12} color={color.ink3} center>{l.short}</Sans>
            </Pressable>
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, backgroundColor: color.sunken, paddingVertical: 13, paddingHorizontal: 15 }}>
          <Icon name="information-line" size={16} color={color.blueDeep} />
          <Sans size={12} lh={18} color={color.ink2} style={{ flex: 1 }}>{HUB_COPY.note}</Sans>
        </View>
      </View>
    </ScrollView>
  );
}

// dots (line 669): 2 px tall, r1; active 22 px #17161A, inactive 6 px #dcdbd8; width/background .3s ease
function Dot({ active, onPress }: { active: boolean; onPress: () => void }) {
  const a = useSharedValue(active ? 1 : 0);
  useEffect(() => { a.value = withTiming(active ? 1 : 0, { duration: dur.color, easing: bez(ease.css) }); }, [active, a]);
  const style = useAnimatedStyle(() => ({ width: 6 + 16 * a.value }));
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <Animated.View style={[{ height: 2, borderRadius: 1, backgroundColor: active ? color.ink : color.handle }, style]} />
    </Pressable>
  );
}
```

- [ ] **Step 3: `src/screens/hub/LightSheet.tsx`** (lines 897–922; vals 1938–1946)

```tsx
import { Pressable, View } from 'react-native';
import { BADGE, HUB_COPY, lightById } from '../../lib/hub';
import { useAppStore } from '../../store/useAppStore';
import { color } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { SheetShell } from '../../ui/Sheet';
import { StatusChip } from '../../ui/StatusChip';
import { Mono, Sans } from '../../ui/Txt';

export function LightSheet() {
  const hubLight = useAppStore((s) => s.hubLight);
  const closeLight = useAppStore((s) => s.closeLight);
  const l = lightById(hubLight);
  if (!l) return null;
  const [badge, badgeBg, badgeFg] = BADGE[l.group];
  return (
    <SheetShell onClose={closeLight} handleMargin={6} paddingBottom={26} gap={14} testID="sheet-light">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
        <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: color.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          {l.icon ? <Icon name={l.icon} size={27} color={l.tone} /> : null}
          {l.glyph ? <Mono size={15} weight={500} color={l.tone}>{l.glyph}</Mono> : null}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Sans size={19} weight={600} ls={-0.4} color={color.ink}>{l.name}</Sans>
          <View style={{ alignSelf: 'flex-start' }}>
            <StatusChip bg={badgeBg} fg={badgeFg} label={badge} ls={1.3} padX={9} padY={4} />
          </View>
        </View>
      </View>
      <Sans size={14} lh={21} color={color.ink2}>{l.means}</Sans>
      <View style={{ gap: 9, borderRadius: 14, backgroundColor: color.sunken, paddingVertical: 14, paddingHorizontal: 15 }}>
        <Mono size={9} ls={1.3} color={color.ink3}>{HUB_COPY.whatToDo}</Mono>
        <Sans size={13.5} lh={20} color={color.ink}>{l.action}</Sans>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={HUB_COPY.gotIt} onPress={closeLight}
        style={{ height: 50, borderRadius: 999, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' }}>
        <Sans size={14} weight={500} color={color.textOnDark}>{HUB_COPY.gotIt}</Sans>
      </Pressable>
    </SheetShell>
  );
}
```

- [ ] **Step 4: `app/(tabs)/hub.tsx`** — replace the whole file

```tsx
import { HubScreen } from '../../src/screens/hub/HubScreen';
export default function HubRoute() { return <HubScreen />; }
```

- [ ] **Step 5: Tests** `src/screens/hub/__tests__/hub.test.tsx`

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { FlatList } from 'react-native';
import { HubScreen } from '../HubScreen';
import { LightSheet } from '../LightSheet';
import { resetAppStore, useAppStore } from '../../../store/useAppStore';

const s = () => useAppStore.getState();
beforeEach(() => { resetAppStore(); jest.clearAllMocks(); });

describe('HubScreen', () => {
  it('renders the title, headline, featured rail, counter, groups and all twenty lights', () => {
    const { getByText, getAllByText, getByLabelText, getByTestId } = render(<HubScreen />);
    expect(getByText('Hub')).toBeTruthy();
    expect(getByText('4 ARTICLES · 20 DASHBOARD LIGHTS')).toBeTruthy();
    expect(getByText('FEATURED READING')).toBeTruthy();
    expect(getByText('01 / 04')).toBeTruthy();
    expect(getAllByText('What actually happens after a recall is issued')).toHaveLength(3);   // tripled rail
    expect(getAllByText('RECALL BASICS')).toHaveLength(3);
    expect(getByLabelText('ALL').props.accessibilityState).toEqual({ selected: true });
    expect(getByText('STOP NOW')).toBeTruthy();
    expect(getByTestId('light-l1')).toBeTruthy();
    expect(getByTestId('light-l20')).toBeTruthy();
    expect(getByText('ABS')).toBeTruthy();
    expect(getByText('Oil pressure')).toBeTruthy();
    expect(getByText("Symbols vary by manufacturer. Your owner's manual is the final word for your vehicle.")).toBeTruthy();
  });
  it('group chips filter the grid', () => {
    const { getByLabelText, queryByTestId, getByTestId } = render(<HubScreen />);
    fireEvent.press(getByLabelText('STOP NOW'));
    expect(s().hubGroup).toBe('critical');
    expect(getByTestId('light-l1')).toBeTruthy();
    expect(queryByTestId('light-l8')).toBeNull();
    fireEvent.press(getByLabelText('STATUS'));
    expect(getByTestId('light-l17')).toBeTruthy();
    expect(queryByTestId('light-l1')).toBeNull();
  });
  it('tapping a light opens the light sheet; tapping a card opens the article', () => {
    const { getByTestId, getAllByTestId } = render(<HubScreen />);
    fireEvent.press(getByTestId('light-l8'));
    expect(s().hubLight).toBe('l8');
    fireEvent.press(getAllByTestId('article-a2')[0]);
    expect(s()).toMatchObject({ screen: 'article', article: 'a2' });
  });
  it('auto-advances every 5 s while nothing is open, and pauses while the light sheet is open', () => {
    jest.useFakeTimers();
    const spy = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation(() => {});
    render(<HubScreen />);
    jest.advanceTimersByTime(5000);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith({ offset: 5 * 332, animated: true });
    useAppStore.getState().openLight('l1');
    jest.advanceTimersByTime(5000);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
    jest.useRealTimers();
  });
});

describe('LightSheet', () => {
  it('renders the light with its badge, means, action and closes on Got it', () => {
    s().openLight('l1');
    const { getByText, getByLabelText } = render(<LightSheet />);
    expect(getByText('Engine oil pressure')).toBeTruthy();
    expect(getByText('STOP DRIVING')).toBeTruthy();
    expect(getByText(/Oil pressure has dropped below the safe minimum/)).toBeTruthy();
    expect(getByText('WHAT TO DO')).toBeTruthy();
    expect(getByText(/Pull over as soon as it is safe/)).toBeTruthy();
    fireEvent.press(getByLabelText('Got it'));
    expect(s().hubLight).toBeNull();
  });
  it('shows the warning and status badges, and the ABS glyph', () => {
    s().openLight('l8');
    const { getByText, rerender } = render(<LightSheet />);
    expect(getByText('ABS')).toBeTruthy();
    expect(getByText('GET IT CHECKED')).toBeTruthy();
    s().openLight('l17');
    rerender(<LightSheet />);
    expect(getByText('Cruise control')).toBeTruthy();
    expect(getByText('STATUS ONLY')).toBeTruthy();
  });
  it('renders nothing when no light is selected', () => {
    expect(render(<LightSheet />).toJSON()).toBeNull();
  });
});
```

- [ ] **Step 6: Gate** — `npm test -- hub`, then `npm test && npm run typecheck`. If the auto-advance test's first `scrollToOffset` call count differs because `onContentSizeChange` fires in the test renderer, assert on the `advance` call only (`toHaveBeenLastCalledWith`) and say so in the report. Report.

**Checkpoint commit message (controller):** `feat: Hub tab — auto-advancing article rail, dashboard lights, light sheet`
