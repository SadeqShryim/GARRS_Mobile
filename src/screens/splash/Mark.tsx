// Splash.dc.html — the centred logo mark inside the stage: 54×54 r16 tile, 150deg 5-stop gradient, shield-check-fill 27 #08222E,
// box-shadow 0 14px 34px rgba(0,0,0,.6); caption RECALL HUB mono 10 / 2.8 white .6, gap 14. Opacity = stage × mark (Splash.tsx).
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { COPY } from '../../fixtures/splash';
import { cssAngleToPoints } from '../../lib/gradient';
import { color } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { Mono } from '../../ui/Txt';

const PTS = cssAngleToPoints(150, 54, 54);

export function Mark({ opacity }: { opacity: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View pointerEvents="none" testID="mark" style={[StyleSheet.absoluteFill, styles.wrap, style]}>
      <View style={styles.tile}>
        <LinearGradient colors={['#F4FBFF', '#A7DAFF', '#1B6E96', '#0E5378', '#8ACEFF']} locations={[0, 0.2, 0.54, 0.76, 1]} start={PTS.start} end={PTS.end} style={StyleSheet.absoluteFill} />
        <Icon name="shield-check-fill" size={27} color={color.markInk} />
      </View>
      <Mono size={10} ls={2.8} color="rgba(255,255,255,0.6)">{COPY.mark}</Mono>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: 14 },
  tile: { width: 54, height: 54, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', boxShadow: '0 14px 34px rgba(0,0,0,0.6)' },
});
