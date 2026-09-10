// Splash.dc.html — the `authOp` layer: header, the three step blocks (each entering with `sp-in`), the field column, the footer.
import { type ReactNode, useEffect, useReducer } from 'react';
import { BackHandler, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COPY } from '../../fixtures/splash';
import { bez, color, ease } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { Sans, Serif } from '../../ui/Txt';
import { cfArrow, emailArrow, initialAuth, next, pwArrow, reduce } from './auth';
import { GlassField } from './GlassField';
import { GlassPill } from './GlassPill';
import { GoogleMark } from './GoogleMark';
import { DUR } from './timeline';

export type AuthPanelProps = { opacity: SharedValue<number>; active: boolean; runId: number; onDone: () => void };

export function AuthPanel({ opacity, active, runId, onDone }: AuthPanelProps) {
  const insets = useSafeAreaInsets();
  const [s, dispatch] = useReducer(reduce, undefined, initialAuth);
  useEffect(() => { dispatch({ type: 'reset' }); }, [runId]);
  const go = () => {
    if (next(s).done) onDone();
    else dispatch({ type: 'next' });
  };
  // Android back steps backwards through the auth steps instead of leaving the app; the email step is not handled.
  useEffect(() => {
    if (!active || s.step === 'email') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { dispatch({ type: 'back' }); return true; });
    return () => sub.remove();
  }, [active, s.step]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const eye = (
    <Pressable accessibilityRole="button" accessibilityLabel="Show password" onPress={() => dispatch({ type: 'toggleEye' })} style={styles.eye}>
      <Icon name={s.eye ? 'eye-off-line' : 'eye-line'} size={18} color="rgba(255,255,255,0.72)" />
    </Pressable>
  );
  return (
    <Animated.View testID="auth" pointerEvents={active ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, fade]}>
      <View style={[styles.header, { paddingTop: 22 + insets.top }]}>
        <View style={styles.brandTile}>
          <Icon name="shield-check-fill" size={15} color={color.authBlueInk} />
        </View>
        <Sans size={15} weight={600} ls={-0.2} color="#FFFFFF">{COPY.brand}</Sans>
      </View>

      <View style={styles.middle}>
        {s.step === 'email' && (
          <StepIn key={`email-${runId}`} style={styles.emailBlock}>
            <Serif size={52} lh={52} ls={-1} color="#FFFFFF" center>{COPY.emailTitle}</Serif>
            <Sans size={13} weight={500} color="rgba(255,255,255,0.62)">{COPY.continueWith}</Sans>
            <View style={styles.pills}>
              <GlassPill label={COPY.google} icon={<GoogleMark />} onPress={onDone} />
              <GlassPill label={COPY.apple} icon={<Icon name="apple-fill" size={19} color="#FFFFFF" />} onPress={onDone} />
            </View>
            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Sans size={11} weight={600} ls={0.4} color="rgba(255,255,255,0.5)">{COPY.or}</Sans>
              <View style={styles.orLine} />
            </View>
          </StepIn>
        )}
        {s.step === 'pw' && (
          <StepIn key={`pw-${runId}`} style={styles.stepBlock}>
            <Serif size={46} lh={48} color="#FFFFFF" center>{COPY.pwTitle}</Serif>
            <Sans size={13} weight={500} color="rgba(255,255,255,0.6)" center>{COPY.pwSub + s.email}</Sans>
          </StepIn>
        )}
        {s.step === 'confirm' && (
          <StepIn key={`confirm-${runId}`} style={styles.stepBlock}>
            <Serif size={46} lh={48} color="#FFFFFF" center>{COPY.cfTitle}</Serif>
            <Sans size={13} weight={500} color="rgba(255,255,255,0.6)" center>{COPY.cfSub}</Sans>
          </StepIn>
        )}

        <View style={styles.fields}>
          {(s.step === 'email' || s.step === 'pw') && (
            <GlassField
              testID="email" paddingLeft={16} leading={<Icon name="mail-line" size={18} color="rgba(255,255,255,0.72)" />}
              value={s.email} onChangeText={(value) => dispatch({ type: 'email', value })} placeholder={COPY.emailPlaceholder} email
              onSubmit={go} arrow={emailArrow(s)} arrowLabel="Continue"
            />
          )}
          {s.step === 'pw' && (
            <GlassField
              testID="password" paddingLeft={12} leading={eye}
              value={s.pw} onChangeText={(value) => dispatch({ type: 'pw', value })} placeholder={COPY.pwPlaceholder} secure={!s.eye}
              onSubmit={go} arrow={pwArrow(s)} arrowLabel="Continue"
            />
          )}
          {s.step === 'confirm' && (
            <GlassField
              testID="confirm" paddingLeft={12} leading={eye}
              value={s.cf} onChangeText={(value) => dispatch({ type: 'cf', value })} placeholder={COPY.cfPlaceholder} secure={!s.eye}
              onSubmit={go} arrow={cfArrow(s)} arrowLabel="Finish"
            />
          )}
          {s.err && <Sans size={12.5} color={color.authError} center>{COPY.error}</Sans>}
          {s.step !== 'email' && (
            <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => dispatch({ type: 'back' })} style={styles.back}>
              <Icon name="arrow-left-line" size={14} color="rgba(255,255,255,0.6)" />
              <Sans size={13} color="rgba(255,255,255,0.6)">{COPY.back}</Sans>
            </Pressable>
          )}
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: 30 + insets.bottom }]}>
        <Sans size={13} color="rgba(255,255,255,0.55)">
          {COPY.footer}
          <Sans size={13} weight={500} color="#FFFFFF" accessibilityRole="link" onPress={onDone}>{COPY.signIn}</Sans>
        </Sans>
      </View>
    </Animated.View>
  );
}

// @keyframes sp-in: from { opacity 0; translateY 10px; blur 6px } to { 1; 0; 0 } — .5 s ease, on mount, per step.
function StepIn({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withTiming(1, { duration: DUR.stepIn, easing: bez(ease.css) }); }, [p]);
  const a = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: 10 * (1 - p.value) }], filter: [{ blur: 6 * (1 - p.value) }] }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  brandTile: { width: 26, height: 26, borderRadius: 8, backgroundColor: color.blue, alignItems: 'center', justifyContent: 'center' },
  middle: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 24, paddingBottom: 40 },
  emailBlock: { alignItems: 'center', gap: 16, width: '100%' },
  stepBlock: { alignItems: 'center', gap: 10, width: '100%' },
  pills: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', paddingVertical: 2 },
  orLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.14)' },
  fields: { gap: 14, width: '100%', maxWidth: 320 },
  eye: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  footer: { alignItems: 'center', paddingHorizontal: 24 },
});
