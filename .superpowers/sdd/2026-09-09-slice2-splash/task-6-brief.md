# Task 6 brief — Slice 2 (Splash)

Extracted verbatim from `docs/superpowers/plans/2026-09-09-slice2-splash.md`. The spec `docs/superpowers/specs/2026-09-09-slice2-splash-design.md` is the binding authority; the source of truth for every measurement is `design_handoff_recall_hub/design/Splash.dc.html` (measured DOM in `docs/reference/splash-geometry.json`).

## Rules for this task
- Work in `C:\GarrsMobile`. **Do not run git. Do not install packages. Do not download anything.**
- Transcribe the code in this brief exactly. Deviate only when something does not compile or pass, keep the deviation minimal, and state exactly what you changed and why in the report.
- Copy strings come from `src/fixtures/splash.ts` (`COPY`); never retype a string in a component.
- Only create/modify the files listed under **Files**. Other tasks may be editing other files at the same time; if the full-tree gate fails inside a file that is not yours, say so in the report and do not touch it.
- Gate: run your own suites first (`npm test -- <pattern>`), then the full `npm test && npm run typecheck` before reporting.
- Environment: Windows 11 x64, Node 24, npm 11, Expo SDK 57, RN 0.86, Reanimated 4.5, jest-expo 57, TypeScript 6 strict; `tsconfig` types = jest + node; use `StyleSheet.absoluteFill` (there is no `absoluteFillObject`). Skia and Instrument Serif are already installed.
- Report: write `.superpowers/sdd/2026-09-09-slice2-splash/task-6-report.md` with: **Status** (DONE / DONE_WITH_CONCERNS / BLOCKED), files created/modified, the test and typecheck output summary (numbers), deviations from the brief, deferred steps, concerns.

---

### Task 6: Auth panel

**Files:**
- Create: `src/screens/splash/AuthPanel.tsx`, `src/screens/splash/__tests__/AuthPanel.test.tsx`

**Interfaces:**
- Produces: `AuthPanel({ opacity: SharedValue<number>, active: boolean, runId: number, onDone })` — the whole auth layer (header, step blocks with the `sp-in` entrance, fields, error, Go back, footer), `testID="auth"`, pointer events only while `active`, state reset when `runId` changes, Android back → previous step while active.
- Consumes: Task 4 (`auth.ts`), Task 5 (glass primitives), `COPY`, `Serif`, `color`, `ease`, `DUR.stepIn`.

- [ ] **Step 1: Write the failing test** `src/screens/splash/__tests__/AuthPanel.test.tsx`

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { BackHandler } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { AuthPanel } from '../AuthPanel';

function Host({ onDone, active = true, runId = 0 }: { onDone: () => void; active?: boolean; runId?: number }) {
  const opacity = useSharedValue(1);
  return <AuthPanel opacity={opacity} active={active} runId={runId} onDone={onDone} />;
}
const setup = (props: Partial<ComponentProps<typeof Host>> = {}) => {
  const onDone = jest.fn();
  return { onDone, ...render(<Host onDone={onDone} {...props} />) };
};

