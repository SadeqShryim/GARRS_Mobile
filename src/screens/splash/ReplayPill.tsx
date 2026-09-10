// Splash.dc.html — REPLAY: top 14 right 14, h28 + 1px border (30 total), padding 0 11, r999, white .10 fill, white .16 border,
// restart-line 12 + mono 9 / 1.4, both white .8. z-index 6 (above everything). Its backdrop blur(6px) is omitted (spec §9).
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COPY } from '../../fixtures/splash';
import { Icon } from '../../ui/Icon';
import { Mono } from '../../ui/Txt';

export function ReplayPill({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Replay" onPress={onPress} style={[styles.pill, { top: 14 + insets.top }]}>
      <Icon name="restart-line" size={12} color="rgba(255,255,255,0.8)" />
      <Mono size={9} ls={1.4} color="rgba(255,255,255,0.8)">{COPY.replay}</Mono>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute', right: 14, zIndex: 6, flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 11,
    borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
  },
});
