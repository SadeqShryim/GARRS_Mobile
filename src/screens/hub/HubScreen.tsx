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
