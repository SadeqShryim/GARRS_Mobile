import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useAppStore } from '../../store/useAppStore';
import { color, dur } from '../../theme/tokens';

export function Pager() {
  const vehicles = useAppStore((s) => s.vehicles);
  const idx = useAppStore((s) => s.idx);
  const setIdx = useAppStore((s) => s.setIdx);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20 }} testID="pager">
      {vehicles.map((v, i) => <Dot key={v.id} active={i === idx} hasRecall={!!v.recall} onPress={() => setIdx(i)} />)}
    </View>
  );
}

function Dot({ active, hasRecall, onPress }: { active: boolean; hasRecall: boolean; onPress: () => void }) {
  const a = useSharedValue(active ? 1 : 0);
  useEffect(() => { a.value = withTiming(active ? 1 : 0, { duration: dur.dim }); }, [active, a]);
  const style = useAnimatedStyle(() => ({ width: 6 + 16 * a.value, opacity: 1 }));
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <Animated.View style={[{ height: 2, borderRadius: 1, backgroundColor: active ? (hasRecall ? color.red : color.ink) : color.handle }, style]} />
    </Pressable>
  );
}
