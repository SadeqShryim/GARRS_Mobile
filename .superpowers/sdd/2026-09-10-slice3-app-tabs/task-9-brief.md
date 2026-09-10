# Task 9 brief — Slice 3 (app tabs)

Extracted verbatim from `docs/superpowers/plans/2026-09-10-slice3-app-tabs.md`. The spec `docs/superpowers/specs/2026-09-10-slice3-app-tabs-design.md` (§8 Article reader) is the binding authority; the source of truth is `design_handoff_recall_hub/design/GaragePrototype.dc.html` lines 924–971 (markup) and 1950–2086 (logic: `goArticle`, `playArticleSwipe`, `articlePanel`, `onArtDown/Move/Up`, `articlePeek`, `articleLeaver`, `articleVals`). References: `docs/reference/app-article-*.png`, `app-geometry.json` (`article`).

## Rules for this task
- Work in `C:\GarrsMobile`. **Do not run git. Do not install packages. Do not download anything.**
- Transcribe the code in this brief exactly. Deviate only when something does not compile or pass, keep the deviation minimal, and state exactly what you changed and why in the report.
- Only create the files listed under **Files**. Other tasks are editing other screens at the same time; if the full-tree gate fails inside a file that is not yours, say so in the report and do not touch it.
- Gate: run your own suite first (`npm test -- ArticleReader`), then the full `npm test && npm run typecheck` before reporting.
- Environment: Windows 11 x64, Node 24, Expo SDK 57, RN 0.86 (`boxShadow` is a real style prop), Reanimated 4.5 (`runOnJS` is exported), react-native-gesture-handler 2.32 (its `jestSetup` is loaded globally; `react-native-gesture-handler/jest-utils` provides `fireGestureHandler`/`getByGestureTestId`), jest-expo 57, TypeScript 6 strict. Already present from Tasks 1–4: `ARTICLES`, `src/lib/hub.ts` (`articleById`, `articleIndex`, `neighbour`, `nextTitle`, `HUB_COPY`), `cssAngleToPoints` (`src/lib/gradient.ts`), store actions (`setArticle`, `setHubIdx`, `closeArticle`), `Icon`, `Sans`/`Mono`, tokens (`dur.swipe/snap/leave`, `color.hair12/ink7/ink8`).
- Report: write `.superpowers/sdd/2026-09-10-slice3-app-tabs/task-9-report.md` with: **Status** (DONE / DONE_WITH_CONCERNS / BLOCKED), files created, the test and typecheck output summary (numbers), deviations, deferred steps, concerns.

---

### Task 9: Article reader — live panel, peek panels, leaver, swipe

**Files:**
- Create: `src/screens/hub/ArticlePanel.tsx`, `src/screens/hub/ArticleReader.tsx`, `src/screens/hub/__tests__/ArticleReader.test.tsx`

**Interfaces:** `ArticleReader` (no props; Task 12 mounts it while `screen === 'article'`), `ArticlePeek { article }`, `Wash { article }`.

**Motion (all `cubic-bezier(.22,1,.36,1)`):** entrance from the hub `translateY(H) → 0` (dir 0) or `translateX(±W) → 0` (dir ±1), 360 ms; the leaving panel `translateX 0 → ∓22 %·W`, opacity 1 → 0, 360 ms, unmounted after 380 ms; drag = the live panel follows `dx` while the neighbour peeks in at `±W + dx`; release `|dx| > 70` → go, else snap back over 300 ms. Drags are ignored while a leaver is animating.

- [ ] **Step 1: `src/screens/hub/ArticlePanel.tsx`** (`articlePanel`, line 1979 — the simplified, non-interactive panel used for peeks and the leaver; `Wash` is the 150 px header shared with the live panel)

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Article } from '../../fixtures/types';
import { cssAngleToPoints } from '../../lib/gradient';
import { color } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { Mono, Sans } from '../../ui/Txt';

export function Wash({ article: a }: { article: Article }) {
  const { width } = useWindowDimensions();
  const pts = cssAngleToPoints(135, width - 40, 150);
  return (
    <LinearGradient colors={a.wash} start={pts.start} end={pts.end} style={{ height: 150, borderRadius: 18, alignItems: 'flex-end', justifyContent: 'flex-end', padding: 16 }}>
      <Icon name={a.icon} size={56} color="rgba(255,255,255,0.85)" />
    </LinearGradient>
  );
}

