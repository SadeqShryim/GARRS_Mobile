// The tab bar, redesigned on the user's direction (2026-09-18) away from the handoff's dark hump bar: a floating capsule of
// Apple Liquid Glass that the page scrolls beneath, the selected tab marked by a liquid-metal disc (the Add Vehicle button's
// rotating chrome ramp around a graphite face). iOS 26 renders real Liquid Glass (expo-glass-effect, `regular` — the page
// shows through, frosted enough that busy content under the bar does not fight the icons; `clear` showed it raw); Android and
// older iOS get the same capsule as expo-blur over the app's blur target with a faint white tint and a hairline.
//
// It is mounted by the root layout beside the overlays, not by the tab navigator (whose own bar is disabled): on Android a
// BlurView inside the target it blurs makes the render tree reference itself and Expo Go dies in the RenderThread
// (libhwui prepareTree recursing until the stack overflows — reproduced on the emulator), so like the sheets it sits outside
// the BlurTargetView. Which tab is active comes from the router's segments; presses go through the router, which pops a
// tab's stack back to its index the way the navigator's `{ screen: 'index' }` did. Stacking is by source order only —
// `zIndex` escapes to the root stacking context on iOS (Fabric) and paints over overlays.
import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, type SharedValue, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TABS, type TabDef } from '../fixtures/tabs';
import type { TabId } from '../fixtures/types';
import { cssAngleToPoints } from '../lib/gradient';
import { useAppBlurTarget } from '../overlays/blurTarget';
import { useAppStore } from '../store/useAppStore';
import { bez, color, dur, ease } from '../theme/tokens';
import { Icon } from './Icon';

export const BAR = { height: 62, side: 20, disc: 46, item: 46 } as const;
const RADIUS = BAR.height / 2;
const RAMP = require('../assets/images/metal-default.png');
const RAMP_SIZE = BAR.disc * 2.4;                                 // the bake's sweep, sized as MetalButton sizes it
const FACE = ['#9AA6B2', '#3B434C', '#14181D'] as const;          // graphite, lit from the top-left, inside the chrome bezel
const FACE_SHADOW = 'inset 0 1px 1px rgba(255,255,255,0.45), inset 0 -2px 3px rgba(0,0,0,0.55)';
const DISC_SHADOW = '0 0 0 1px rgba(0,0,0,0.35), 0 6px 12px rgba(0,0,0,0.28), 0 1px 2px rgba(0,0,0,0.3)';
const CAPSULE_SHADOW = '0 10px 24px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08)';
const FALLBACK_SHADOW = 'inset 0 1px 1px rgba(255,255,255,0.75), inset 0 0 0 1px rgba(0,0,0,0.07)';
const ICON_SHADOW = { textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 } as const;
const ROUTE = { garage: '/(tabs)/garage', recalls: '/(tabs)/recalls', service: '/(tabs)/service', hub: '/(tabs)/hub', profile: '/(tabs)/profile' } as const;

// Where the disc's left edge sits to centre it on an item.
export const discXFor = (itemLeft: number, itemWidth: number) => itemLeft + (itemWidth - BAR.disc) / 2;

// Real Liquid Glass: iOS 26 with the API present (some 26 betas lack it and crash on use).
export const liquidGlass = () => Platform.OS === 'ios' && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();

// The capsule sits on the phone's base, over the home indicator / gesture area (the system draws those in contrast); only an
// opaque three-button Android nav bar — an inset of 40 dp or more — pushes it up by its height.
export const barBottom = (inset: number) => (inset >= 40 ? inset : 0);

// What a tab screen leaves under its content so the last item scrolls clear of the floating bar.
export function useTabBarClearance() {
  const insets = useSafeAreaInsets();
  return barBottom(insets.bottom) + BAR.height + 14;
}

// The tab the router is on, or none outside the tab group (the root redirect, the not-found page).
export function useActiveTab(): TabId | undefined {
  const segments: string[] = useSegments();
  if (segments[0] !== '(tabs)') return undefined;
  return TABS.find((t) => t.id === segments[1])?.id;
}

type Box = { x: number; width: number };

