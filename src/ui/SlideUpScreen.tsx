import { type ReactNode, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bez, color, dur, ease } from '../theme/tokens';
import { Icon } from './Icon';
import { Mono } from './Txt';

export function SlideUpScreen({ caption, onClose, footer, children, testID, gap = 20 }: { caption: string; onClose: () => void; footer?: ReactNode; children: ReactNode; testID?: string; gap?: number }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const slide = useSharedValue(1);
  useEffect(() => { slide.value = withTiming(0, { duration: dur.screen, easing: bez(ease.sheet) }); }, [slide]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: slide.value * height }] }));
  return (
    <Animated.View testID={testID} style={[StyleSheet.absoluteFill, { backgroundColor: color.surface, paddingTop: insets.top }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 18, paddingHorizontal: 20, paddingBottom: 8 }}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={{ width: 38, height: 38, marginLeft: -9, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close-line" size={23} color={color.ink} />
        </Pressable>
        <Mono size={10} ls={1.8} color={color.ink3}>{caption}</Mono>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap, paddingTop: 8, paddingHorizontal: 20, paddingBottom: 32 }}>{children}</ScrollView>
      {footer ? (
        <View style={{ flexDirection: 'row', gap: 10, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 18 + insets.bottom, borderTopWidth: 1, borderTopColor: color.hair07 }}>{footer}</View>
      ) : null}
    </Animated.View>
  );
}
