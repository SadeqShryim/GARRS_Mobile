import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { bez, color, dur, ease } from '../theme/tokens';
import { Sans } from './Txt';

const R = 66;
const CIRC = 2 * Math.PI * R;
const ACircle = Animated.createAnimatedComponent(Circle);

export function countAt(target: number, elapsedMs: number) {
  const p = Math.min(1, elapsedMs / dur.gauge);
  return Math.round(target * (1 - Math.pow(1 - p, 3)));
}

export function HealthGauge({ health, gaugeColor, word }: { health: number; gaugeColor: string; word: string }) {
  const p = useSharedValue(0);
  const [count, setCount] = useState(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: dur.gauge, easing: bez(ease.gauge) });
    const t0 = Date.now();
    const id = setInterval(() => {
      const el = Date.now() - t0;
      setCount(countAt(health, el));
      if (el >= dur.gauge) clearInterval(id);
    }, 32);
    return () => clearInterval(id);
  }, [health, p]);
  const ring = useAnimatedProps(() => ({ strokeDashoffset: CIRC - (health / 100) * CIRC * p.value }));
  return (
    <View style={{ height: 196, alignItems: 'center', justifyContent: 'center', marginVertical: 6 }}>
      <Svg width={164} height={164} viewBox="0 0 164 164" style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={82} cy={82} r={R} strokeWidth={10} stroke={color.handle} fill="transparent" strokeDasharray="7 10" strokeLinecap="round" />
        <ACircle cx={82} cy={82} r={R} strokeWidth={10} stroke={gaugeColor} fill="transparent" strokeLinecap="round" strokeDasharray={`${CIRC}`} animatedProps={ring} />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Sans size={48} lh={50} weight={600} ls={-2} color={color.ink} testID="gauge-count">{count}</Sans>
        <Sans size={16} weight={500} color={color.ink5}>{word}</Sans>
      </View>
    </View>
  );
}
