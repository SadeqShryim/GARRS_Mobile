import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, dur } from '../theme/tokens';
import { Icon } from '../ui/Icon';
import { Mono } from '../ui/Txt';

const BEZEL = require('../assets/images/metal-blue.png');
const TILE = 54;
const SPIN = TILE * 2.4;

export function SplashStub({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const rot = useSharedValue(0);
  useEffect(() => { rot.value = withRepeat(withTiming(360, { duration: dur.metalIdle, easing: Easing.linear }), -1, false); }, [rot]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  return (
    <Pressable accessibilityLabel="Continue" onPress={onDone} style={[StyleSheet.absoluteFill, { backgroundColor: color.splash, alignItems: 'center', justifyContent: 'center' }]}>
      <View style={{ alignItems: 'center', gap: 14 }}>
        <View style={{ width: TILE, height: TILE, borderRadius: 16, overflow: 'hidden', boxShadow: '0 14px 34px rgba(0,0,0,0.6)' }}>
          <Animated.Image source={BEZEL} style={[{ position: 'absolute', left: TILE / 2 - SPIN / 2, top: TILE / 2 - SPIN / 2, width: SPIN, height: SPIN }, spin]} />
          <View style={{ position: 'absolute', left: 2, right: 2, top: 2, bottom: 2, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
            <LinearGradient colors={['#202020', '#000000']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
            <Icon name="shield-check-fill" size={24} color="#EAF7FF" />
          </View>
        </View>
        <Mono size={10} ls={2.4} color="rgba(255,255,255,0.7)">RECALL HUB</Mono>
      </View>
      <Mono size={10} ls={1.6} color="rgba(255,255,255,0.5)" style={{ position: 'absolute', bottom: 40 + insets.bottom }}>TAP ANYWHERE TO CONTINUE</Mono>
    </Pressable>
  );
}