describe('AuthPanel', () => {
  it('shows the email step and gates its arrow on a valid address', () => {
    const { getByText, queryByLabelText, getByTestId, getByLabelText, queryByText } = setup();
    expect(getByText('Get started\nwith Recall Hub')).toBeTruthy();
    expect(getByText('Continue with')).toBeTruthy();
    expect(getByText('OR')).toBeTruthy();
    expect(queryByText('Go back')).toBeNull();
    expect(queryByLabelText('Continue')).toBeNull();
    fireEvent.changeText(getByTestId('email'), 'sam@recallhub');
    expect(queryByLabelText('Continue')).toBeNull();
    fireEvent.changeText(getByTestId('email'), 'sam@recallhub.app');
    fireEvent.press(getByLabelText('Continue'));
    expect(getByText('Create your password')).toBeTruthy();
    expect(getByText('At least 6 characters. sam@recallhub.app')).toBeTruthy();
    expect(getByTestId('email')).toBeTruthy();   // the email field stays on the password step
    expect(getByText('Go back')).toBeTruthy();
  });

  it('walks password → confirm, flags a mismatch, finishes on a match', () => {
    const { getByTestId, getByLabelText, queryByLabelText, getByText, queryByText, onDone } = setup();
    fireEvent.changeText(getByTestId('email'), 'sam@recallhub.app');
    fireEvent(getByTestId('email'), 'submitEditing');
    fireEvent.changeText(getByTestId('password'), 'hunt');
    expect(queryByLabelText('Continue')).toBeNull();
    fireEvent.changeText(getByTestId('password'), 'hunter22');
    fireEvent.press(getByLabelText('Continue'));
    expect(getByText('One last step')).toBeTruthy();
    expect(getByText('Confirm your password to continue')).toBeTruthy();
    fireEvent.changeText(getByTestId('confirm'), 'hunter2x');
    fireEvent.press(getByLabelText('Finish'));
    expect(getByText('Passwords do not match.')).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.changeText(getByTestId('confirm'), 'hunter22');
    expect(queryByText('Passwords do not match.')).toBeNull();
    fireEvent.press(getByLabelText('Finish'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('goes back a step, clearing the confirmation', () => {
    const { getByTestId, getByText, queryByTestId } = setup();
    fireEvent.changeText(getByTestId('email'), 'sam@recallhub.app');
    fireEvent(getByTestId('email'), 'submitEditing');
    fireEvent.changeText(getByTestId('password'), 'hunter22');
    fireEvent(getByTestId('password'), 'submitEditing');
    fireEvent.changeText(getByTestId('confirm'), 'hun');
    fireEvent.press(getByText('Go back'));
    expect(getByText('Create your password')).toBeTruthy();
    expect(queryByTestId('confirm')).toBeNull();
    fireEvent.press(getByText('Go back'));
    expect(getByText('Get started\nwith Recall Hub')).toBeTruthy();
  });

  it('toggles the eye on the password field', () => {
    const { getByTestId, getByLabelText } = setup();
    fireEvent.changeText(getByTestId('email'), 'sam@recallhub.app');
    fireEvent(getByTestId('email'), 'submitEditing');
    expect(getByTestId('password').props.secureTextEntry).toBe(true);
    expect(getByTestId('icon-eye-line')).toBeTruthy();
    fireEvent.press(getByLabelText('Show password'));
    expect(getByTestId('password').props.secureTextEntry).toBe(false);
    expect(getByTestId('icon-eye-off-line')).toBeTruthy();
  });

  it('Google, Apple and Sign in all finish', () => {
    const { getByLabelText, getByText, onDone } = setup();
    fireEvent.press(getByLabelText('Google'));
    fireEvent.press(getByLabelText('Apple'));
    fireEvent.press(getByText('Sign in'));
    expect(onDone).toHaveBeenCalledTimes(3);
  });

  it('is inert until active and resets on a new run', () => {
    const { getByTestId, rerender, onDone } = setup({ active: false });
    expect(getByTestId('auth').props.pointerEvents).toBe('none');
    rerender(<Host onDone={onDone} active runId={0} />);
    expect(getByTestId('auth').props.pointerEvents).toBe('auto');
    fireEvent.changeText(getByTestId('email'), 'sam@recallhub.app');
    fireEvent(getByTestId('email'), 'submitEditing');
    rerender(<Host onDone={onDone} active runId={1} />);
    expect(getByTestId('email').props.value).toBe('');
  });

  it('hardware back steps backwards while a later step is showing', () => {
    const handlers: (() => boolean | null | undefined)[] = [];
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_e, h) => { handlers.push(h as () => boolean); return { remove: jest.fn() }; });
    const { getByTestId, getByText } = setup();
    expect(handlers).toHaveLength(0);
    fireEvent.changeText(getByTestId('email'), 'sam@recallhub.app');
    fireEvent(getByTestId('email'), 'submitEditing');
    expect(handlers.length).toBeGreaterThan(0);
    expect(handlers[handlers.length - 1]()).toBe(true);
    expect(getByText('Get started\nwith Recall Hub')).toBeTruthy();
    jest.restoreAllMocks();
  });
});
```

- [ ] **Step 2: Run** `npm test -- AuthPanel` → FAIL.

- [ ] **Step 3: Write `src/screens/splash/AuthPanel.tsx`**

```tsx
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
```

- [ ] **Step 4: Run** `npm test -- AuthPanel && npm run typecheck` → PASS. If TypeScript rejects `filter` inside the animated style, type the returned object as `ViewStyle` (`useAnimatedStyle<ViewStyle>`); do not drop the blur.

- [ ] **Step 5: Checkpoint** — "feat: splash auth panel (email → password → confirm) with the sp-in entrance"

