import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import { type GestureResponderEvent, type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { cssAngleToPoints } from '../lib/gradient';
import { bez, dur, ease } from '../theme/tokens';
import { Icon } from './Icon';
import { Sans } from './Txt';

export type MetalTint = 'blue' | 'mix' | 'default';
const BEZEL = {
  blue: require('../assets/images/metal-blue.png'),
  mix: require('../assets/images/metal-mix.png'),
  default: require('../assets/images/metal-default.png'),
} as const;
const FACE_BLUE = { colors: ['#2E93C4', '#0F638F', '#0B4E73'], locations: [0, 0.55, 1], angle: 160 };
const FACE_DARK = { colors: ['#202020', '#000000'], locations: [0, 1], angle: 180 };
const SHADOW_IDLE = '0 0 0 1px rgba(0,0,0,0.3), 0 14px 10px rgba(0,0,0,0.08), 0 3px 6px rgba(0,0,0,0.16)';
const SHADOW_PRESSED = '0 0 0 1px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)';
const TEXT_SHADOW = { textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 } as const;

export type MetalButtonProps = {
  tint?: MetalTint; label: string; icon: string; iconSize?: number; fontSize?: number; gap?: number;
  width?: number | 'auto'; height?: number; radius?: number; flex?: number; iconRight?: boolean; onPress?: () => void; testID?: string;
};

type Ripple = { id: number; x: number; y: number };

export function MetalButton({ tint = 'blue', label, icon, iconSize = 15, fontSize = 13, gap = 6, width = 132, height = 44, radius = 100, flex, iconRight, onPress, testID }: MetalButtonProps) {
  const [pressed, setPressed] = useState(false);
  const [box, setBox] = useState({ w: typeof width === 'number' ? width : 320, h: height });
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rot = useSharedValue(0);
  const press = useSharedValue(0);

  useEffect(() => {
    const from = rot.value % 360;
    rot.value = from;
    rot.value = withRepeat(withTiming(from + 360, { duration: pressed ? dur.metalPressed : dur.metalIdle, easing: Easing.linear }), -1, false);
  }, [pressed, rot]);
  useEffect(() => { press.value = withTiming(pressed ? 1 : 0, { duration: dur.press, easing: bez(ease.press) }); }, [pressed, press]);

  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  const wrapStyle = useAnimatedStyle(() => ({ transform: [{ translateY: press.value }, { scale: 1 - 0.02 * press.value }] }));

  const spin = (typeof width === 'number' ? width : 320) * 2.4;
  const face = tint === 'blue' ? FACE_BLUE : FACE_DARK;
  const ink = tint === 'blue' ? '#EAF7FF' : '#8A8F94';
  const pts = cssAngleToPoints(face.angle, box.w, box.h);

  const onLayout = useCallback((e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height }), []);
  const onPressIn = useCallback((e: GestureResponderEvent) => {
    setPressed(true);
    const id = Date.now() + Math.random();
    setRipples((r) => [...r, { id, x: e.nativeEvent.locationX, y: e.nativeEvent.locationY }]);
    setTimeout(() => setRipples((r) => r.filter((x) => x.id !== id)), dur.ripple);
  }, []);

  return (
    <Animated.View onLayout={onLayout} testID={testID} style={[{ width: typeof width === 'number' ? width : undefined, height, flex }, wrapStyle]}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden', boxShadow: pressed ? SHADOW_PRESSED : SHADOW_IDLE }]}>
        <Animated.Image source={BEZEL[tint]} style={[{ position: 'absolute', left: box.w / 2 - spin / 2, top: box.h / 2 - spin / 2, width: spin, height: spin }, spinStyle]} />
        <View style={{ position: 'absolute', left: 2, right: 2, top: 2, bottom: 2, borderRadius: radius, overflow: 'hidden', boxShadow: pressed ? 'inset 0 2px 4px rgba(0,0,0,0.4)' : undefined }}>
          <LinearGradient colors={face.colors as [string, string, ...string[]]} locations={face.locations as [number, number, ...number[]]} start={pts.start} end={pts.end} style={StyleSheet.absoluteFill} />
        </View>
        {ripples.map((r) => <RippleDot key={r.id} x={r.x} y={r.y} />)}
      </View>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { flexDirection: iconRight ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', gap }]}>
        <Icon name={icon} size={iconSize} color={ink} style={TEXT_SHADOW} />
        <Sans size={fontSize} color={ink} style={TEXT_SHADOW} numberOfLines={1}>{label}</Sans>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPressIn={onPressIn} onPressOut={() => setPressed(false)} onPress={onPress} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

function RippleDot({ x, y }: { x: number; y: number }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withTiming(1, { duration: dur.ripple, easing: bez(ease.cssEaseOut) }); }, [p]);
  const style = useAnimatedStyle(() => ({ opacity: 0.5 * (1 - p.value), transform: [{ scale: 4 * p.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x - 10, top: y - 10, width: 20, height: 20 }, style]}>
      <Svg width={20} height={20}>
        <Defs>
          <RadialGradient id="rip" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#fff" stopOpacity={0.45} />
            <Stop offset="0.7" stopColor="#fff" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={10} cy={10} r={10} fill="url(#rip)" />
      </Svg>
    </Animated.View>
  );
}
