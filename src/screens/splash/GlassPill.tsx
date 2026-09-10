// Splash.dc.html — the Google / Apple pills: h42, padding 0 18, r999, gap 8, glass fill, hover scale(.98) → pressed.
import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { cssAngleToPoints } from '../../lib/gradient';
import { dur } from '../../theme/tokens';
import { Sans } from '../../ui/Txt';

const FILL = ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.16)', 'rgba(255,255,255,0.05)'] as const;
const STOPS = [0, 0.45, 1] as const;
const SHADOW = 'inset 0 1px 1px rgba(255,255,255,0.30), inset 0 -1.5px 1.5px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.14), 0 8px 18px rgba(0,0,0,0.4)';

export function GlassPill({ label, icon, onPress }: { label: string; icon: ReactNode; onPress: () => void }) {
  const [box, setBox] = useState({ w: 110, h: 42 });
  const press = useSharedValue(0);
  const scale = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.02 * press.value }] }));
  const pts = cssAngleToPoints(-72, box.w, box.h);
  return (
    <Animated.View style={scale}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={() => { press.value = withTiming(1, { duration: dur.press }); }}
        onPressOut={() => { press.value = withTiming(0, { duration: dur.press }); }}
        onLayout={(e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        style={styles.pill}
      >
        <LinearGradient colors={FILL} locations={STOPS} start={pts.start} end={pts.end} style={StyleSheet.absoluteFill} />
        {icon}
        <Sans size={14} weight={600} color="#FFFFFF">{label}</Sans>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, paddingHorizontal: 18, borderRadius: 999, overflow: 'hidden', boxShadow: SHADOW },
});