export function GlassTabBar() {
  const activeId = useActiveTab();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const switchTab = useAppStore((s) => s.switchTab);
  const target = useAppBlurTarget();
  const [boxes, setBoxes] = useState<Partial<Record<TabId, Box>>>({});
  const discX = useSharedValue(0);
  const active = activeId ? boxes[activeId] : undefined;

  useEffect(() => {
    if (active) discX.value = withTiming(discXFor(active.x, active.width), { duration: dur.hump, easing: bez(ease.hump) });
  }, [active?.x, active?.width, activeId, discX]);

  if (!activeId) return null;
  return (
    <View pointerEvents="box-none" style={styles.root} testID="tab-bar">
      <View style={[styles.capsule, { marginBottom: barBottom(insets.bottom) }]}>
        {liquidGlass() ? (
          <GlassView glassEffectStyle="regular" style={styles.glass} testID="glass" />
        ) : (
          <View style={styles.fallback} testID="glass-fallback">
            <BlurView intensity={40} tint="light" blurMethod="dimezisBlurViewSdk31Plus" blurTarget={target} style={StyleSheet.absoluteFill} />
          </View>
        )}
        <View style={styles.menu}>
          <MetalDisc x={discX} />
          {TABS.map((t) => (
            <TabItem
              key={t.id}
              tab={t}
              on={t.id === activeId}
              onLayout={(e) => { const { x, width } = e.nativeEvent.layout; setBoxes((b) => ({ ...b, [t.id]: { x, width } })); }}
              onPress={() => { switchTab(t.id); router.navigate(ROUTE[t.id]); }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

// The selected tab's liquid metal: the chrome ramp spinning on the idle loop behind a 2 px bezel, as on the metal buttons.
function MetalDisc({ x }: { x: SharedValue<number> }) {
  const rot = useSharedValue(0);
  useEffect(() => { rot.value = withRepeat(withTiming(360, { duration: dur.metalIdle, easing: Easing.linear }), -1, false); }, [rot]);
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  const pts = cssAngleToPoints(160, BAR.disc - 4, BAR.disc - 4);
  return (
    <Animated.View pointerEvents="none" testID="disc" style={[styles.disc, slide]}>
      <View style={styles.discClip}>
        <Animated.Image source={RAMP} style={[styles.ramp, spin]} />
        <View style={styles.face}>
          <LinearGradient colors={[...FACE]} locations={[0, 0.55, 1]} start={pts.start} end={pts.end} style={StyleSheet.absoluteFill} />
        </View>
      </View>
    </Animated.View>
  );
}

function TabItem({ tab, on, onLayout, onPress }: { tab: TabDef; on: boolean; onLayout: (e: LayoutChangeEvent) => void; onPress: () => void }) {
  const tone = useSharedValue(on ? 1 : 0);
  useEffect(() => { tone.value = withTiming(on ? 1 : 0, { duration: dur.color, easing: Easing.inOut(Easing.ease) }); }, [on, tone]);
  const onStyle = useAnimatedStyle(() => ({ opacity: tone.value }));
  const offStyle = useAnimatedStyle(() => ({ opacity: 0.6 * (1 - tone.value) }));
  return (
    <Pressable accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{ selected: on }} onLayout={onLayout} onPress={onPress} style={styles.item}>
      <Animated.View style={[styles.glyph, offStyle]}><Icon name={tab.off} size={17} color={color.ink} /></Animated.View>
      <Animated.View style={[styles.glyph, onStyle]}><Icon name={tab.on} size={17} color="#FFFFFF" style={ICON_SHADOW} /></Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  capsule: { marginHorizontal: BAR.side, height: BAR.height, borderRadius: RADIUS, boxShadow: CAPSULE_SHADOW },
  glass: { ...StyleSheet.absoluteFill, borderRadius: RADIUS },
  fallback: { ...StyleSheet.absoluteFill, borderRadius: RADIUS, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.30)', boxShadow: FALLBACK_SHADOW },
  menu: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  item: { flex: 1, height: BAR.item, alignItems: 'center', justifyContent: 'center' },
  glyph: { position: 'absolute', width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  disc: { position: 'absolute', left: 0, top: (BAR.height - BAR.disc) / 2, width: BAR.disc, height: BAR.disc, borderRadius: BAR.disc / 2, boxShadow: DISC_SHADOW },
  discClip: { ...StyleSheet.absoluteFill, borderRadius: BAR.disc / 2, overflow: 'hidden' },
  ramp: { position: 'absolute', left: BAR.disc / 2 - RAMP_SIZE / 2, top: BAR.disc / 2 - RAMP_SIZE / 2, width: RAMP_SIZE, height: RAMP_SIZE },
  face: { position: 'absolute', left: 2, right: 2, top: 2, bottom: 2, borderRadius: BAR.disc / 2, overflow: 'hidden', boxShadow: FACE_SHADOW },
});