export function ArticlePeek({ article: a, testID }: { article: Article; testID?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View testID={testID} style={[StyleSheet.absoluteFill, { backgroundColor: color.surface }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: 8 }}>
        <View style={{ width: 38, height: 38, marginLeft: -9, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close-line" size={23} color={color.ink} />
        </View>
        <Mono size={10} ls={1.8} color={color.ink3}>{a.kicker}</Mono>
      </View>
      <View style={{ flex: 1, overflow: 'hidden', gap: 18, paddingTop: 8, paddingHorizontal: 20, paddingBottom: 32 }}>
        <Wash article={a} />
        <Sans size={30} lh={35} weight={600} ls={-1.1} color={color.ink}>{a.title}</Sans>
        <Sans size={15} lh={24} color={color.ink2}>{a.body[0].text}</Sans>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: `src/screens/hub/ArticleReader.tsx`** (lines 924–971; logic 1950–2086)

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, runOnJS, type SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Article } from '../../fixtures/types';
import { articleById, articleIndex, HUB_COPY, neighbour, nextTitle } from '../../lib/hub';
import { useAppStore } from '../../store/useAppStore';
import { color, dur } from '../../theme/tokens';
import { ArticlePeek, Wash } from './ArticlePanel';

type Dir = -1 | 0 | 1;
const EASE = Easing.bezier(0.22, 1, 0.36, 1);   // cubic-bezier(.22,1,.36,1) — precomputed so worklets can capture it
const SWIPE = 70;                                // release threshold (onArtUp)

export function ArticleReader() {
  const { width: W, height: H } = useWindowDimensions();
  const article = useAppStore((s) => s.article);
  const setArticle = useAppStore((s) => s.setArticle);
  const setHubIdx = useAppStore((s) => s.setHubIdx);
  const closeArticle = useAppStore((s) => s.closeArticle);
  const [leaving, setLeaving] = useState<Article | null>(null);
  const [dir, setDir] = useState<Dir>(0);
  const drag = useSharedValue(0);
  const busy = useSharedValue(false);            // a leaver is animating → drags are ignored (line 2003)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const a = articleById(article);

  // goArticle (line 1950): the current article becomes the leaver, the neighbour enters from `dir`, the hub rail follows.
  const go = useCallback((d: 1 | -1) => {
    if (!a || busy.value) return;
    const next = neighbour(a.id, d);
    busy.value = true;
    drag.value = 0;
    setLeaving(a);
    setDir(d);
    setArticle(next.id);
    setHubIdx(articleIndex(next.id));
    clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => { busy.value = false; setLeaving(null); }, dur.leave);
  }, [a, busy, drag, setArticle, setHubIdx]);
  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  const goNext = useCallback(() => go(1), [go]);
  const goPrev = useCallback(() => go(-1), [go]);

  // onArtDown/Move/Up (lines 2002–2022): live once |dx| ≥ 8 with |dx| ≥ |dy|; release beyond 70 px changes article, else snaps back.
  const pan = Gesture.Pan()
    .withTestId('article-pan')
    .activeOffsetX([-8, 8])
    .failOffsetY([-8, 8])
    .onUpdate((e) => { if (!busy.value) drag.value = e.translationX; })
    .onEnd(() => {
      if (busy.value) return;
      const dx = drag.value;
      if (Math.abs(dx) > SWIPE) runOnJS(dx < 0 ? goNext : goPrev)();
      else drag.value = withTiming(0, { duration: dur.snap, easing: EASE });
    });

  const nextStyle = useAnimatedStyle(() => ({ transform: [{ translateX: W + drag.value }] }));
  const prevStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -W + drag.value }] }));

  if (!a) return null;
  const nextA = neighbour(a.id, 1);
  const prevA = neighbour(a.id, -1);
  return (
    <View style={StyleSheet.absoluteFill} testID="article-reader">
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, prevStyle]}><ArticlePeek article={prevA} testID="article-peek-prev" /></Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, nextStyle]}><ArticlePeek article={nextA} testID="article-peek-next" /></Animated.View>
      {leaving && <Leaver key={'leave-' + leaving.id} article={leaving} dir={dir} W={W} />}
      <GestureDetector gesture={pan}>
        <LivePanel key={a.id} article={a} dir={dir} W={W} H={H} drag={drag} onClose={closeArticle} onNext={goNext} onPrev={goPrev} />
      </GestureDetector>
    </View>
  );
}

