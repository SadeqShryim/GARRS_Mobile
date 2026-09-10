// Splash.dc.html — the liquid-glass speech bubble: wrapper centred with 26 px side padding; face max-width 322 + padding 24/28,
// r28 with a 9 px bottom-left corner, −72deg glass gradient, three inset shadows + 0 24px 60px outer, a blurred highlight
// ellipse, the copy at 29/34/600/−.7 with a 0 2px 10px text shadow. Pop = @keyframes sp-bub (.62 s, cubic-bezier(.2,.9,.25,1)).
// The backdrop blur/saturate is drawn by Stage.tsx's BubbleBackdrop from the same shared values.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { COPY } from '../../fixtures/splash';
import { cssAngleToPoints } from '../../lib/gradient';
import { bez, ease } from '../../theme/tokens';
import { Sans } from '../../ui/Txt';
import { DUR } from './timeline';

export type BubbleFrame = { x: number; y: number; w: number; h: number };
export type BubbleValues = {
  frame: SharedValue<BubbleFrame>;   // the face's layout frame in window coordinates (no transform)
  pop: SharedValue<number>;          // sp-bub opacity 0 → 1
  ty: SharedValue<number>;           // sp-bub translateY 20 → 0
  scale: SharedValue<number>;        // sp-bub scale .84 → 1.05 → 1
  opacity: SharedValue<number>;      // the wrapper's opacity (1 while `bubble`, → 0 over .55 s on `fade`)
};

export function useBubbleValues(): BubbleValues {
  return { frame: useSharedValue<BubbleFrame>({ x: 0, y: 0, w: 0, h: 0 }), pop: useSharedValue(0), ty: useSharedValue(20), scale: useSharedValue(0.84), opacity: useSharedValue(1) };
}

// @keyframes sp-bub { 0% { opacity 0; translateY(20px) scale(.84) } 58% { opacity 1; translateY(0) scale(1.05) } 100% { scale(1) } }
export function startPop(v: BubbleValues) {
  const seg1 = { duration: DUR.bubblePop * 0.58, easing: bez(ease.bubble) };
  const seg2 = { duration: DUR.bubblePop * 0.42, easing: bez(ease.bubble) };
  v.opacity.value = 1;
  v.pop.value = 0;
  v.ty.value = 20;
  v.scale.value = 0.84;
  v.pop.value = withTiming(1, seg1);
  v.ty.value = withTiming(0, seg1);
  v.scale.value = withSequence(withTiming(1.05, seg1), withTiming(1, seg2));
}

// bubbleOp: 1 → 0, transition opacity .55s ease (phase `fade`).
export function fadeOutBubble(v: BubbleValues) {
  v.opacity.value = withTiming(0, { duration: DUR.bubbleOut, easing: bez(ease.css) });
}

const FILL = ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0.08)'] as const;
// text-wrap: pretty has no RN equivalent. At 430 the copy is one line; at 412 dp it must wrap, and pretty would keep
// "f*cking check?" together. A no-break space before "check?" reproduces both outcomes with the verbatim glyphs.
const PRETTY_COPY = COPY.bubble.replace('f*cking check?', 'f*cking\u00A0check?');
const STOPS = [0, 0.45, 1] as const;

export function Bubble({ v }: { v: BubbleValues }) {
  useEffect(() => { startPop(v); }, [v]);
  const wrap = useAnimatedStyle(() => ({ opacity: v.opacity.value }));
  const face = useAnimatedStyle(() => ({ opacity: v.pop.value, transform: [{ translateY: v.ty.value }, { scale: v.scale.value }] }));
  const [box, setBox] = useState({ w: 360, h: 82 });
  const pts = cssAngleToPoints(-72, box.w, box.h);
  const onLayout = (e: LayoutChangeEvent) => {
    const { x, y, width: w, height: h } = e.nativeEvent.layout;
    setBox({ w, h });
    v.frame.value = { x, y, w, h };
  };
  return (
    <Animated.View pointerEvents="none" testID="bubble" style={[StyleSheet.absoluteFill, styles.wrap, wrap]}>
      <Animated.View testID="bubble-face" onLayout={onLayout} style={[styles.face, face]}>
        <View style={styles.clip}>
          <LinearGradient colors={FILL} locations={STOPS} start={pts.start} end={pts.end} style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.inset]} />
          <View pointerEvents="none" style={styles.highlight}>
            <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <Defs>
                <SvgGradient id="hl" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.34} />
                  <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
                </SvgGradient>
              </Defs>
              <Ellipse cx="50" cy="50" rx="50" ry="50" fill="url(#hl)" />
            </Svg>
          </View>
          <Sans size={29} lh={34} weight={600} ls={-0.7} color="#FFFFFF" style={styles.copy}>{PRETTY_COPY}</Sans>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26 },
  face: { maxWidth: 378, borderRadius: 28, borderBottomLeftRadius: 9, boxShadow: '0 24px 60px rgba(0,0,0,0.5)' },
  clip: { borderRadius: 28, borderBottomLeftRadius: 9, overflow: 'hidden', paddingVertical: 24, paddingHorizontal: 28 },
  inset: { borderRadius: 28, borderBottomLeftRadius: 9, boxShadow: 'inset 0 1.5px 1px rgba(255,255,255,0.42), inset 0 -2px 2px rgba(0,0,0,0.28), inset 0 0 0 1px rgba(255,255,255,0.20)' },
  highlight: { position: 'absolute', left: '6%', right: '34%', top: 2, height: '34%', filter: [{ blur: 6 }] },
  copy: { textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10 },
});
