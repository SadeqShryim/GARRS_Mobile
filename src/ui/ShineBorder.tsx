import { type ReactNode, useEffect, useState } from 'react';
import { type LayoutChangeEvent, View, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { dur } from '../theme/tokens';

const RAMP = {
  plus: require('../assets/images/shine-plus.png'),
  caution: require('../assets/images/shine-caution.png'),
};

// A conic-gradient square (inset:-100% in the source) rotating behind the caller's inner card, clipped by the outer radius.
// The square's side is the card's diagonal so every corner stays covered at every angle; the gradient depends on angle only,
// so scaling the baked texture changes nothing but sharpness.
export function ShineBorder({ ramp, radius, style, children, testID }: { ramp: 'plus' | 'caution'; radius: number; style?: ViewStyle; children: ReactNode; testID?: string }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const rot = useSharedValue(0);
  useEffect(() => { rot.value = withRepeat(withTiming(360, { duration: dur.shine, easing: Easing.linear }), -1, false); }, [rot]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  const side = Math.ceil(Math.hypot(box.w, box.h));
  const onLayout = (e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  return (
    <View testID={testID} onLayout={onLayout} style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
      {side > 0 && (
        <Animated.Image testID="shine" source={RAMP[ramp]}
          style={[{ position: 'absolute', left: box.w / 2 - side / 2, top: box.h / 2 - side / 2, width: side, height: side }, spin]} />
      )}
      {children}
    </View>
  );
}