// articleLeaver + playArticleSwipe's `out` animation: translateX(0) → ∓22 %, opacity 1 → 0, 360 ms, fill forwards.
function Leaver({ article, dir, W }: { article: Article; dir: Dir; W: number }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withTiming(1, { duration: dur.swipe, easing: EASE }); }, [p]);
  const style = useAnimatedStyle(() => ({ opacity: 1 - p.value, transform: [{ translateX: -dir * 0.22 * W * p.value }] }));
  return (
    <Animated.View pointerEvents="none" testID="article-leaver" style={[StyleSheet.absoluteFill, style]}>
      <ArticlePeek article={article} />
    </Animated.View>
  );
}

// The live panel (lines 926–970) — keyed by article id so every article change replays the entrance (playArticleSwipe).
function LivePanel({ article: a, dir, W, H, drag, onClose, onNext, onPrev }:
  { article: Article; dir: Dir; W: number; H: number; drag: SharedValue<number>; onClose: () => void; onNext: () => void; onPrev: () => void }) {
  const insets = useSafeAreaInsets();
  const enter = useSharedValue(1);
  useEffect(() => { enter.value = withTiming(0, { duration: dur.swipe, easing: EASE }); }, [enter]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: drag.value + (dir === 0 ? 0 : dir * W * enter.value) },
      { translateY: dir === 0 ? H * enter.value : 0 },
    ],
  }));
  return (
    <Animated.View testID="article-live" style={[StyleSheet.absoluteFill, { backgroundColor: color.surface, boxShadow: '0 0 40px rgba(0,0,0,0.18)' }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 }}>
          <Pressable accessibilityLabel="Close" onPress={onClose} style={{ width: 38, height: 38, marginLeft: -9, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close-line" size={23} color={color.ink} />
          </Pressable>
          <Mono size={10} ls={1.8} color={color.ink3}>{a.kicker}</Mono>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Pressable accessibilityLabel="Previous article" onPress={onPrev} style={styles.nav}><Icon name="arrow-left-s-line" size={19} color={color.ink2} /></Pressable>
          <Pressable accessibilityLabel="Next article" onPress={onNext} style={styles.nav}><Icon name="arrow-right-s-line" size={19} color={color.ink2} /></Pressable>
        </View>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 18, paddingTop: 8, paddingHorizontal: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <Wash article={a} />
        <View style={{ gap: 8 }}>
          <Sans size={30} lh={35} weight={600} ls={-1.1} color={color.ink}>{a.title}</Sans>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Mono size={9} ls={1.2} color={color.ink3}>{a.read}</Mono>
            <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: color.ink8 }} />
            <Mono size={9} ls={1.2} color={color.ink3}>{a.date}</Mono>
          </View>
        </View>
        {a.body.map((b, i) => (
          <View key={i} style={{ gap: 6 }}>
            {b.heading ? <Sans size={17} weight={600} ls={-0.3} color={color.ink}>{b.heading}</Sans> : null}
            <Sans size={15} lh={24} color={color.ink2}>{b.text}</Sans>
          </View>
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 2 }}>
          <Icon name="drag-move-2-line" size={15} color={color.ink7} />
          <Mono size={9} ls={1.3} color={color.ink7}>{HUB_COPY.swipeHint}</Mono>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={HUB_COPY.nextArticle} onPress={onNext}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, backgroundColor: color.sunken, paddingVertical: 15, paddingHorizontal: 16 }}>
          <View style={{ flex: 1, gap: 3 }}>
            <Mono size={9} ls={1.3} color={color.ink3}>{HUB_COPY.nextArticle}</Mono>
            <Sans size={14} weight={500} color={color.ink}>{nextTitle(a.id)}</Sans>
          </View>
          <Icon name="arrow-right-line" size={19} color={color.ink4} />
        </Pressable>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  nav: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: color.hair12, alignItems: 'center', justifyContent: 'center' },
});
```
(`Icon`, `Mono`, `Sans` are imported from `../../ui/Icon` and `../../ui/Txt` — add those two imports at the top.)

- [ ] **Step 3: Tests** `src/screens/hub/__tests__/ArticleReader.test.tsx`

```tsx
import { act, fireEvent, render } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import type { PanGesture } from 'react-native-gesture-handler';
import { ArticleReader } from '../ArticleReader';
import { resetAppStore, useAppStore } from '../../../store/useAppStore';

const s = () => useAppStore.getState();
beforeEach(() => { resetAppStore(); jest.useFakeTimers(); s().openArticle('a2'); });
afterEach(() => jest.useRealTimers());

