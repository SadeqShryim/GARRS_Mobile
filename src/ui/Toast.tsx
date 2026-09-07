import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';
import { color, dur } from '../theme/tokens';
import { Icon } from './Icon';
import { Sans } from './Txt';

export function Toast() {
  const toast = useAppStore((s) => s.toast);
  const insets = useSafeAreaInsets();
  if (!toast) return null;
  return <ToastBody key={toast} text={toast} bottom={104 + insets.bottom} />;
}

function ToastBody({ text, bottom }: { text: string; bottom: number }) {
  const o = useSharedValue(0);
  useEffect(() => { o.value = withTiming(1, { duration: dur.fade }); }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View testID="toast" pointerEvents="none" style={[{ position: 'absolute', left: 20, right: 20, bottom, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingHorizontal: 15, borderRadius: 12, backgroundColor: color.ink, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }, style]}>
      <Icon name="checkbox-circle-line" size={16} color={color.textOnDark} />
      <Sans size={13} color={color.textOnDark} style={{ flex: 1 }}>{text}</Sans>
    </Animated.View>
  );
}
