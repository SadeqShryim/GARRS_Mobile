// src/screens/scan/ScanResult.tsx
// Spec §11 — the result card: a white panel sliding up over the dark scanner frame, in both variants. It reads
// nothing from the store, so a test can render either outcome directly; the chip label of a failure is derived
// from the reason (scanFlow's table) rather than stored.
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatVin } from '../../lib/vin';
import { bez, color, dur, ease } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { MetalButton } from '../../ui/MetalButton';
import { OutlinePill } from '../../ui/OutlinePill';
import { StatusChip } from '../../ui/StatusChip';
import { Mono, Sans } from '../../ui/Txt';
import { failLabel } from './scanFlow';

const MATCH_BG = '#E3F5F1';  // §11 — the success chip's fill (spec literal, as the recall chips' fills are)

export const RESULT_COPY = {
  added: 'Added to your garage',
  failedTitle: "Couldn't read the VIN",
  tip: 'Fill the frame, avoid glare and hold the phone steady, then try again.',
  done: 'Done',
  retry: 'Try again',
  type: 'Type it instead',
} as const;

export type ScanResultProps = {
  phase: 'added' | 'failed';
  score: number | null;
  vin: string | null;
  name: string | null;
  meta?: string | null;
  reason: string | null;
  onDone: () => void;
  onRetry: () => void;
  onType: () => void;
};

export function ScanResult({ phase, score, vin, name, meta, reason, onDone, onRetry, onType }: ScanResultProps) {
  const insets = useSafeAreaInsets();
  const slide = useSharedValue(1);
  const [h, setH] = useState(320);
  useEffect(() => { slide.value = withTiming(0, { duration: dur.sheet, easing: bez(ease.sheet) }); }, [slide]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: slide.value * h }] }));

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}>
      <Animated.View
        testID="scan-result"
        onLayout={(e) => setH(e.nativeEvent.layout.height)}
        style={[styles.panel, { paddingBottom: insets.bottom + 22 }, style]}
      >
        {phase === 'added' ? (
          <>
            <View style={styles.chipRow}>
              <StatusChip bg={MATCH_BG} fg={color.teal} icon="checkbox-circle-fill" label={`${score ?? 0}% MATCH`} />
            </View>
            {vin ? <Mono size={17} ls={2.4} color={color.ink}>{formatVin(vin)}</Mono> : null}
            <View style={{ gap: 3 }}>
              <Sans size={22} weight={600} ls={-0.5} color={color.ink}>{name ?? ''}</Sans>
              {meta ? <Sans size={13} color={color.ink5}>{meta}</Sans> : null}
            </View>
            {reason ? (
              <View style={styles.recallRow}>
                <Icon name="alarm-warning-fill" size={15} color={color.red} />
                <Sans size={13} color={color.red} style={{ flex: 1 }}>{reason}</Sans>
              </View>
            ) : null}
            <Sans size={12} color={color.ink5}>{RESULT_COPY.added}</Sans>
            <View style={styles.buttons}>
              <MetalButton tint="blue" label={RESULT_COPY.done} icon="check-line" width="auto" flex={1} height={48} fontSize={14} onPress={onDone} />
            </View>
          </>
        ) : (
          <>
            <View style={styles.chipRow}>
              <StatusChip bg={color.dangerBg} fg={color.dangerInk} icon="error-warning-fill" label={failLabel(score, reason)} />
            </View>
            <Sans size={20} weight={600} ls={-0.4} color={color.ink}>{RESULT_COPY.failedTitle}</Sans>
            {reason ? <Sans size={13} lh={19} color={color.ink5}>{reason}</Sans> : null}
            <Sans size={13} lh={19} color={color.ink2}>{RESULT_COPY.tip}</Sans>
            <View style={styles.buttons}>
              <MetalButton tint="default" label={RESULT_COPY.retry} icon="restart-line" width="auto" flex={1} height={48} fontSize={14} onPress={onRetry} />
              <OutlinePill label={RESULT_COPY.type} icon="keyboard-line" height={48} onPress={onType} />
            </View>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: color.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    boxShadow: '0 -8px 40px rgba(0,0,0,0.18)', paddingTop: 18, paddingHorizontal: 20, gap: 14,
  },
  chipRow: { flexDirection: 'row' },                     // keeps the chip at its content width
  recallRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
});