describe('ArticleReader', () => {
  it('renders the live article with kicker, meta, headings, hint and the next card', () => {
    const { getByText, getAllByText, getByLabelText } = render(<ArticleReader />);
    expect(getAllByText('MAINTENANCE').length).toBeGreaterThan(0);
    expect(getAllByText('Oil intervals: why the sticker and the manual disagree').length).toBeGreaterThan(0);
    expect(getByText('3 MIN READ')).toBeTruthy();
    expect(getByText('JAN 2026')).toBeTruthy();
    expect(getByText('Read the manual, not the sticker')).toBeTruthy();
    expect(getByText('SWIPE FOR THE NEXT ARTICLE')).toBeTruthy();
    expect(getByText('NEXT ARTICLE')).toBeTruthy();
    expect(getAllByText('Reading a tyre sidewall in thirty seconds').length).toBeGreaterThan(0);   // next card + peek
    expect(getByLabelText('Next article')).toBeTruthy();
    expect(getByLabelText('Previous article')).toBeTruthy();
  });
  it('mounts both neighbour peeks off-screen', () => {
    const { getByTestId } = render(<ArticleReader />);
    expect(getByTestId('article-peek-prev')).toBeTruthy();
    expect(getByTestId('article-peek-next')).toBeTruthy();
  });
  it('Next/Previous change the article, sync the hub index and show a leaver for 380 ms', () => {
    const { getByLabelText, queryByTestId } = render(<ArticleReader />);
    fireEvent.press(getByLabelText('Next article'));
    expect(s()).toMatchObject({ article: 'a3', hubIdx: 2 });
    expect(queryByTestId('article-leaver')).toBeTruthy();
    act(() => { jest.advanceTimersByTime(400); });
    expect(queryByTestId('article-leaver')).toBeNull();
    fireEvent.press(getByLabelText('Previous article'));
    expect(s()).toMatchObject({ article: 'a2', hubIdx: 1 });
    act(() => { jest.advanceTimersByTime(400); });
    fireEvent.press(getByLabelText('Previous article'));
    expect(s().article).toBe('a1');
    act(() => { jest.advanceTimersByTime(400); });
    fireEvent.press(getByLabelText('Previous article'));
    expect(s().article).toBe('a4');   // wraps
  });
  it('ignores a second change while the leaver is still animating', () => {
    const { getByLabelText } = render(<ArticleReader />);
    fireEvent.press(getByLabelText('Next article'));
    fireEvent.press(getByLabelText('Next article'));
    expect(s().article).toBe('a3');
  });
  it('the NEXT ARTICLE card advances; Close clears the article', () => {
    const { getByLabelText } = render(<ArticleReader />);
    fireEvent.press(getByLabelText('NEXT ARTICLE'));
    expect(s().article).toBe('a3');
    fireEvent.press(getByLabelText('Close'));
    expect(s()).toMatchObject({ screen: null, article: null });
  });
  it('a swipe past 70 px changes the article; a short swipe does not', () => {
    render(<ArticleReader />);
    fireGestureHandler<PanGesture>(getByGestureTestId('article-pan'), [
      { state: State.BEGAN }, { state: State.ACTIVE, translationX: -40 }, { state: State.END, translationX: -40 },
    ]);
    expect(s().article).toBe('a2');
    fireGestureHandler<PanGesture>(getByGestureTestId('article-pan'), [
      { state: State.BEGAN }, { state: State.ACTIVE, translationX: -120 }, { state: State.END, translationX: -120 },
    ]);
    expect(s().article).toBe('a3');
    act(() => { jest.advanceTimersByTime(400); });
    fireGestureHandler<PanGesture>(getByGestureTestId('article-pan'), [
      { state: State.BEGAN }, { state: State.ACTIVE, translationX: 120 }, { state: State.END, translationX: 120 },
    ]);
    expect(s().article).toBe('a2');
  });
  it('renders nothing without an article', () => {
    s().closeArticle();
    expect(render(<ArticleReader />).toJSON()).toBeNull();
  });
});
```

- [ ] **Step 4: Gate** — `npm test -- ArticleReader`, then `npm test && npm run typecheck`. If `fireGestureHandler` cannot drive the worklet callbacks in this jest setup, keep the button-driven tests, drop only the swipe test, and say so in the report (the swipe is verified on the emulator in Task 13). Report.

**Checkpoint commit message (controller):** `feat: article reader with swipe, prev/next and the leaver/peek transitions`
