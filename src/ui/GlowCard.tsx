import { BlurTargetView, BlurView } from 'expo-blur';
import { type ReactNode, useEffect, useRef } from 'react';
import { Image, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { blur, dur, layout } from '../theme/tokens';

const BLOB = require('../assets/images/glow-blob.png');

export type GlowCardProps = {
  shell: string; radius: number; glow: boolean; blobSize: number; faceOpacity: number; faceRadius: number;
  faceStyle?: ViewStyle; outline?: string; style?: ViewStyle; children: ReactNode; testID?: string;
};

export function GlowCard({ shell, radius, glow, blobSize, faceOpacity, faceRadius, faceStyle, outline = 'rgba(0,0,0,0.09)', style, children, testID }: GlowCardProps) {
  const target = useRef<View>(null);
  return (
    <View testID={testID} style={[{ backgroundColor: shell, borderRadius: radius, overflow: 'hidden' }, style]}>
      <BlurTargetView ref={target} style={StyleSheet.absoluteFill}>
        {glow && <Blob size={blobSize} />}
      </BlurTargetView>
      <View style={{ margin: 2, borderRadius: faceRadius, overflow: 'hidden' }}>
        {glow && <BlurView intensity={blur.face} tint="light" blurMethod="dimezisBlurViewSdk31Plus" blurTarget={target} style={StyleSheet.absoluteFill} />}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(255,255,255,${faceOpacity})` }]} />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: faceRadius, borderWidth: 1, borderColor: outline }]} />
        <View style={faceStyle}>{children}</View>
      </View>
    </View>
  );
}

// blob3 keyframes (line 17): translate (-100%,-100%) → (0,-100%) → (0,0) → (-100%,0) → back, 5 s linear, infinite.
function Blob({ size }: { size: number }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withRepeat(withTiming(1, { duration: dur.blob, easing: Easing.linear }), -1, false); }, [p]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(p.value, [0, 0.25, 0.5, 0.75, 1], [-size, 0, 0, -size, -size]) },
      { translateY: interpolate(p.value, [0, 0.25, 0.5, 0.75, 1], [-size, -size, 0, 0, -size]) },
    ],
  }));
  const scale = size / layout.blobBaked;
  const img = (layout.blobBaked + 2 * layout.blobBleed) * scale;
  const off = layout.blobBleed * scale;
  return (
    <Animated.View testID="glow-blob" pointerEvents="none" style={[{ position: 'absolute', left: '50%', top: '50%', width: size, height: size } as ViewStyle, style]}>
      <Image source={BLOB} style={{ position: 'absolute', left: -off, top: -off, width: img, height: img }} />
    </Animated.View>
  );
}
