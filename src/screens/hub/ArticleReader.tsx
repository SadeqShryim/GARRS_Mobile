import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, runOnJS, type SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Article } from '../../fixtures/types';
import { articleById, articleIndex, HUB_COPY, neighbour, nextTitle } from '../../lib/hub';
import { useAppStore } from '../../store/useAppStore';
import { color, dur } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { Mono, Sans } from '../../ui/Txt';
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
