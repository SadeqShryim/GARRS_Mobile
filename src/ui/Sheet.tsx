import { BlurView } from 'expo-blur';
import { type ReactNode, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppBlurTarget } from '../overlays/blurTarget';
import { bez, blur, color, dur, ease } from '../theme/tokens';
import { Mono, Sans } from './Txt';

export function Sheet({ title, sub, action, onClose, children, testID }: { title: string; sub: string; action?: ReactNode; onClose: () => void; children: ReactNode; testID?: string }) {
  const insets = useSafeAreaInsets();
  const target = useAppBlurTarget();
  const scrim = useSharedValue(0);
  const slide = useSharedValue(1);
  const [h, setH] = useState(600);
  useEffect(() => {
    scrim.value = withTiming(1, { duration: dur.fade });
    slide.value = withTiming(0, { duration: dur.sheet, easing: bez(ease.standard) });
  }, [scrim, slide]);
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value }));
  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: slide.value * h }] }));
  return (
    <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]} testID={testID}>
      <Animated.View style={[StyleSheet.absoluteFill, scrimStyle]}>
        <Pressable accessibilityLabel="Close sheet" onPress={onClose} style={StyleSheet.absoluteFill}>
          <BlurView intensity={blur.scrim} tint="dark" blurMethod="dimezisBlurViewSdk31Plus" blurTarget={target} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: color.scrim }]} />
        </Pressable>
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View onLayout={(e) => setH(e.nativeEvent.layout.height)} style={[styles.panel, { paddingBottom: 28 + insets.bottom }, panelStyle]}>
          <View style={styles.handle} />
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Sans size={22} weight={600} ls={-0.5} color={color.ink}>{title}</Sans>
              <Mono size={10} ls={1.6} color={color.ink3} style={{ marginTop: 6 }}>{sub}</Mono>
            </View>
            {action}
          </View>
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: color.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, boxShadow: '0 -8px 40px rgba(0,0,0,0.18)', paddingTop: 10, paddingHorizontal: 20 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: color.handle, alignSelf: 'center', marginBottom: 18 },
});
