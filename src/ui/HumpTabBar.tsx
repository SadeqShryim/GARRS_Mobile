import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { TABS, type TabDef } from '../fixtures/tabs';
import type { TabId } from '../fixtures/types';
import { useAppStore } from '../store/useAppStore';
import { bez, color, dur, ease, layout } from '../theme/tokens';
import { Icon } from './Icon';

export const HUMP_PATH = 'M6.7,45.5c5.7,0.1,14.1-0.4,23.3-4c5.7-2.3,9.9-5,18.1-10.5c10.7-7.1,11.8-9.2,20.6-14.3c5-2.9,9.2-5.2,15.2-7 c7.1-2.1,13.3-2.3,17.6-2.1c4.2-0.2,10.5,0.1,17.6,2.1c6.1,1.8,10.2,4.1,15.2,7c8.8,5,9.9,7.1,20.6,14.3c8.3,5.5,12.4,8.2,18.1,10.5 c9.2,3.6,17.6,4.2,23.3,4H6.7z';

export const humpXFor = (itemLeft: number, itemWidth: number) => itemLeft - (layout.humpW - itemWidth) / 2;

type Box = { x: number; width: number };

export function HumpTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const activeId = state.routes[state.index].name as TabId;
  const switchTab = useAppStore((s) => s.switchTab);
  const [boxes, setBoxes] = useState<Partial<Record<TabId, Box>>>({});
  const humpX = useSharedValue(0);
  const active = boxes[activeId];

  useEffect(() => {
    if (active) humpX.value = withTiming(humpXFor(active.x, active.width), { duration: dur.hump, easing: bez(ease.hump) });
  }, [active?.x, active?.width, activeId, humpX]);
  const humpStyle = useAnimatedStyle(() => ({ transform: [{ translateX: humpX.value }] }));

  return (
    <View style={{ backgroundColor: color.surface, paddingBottom: insets.bottom }}>
      <View style={styles.dark}>
        <View style={styles.menu}>
          <Animated.View pointerEvents="none" style={[styles.hump, humpStyle]}>
            <Svg width={layout.humpW} height={layout.humpH} viewBox="0 0 202.9 45.5" preserveAspectRatio="none">
              <Path d={HUMP_PATH} fill={color.bar} />
            </Svg>
          </Animated.View>
          {TABS.map((t) => (
            <TabItem
              key={t.id}
              tab={t}
              on={t.id === activeId}
              onLayout={(e) => { const { x, width } = e.nativeEvent.layout; setBoxes((b) => ({ ...b, [t.id]: { x, width } })); }}
              onPress={() => { switchTab(t.id); navigation.navigate(t.id, t.id === 'garage' || t.id === 'recalls' ? { screen: 'index' } : undefined); }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function TabItem({ tab, on, onLayout, onPress }: { tab: TabDef; on: boolean; onLayout: (e: LayoutChangeEvent) => void; onPress: () => void }) {
  const lift = useSharedValue(on ? 1 : 0);
  const tone = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    lift.value = withTiming(on ? 1 : 0, { duration: dur.hump, easing: bez(ease.hump) });
    tone.value = withTiming(on ? 1 : 0, { duration: dur.color, easing: Easing.inOut(Easing.ease) });
  }, [on, lift, tone]);
  const liftStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -6 * lift.value }] }));
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: lift.value }] }));
  const onStyle = useAnimatedStyle(() => ({ opacity: tone.value }));
  const offStyle = useAnimatedStyle(() => ({ opacity: 0.62 * (1 - tone.value) }));
  return (
    <Pressable accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{ selected: on }} onLayout={onLayout} onPress={onPress} style={styles.item}>
      <Animated.View style={[styles.center, liftStyle]}>
        <Animated.View style={[styles.circle, popStyle]} />
        <Animated.View style={[styles.glyph, offStyle]}><Icon name={tab.off} size={15} color="#FFFFFF" /></Animated.View>
        <Animated.View style={[styles.glyph, onStyle]}><Icon name={tab.on} size={15} color={color.bar} /></Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dark: { backgroundColor: color.bar, paddingBottom: 6, borderTopLeftRadius: 11, borderTopRightRadius: 11, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  menu: { flexDirection: 'row', paddingHorizontal: 8, backgroundColor: color.bar, borderTopLeftRadius: 11, borderTopRightRadius: 11 },
  hump: { position: 'absolute', left: 0, bottom: 27, width: layout.humpW, height: layout.humpH },
  item: { flex: 1, height: 28, zIndex: 1 },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  circle: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFFFFF' },
  glyph: { position: 'absolute', width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
});
