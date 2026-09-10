// Splash.dc.html — the `blobOp` layer: four blurred radial blobs drifting on sp-blob1 / sp-blob2, under rgba(8,8,10,.42).
// The blur is baked into blob-N.png with a 180 px bleed (scripts/bake-assets.mjs); positions are the CSS offsets resolved
// against the window; the drift transforms about each box's centre (CSS transform-origin default).
import { useEffect } from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import { bez, ease } from '../../theme/tokens';
import { DUR } from './timeline';

const BLEED = 180;
type Spec = { src: number; w: number; h: number; left?: number; right?: number; top?: number; bottom?: number; drift: 1 | 2; period: number };
const BLOBS: Spec[] = [
  { src: require('../../assets/images/blob-1.png'), w: 420, h: 300, left: -120, bottom: 120, drift: 1, period: DUR.blobDrift[0] },
  { src: require('../../assets/images/blob-2.png'), w: 340, h: 300, right: -100, top: 60, drift: 2, period: DUR.blobDrift[1] },
  { src: require('../../assets/images/blob-3.png'), w: 300, h: 280, right: -70, bottom: 60, drift: 1, period: DUR.blobDrift[2] },
  { src: require('../../assets/images/blob-4.png'), w: 300, h: 240, left: 40, top: -60, drift: 2, period: DUR.blobDrift[3] },
];
// sp-blob1: 50% translate(-26px,22px) scale(1.08); sp-blob2: 50% translate(24px,-20px) scale(1.06); ease-in-out per keyframe, infinite.
const DRIFT = { 1: { x: -26, y: 22, s: 1.08 }, 2: { x: 24, y: -20, s: 1.06 } } as const;

export function Blobs({ opacity }: { opacity: SharedValue<number> }) {
  const { width, height } = useWindowDimensions();
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View pointerEvents="none" testID="blobs" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }, style]}>
      {BLOBS.map((spec, i) => <Blob key={i} index={i + 1} spec={spec} width={width} height={height} />)}
      <View testID="blob-scrim" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8,8,10,0.42)' }]} />
    </Animated.View>
  );
}

function Blob({ index, spec, width, height }: { index: number; spec: Spec; width: number; height: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    const half = { duration: spec.period / 2, easing: bez(ease.inOut) };
    p.value = withRepeat(withSequence(withTiming(1, half), withTiming(0, half)), -1, false);
  }, [p, spec.period]);
  const d = DRIFT[spec.drift];
  const a = useAnimatedStyle(() => ({
    transform: [{ translateX: d.x * p.value }, { translateY: d.y * p.value }, { scale: 1 + (d.s - 1) * p.value }],
  }));
  const left = spec.left !== undefined ? spec.left : width - (spec.right ?? 0) - spec.w;
  const top = spec.top !== undefined ? spec.top : height - (spec.bottom ?? 0) - spec.h;
  return (
    <Animated.View testID={`blob-${index}`} style={[{ position: 'absolute', left, top, width: spec.w, height: spec.h }, a]}>
      <Image source={spec.src} style={{ position: 'absolute', left: -BLEED, top: -BLEED, width: spec.w + 2 * BLEED, height: spec.h + 2 * BLEED }} />
    </Animated.View>
  );
}
