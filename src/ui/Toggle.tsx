import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { bez, color, dur, ease } from '../theme/tokens';
import { Sans } from './Txt';

// Track: background .22s ease (#dcdbd8 → #0F638F). Knob: translate3d(18px) .22s cubic-bezier(.4,0,.2,1).
export function Toggle({ on, label, onPress, testID }: { on: boolean; label: string; onPress: () => void; testID?: string }) {
  const track = useSharedValue(on ? 1 : 0);
  const knob = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    track.value = withTiming(on ? 1 : 0, { duration: dur.toggle, easing: bez(ease.css) });
    knob.value = withTiming(on ? 1 : 0, { duration: dur.toggle, easing: bez(ease.press) });
  }, [on, track, knob]);
  const trackStyle = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(track.value, [0, 1], [color.handle, color.blueDeep]) }));
  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: 18 * knob.value }] }));
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={label} onPress={onPress} testID={testID}
      style={{ minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
      <Sans size={14} color={color.ink2}>{label}</Sans>
      <Animated.View style={[{ width: 44, height: 26, borderRadius: 13, padding: 3 }, trackStyle]}>
        <Animated.View style={[{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.22)' }, knobStyle]} />
      </Animated.View>
    </Pressable>
  );
}
