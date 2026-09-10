# Task 11 brief — Slice 3 (app tabs)

Extracted verbatim from `docs/superpowers/plans/2026-09-10-slice3-app-tabs.md`. The spec `docs/superpowers/specs/2026-09-10-slice3-app-tabs-design.md` (§8 Chat, §5 `revealPlan`) is the binding authority; the source of truth is `design_handoff_recall_hub/design/GaragePrototype.dc.html` lines 801–846 (markup) and 1724–1790 (logic), keyframes `bub-in-l`/`bub-in-r`/`dot-bob` at lines 27–29. References: `docs/reference/app-chat-*.png`, `app-geometry.json` (`chat`).

## Rules for this task
- Work in `C:\GarrsMobile`. **Do not run git. Do not install packages. Do not download anything.**
- Transcribe the code in this brief exactly. Deviate only when something does not compile or pass, keep the deviation minimal, and state exactly what you changed and why in the report.
- Only create the files listed under **Files**. Other tasks are editing other screens at the same time; if the full-tree gate fails inside a file that is not yours, say so in the report and do not touch it.
- Gate: run your own suite first (`npm test -- ChatScreen`), then the full `npm test && npm run typecheck` before reporting.
- Environment: Windows 11 x64, Node 24, Expo SDK 57, RN 0.86 (`boxShadow` is a real style prop, spread included), Reanimated 4.5, jest-expo 57, TypeScript 6 strict. Already present from Tasks 1–4: `CHAT_SCRIPT`, `CANNED_REPLY`, `CHAT_COPY` (`src/fixtures/chat.ts`), `revealPlan`, `SEND_REPLY_DELAY` (`src/lib/chat.ts`), `cssAngleToPoints` (`src/lib/gradient.ts`), store `closeScreen`, `Icon`, `Sans`/`Mono`, tokens (`color.chat*`, `dur.bubbleIn/dotBob/screen`, `ease.swipe/sheet`, `bez`).
- Report: write `.superpowers/sdd/2026-09-10-slice3-app-tabs/task-11-report.md` with: **Status** (DONE / DONE_WITH_CONCERNS / BLOCKED), files created, the test and typecheck output summary (numbers), deviations, deferred steps, concerns.

---

### Task 11: Concierge chat screen

**Files:**
- Create: `src/screens/profile/ChatScreen.tsx`, `src/screens/profile/__tests__/ChatScreen.test.tsx`

**Interfaces:** `ChatScreen` (no props; Task 12 mounts it while `screen === 'chat'`). Chat state (`log`, `shown`, `typing`, `draft`) is local (spec §15.1).

- [ ] **Step 1: `src/screens/profile/ChatScreen.tsx`**

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CANNED_REPLY, CHAT_COPY, CHAT_SCRIPT } from '../../fixtures/chat';
import type { ChatMessage } from '../../fixtures/types';
import { revealPlan, SEND_REPLY_DELAY } from '../../lib/chat';
import { cssAngleToPoints } from '../../lib/gradient';
import { useAppStore } from '../../store/useAppStore';
import { bez, color, dur, ease } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { Mono, Sans } from '../../ui/Txt';

const AVATAR = cssAngleToPoints(135, 34, 34);
const BUBBLE = cssAngleToPoints(135, 300, 60);
const GRADIENT: [string, string] = ['#2E93C4', '#0B4E73'];

export function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const closeScreen = useAppStore((s) => s.closeScreen);
  const [log, setLog] = useState<ChatMessage[]>(CHAT_SCRIPT);
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scroll = useRef<ScrollView>(null);

  const clear = useCallback(() => { timers.current.forEach(clearTimeout); timers.current = []; }, []);
  // openChat + revealChat (lines 1724–1743): reset, then play the scripted reveal on the plan's timers.
  const reveal = useCallback(() => {
    clear();
    setLog(CHAT_SCRIPT); setShown(0); setTyping(false); setDraft('');
    for (const step of revealPlan(CHAT_SCRIPT)) {
      timers.current.push(setTimeout(() => { setShown(step.shown); setTyping(step.typing); }, step.at));
    }
  }, [clear]);
  useEffect(() => { reveal(); return clear; }, [reveal, clear]);
  useEffect(() => { scroll.current?.scrollToEnd({ animated: true }); }, [shown, typing]);

  // sendChat (line 1751): append mine, show typing, canned reply after 1400 ms.
  const send = () => {
    const text = draft.trim();
    if (!text) return;
    clear();
    setLog((l) => [...l, { from: 'me', content: text }]);
    setShown((n) => n + 1);
    setDraft('');
    setTyping(true);
    timers.current.push(setTimeout(() => { setLog((l) => [...l, CANNED_REPLY]); setShown((n) => n + 1); setTyping(false); }, SEND_REPLY_DELAY));
  };

  // screen-up .34s cubic-bezier(.2,.85,.2,1)
  const slide = useSharedValue(1);
  useEffect(() => { slide.value = withTiming(0, { duration: dur.screen, easing: bez(ease.sheet) }); }, [slide]);
  const slideStyle = useAnimatedStyle(() => ({ transform: [{ translateY: slide.value * height }] }));
  const hasDraft = draft.trim().length > 0;
  const messages = log.slice(0, shown);

  return (
    <Animated.View testID="screen-chat" style={[StyleSheet.absoluteFill, slideStyle]}>
      <LinearGradient colors={[color.chatTop, color.chatBottom]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      <StatusBar style="light" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 13, borderBottomWidth: 1, borderBottomColor: color.chatHair }}>
        <Pressable accessibilityLabel="Close" onPress={closeScreen} style={{ width: 34, height: 34, marginLeft: -7, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close-line" size={22} color="#FFFFFF" />
        </Pressable>
        <Avatar size={34} icon={17} />
        <View style={{ flex: 1, gap: 1 }}>
          <Sans size={14} weight={500} color="#FFFFFF">{CHAT_COPY.title}</Sans>
          <Sans size={11} color={color.chatDim}>{typing ? CHAT_COPY.typing : CHAT_COPY.online}</Sans>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={CHAT_COPY.replay} onPress={reveal}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, backgroundColor: color.chatHair, paddingVertical: 7, paddingHorizontal: 11 }}>
          <Icon name="restart-line" size={14} color={color.chatMuted} />
          <Sans size={12} color={color.chatMuted}>{CHAT_COPY.replay}</Sans>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingVertical: 18, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {messages.map((m, i) => <Bubble key={i} message={m} />)}
          {typing && (
            <View testID="chat-typing" style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
              <Avatar size={30} icon={15} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 16, borderTopLeftRadius: 6, borderWidth: 1, borderColor: color.chatEdge, backgroundColor: color.chatBubble, paddingVertical: 13, paddingHorizontal: 15 }}>
                <Dot delay={0} /><Dot delay={150} /><Dot delay={300} />
              </View>
            </View>
          )}
        </ScrollView>

        <View style={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 20 + insets.bottom, borderTopWidth: 1, borderTopColor: color.chatHair }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, borderColor: color.chatEdge, backgroundColor: color.chatField, paddingVertical: 8, paddingRight: 8, paddingLeft: 15 }}>
            <TextInput
              testID="chat-input"
              accessibilityLabel="Message the concierge"
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={send}
              returnKeyType="send"
              submitBehavior="submit"
              placeholder={CHAT_COPY.placeholder}
              placeholderTextColor={color.chatPlaceholder}
              allowFontScaling={false}
              style={{ flex: 1, minWidth: 0, paddingVertical: 8, fontFamily: 'Geist_400Regular', fontSize: 13.5, color: '#FFFFFF' }}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={send}
              style={{ width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: hasDraft ? color.blueDeep : color.chatHair }}>
              <Icon name="send-plane-fill" size={16} color={hasDraft ? '#FFFFFF' : color.chatSendOff} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

function Avatar({ size, icon }: { size: number; icon: number }) {
  return (
    <LinearGradient colors={GRADIENT} start={AVATAR.start} end={AVATAR.end} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="customer-service-2-fill" size={icon} color="#FFFFFF" />
    </LinearGradient>
  );
}

// bub-in-l / bub-in-r (.35s cubic-bezier(.22,1,.36,1) both): opacity 0 → 1, translate3d(∓20px, 12px) scale(.96) → none
function Bubble({ message: m }: { message: ChatMessage }) {
  const mine = m.from === 'me';
  const p = useSharedValue(0);
  useEffect(() => { p.value = withTiming(1, { duration: dur.bubbleIn, easing: bez(ease.swipe) }); }, [p]);
  const style = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateX: (mine ? 20 : -20) * (1 - p.value) }, { translateY: 12 * (1 - p.value) }, { scale: 0.96 + 0.04 * p.value }],
  }));
  return (
    <Animated.View testID={mine ? 'bubble-me' : 'bubble-them'} style={[{ width: '100%', flexDirection: mine ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8 }, style]}>
      {!mine && <Avatar size={30} icon={15} />}
      {mine ? (
        <LinearGradient colors={GRADIENT} start={BUBBLE.start} end={BUBBLE.end} style={[styles.bubble, { borderTopRightRadius: 6, boxShadow: '0 8px 24px -6px rgba(15,99,143,0.5)' }]}>
          <Sans size={13.5} lh={20} color="#FFFFFF">{m.content}</Sans>
        </LinearGradient>
      ) : (
        <View style={[styles.bubble, { backgroundColor: color.chatBubble, borderWidth: 1, borderColor: color.chatEdge, borderTopLeftRadius: 6, boxShadow: '0 4px 12px -2px rgba(0,0,0,0.3)' }]}>
          <Sans size={13.5} lh={20} color={color.chatInk}>{m.content}</Sans>
        </View>
      )}
    </Animated.View>
  );
}

// dot-bob .8s ease-in-out infinite (delays 0 / .15 / .3 s): opacity .4 → 1 → .4, translateY 0 → −4 → 0
function Dot({ delay }: { delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    const half = { duration: dur.dotBob / 2, easing: Easing.inOut(Easing.ease) };
    p.value = withDelay(delay, withRepeat(withSequence(withTiming(1, half), withTiming(0, half)), -1, false));
  }, [p, delay]);
  const style = useAnimatedStyle(() => ({ opacity: 0.4 + 0.6 * p.value, transform: [{ translateY: -4 * p.value }] }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: color.chatMuted }, style]} />;
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '75%', borderRadius: 16, paddingVertical: 11, paddingHorizontal: 14 },
});
```

- [ ] **Step 2: Tests** `src/screens/profile/__tests__/ChatScreen.test.tsx`

```tsx
import { act, fireEvent, render } from '@testing-library/react-native';
import { ChatScreen } from '../ChatScreen';
import { resetAppStore, useAppStore } from '../../../store/useAppStore';

const s = () => useAppStore.getState();
beforeEach(() => { resetAppStore(); s().openScreen('chat'); jest.useFakeTimers(); });
afterEach(() => jest.useRealTimers());

describe('ChatScreen', () => {
  it('opens typing, reveals the script on the plan timers, then reads Online', () => {
    const { getByText, queryByTestId, getAllByTestId, queryByText } = render(<ChatScreen />);
    expect(getByText('Aegis Concierge')).toBeTruthy();
    expect(getByText('Typing…')).toBeTruthy();
    expect(queryByTestId('chat-typing')).toBeTruthy();
    act(() => { jest.advanceTimersByTime(1200); });
    expect(getByText(/Good afternoon, Alexander/)).toBeTruthy();
    expect(queryByTestId('chat-typing')).toBeNull();
    expect(getByText('Online · replies in minutes')).toBeTruthy();
    act(() => { jest.advanceTimersByTime(1220); });
    expect(getByText('Yes please. What does the repair actually involve?')).toBeTruthy();
    act(() => { jest.advanceTimersByTime(10000); });
    expect(getAllByTestId('bubble-them')).toHaveLength(4);
    expect(getAllByTestId('bubble-me')).toHaveLength(3);
    expect(getByText(/Booked\. You'll get a confirmation/)).toBeTruthy();
    expect(queryByText('Typing…')).toBeNull();
  });
  it('Replay restarts the script', () => {
    const { getByLabelText, queryByText, getByText } = render(<ChatScreen />);
    act(() => { jest.advanceTimersByTime(3000); });
    expect(getByText('Yes please. What does the repair actually involve?')).toBeTruthy();
    fireEvent.press(getByLabelText('Replay'));
    expect(queryByText('Yes please. What does the repair actually involve?')).toBeNull();
    expect(getByText('Typing…')).toBeTruthy();
  });
  it('sending a message appends it, shows typing, then the canned reply after 1.4 s', () => {
    const { getByTestId, getByLabelText, getByText, queryByTestId } = render(<ChatScreen />);
    act(() => { jest.advanceTimersByTime(11000); });
    fireEvent.changeText(getByTestId('chat-input'), '  Can you send the driver details now? ');
    fireEvent.press(getByLabelText('Send'));
    expect(getByText('Can you send the driver details now?')).toBeTruthy();
    expect(getByTestId('chat-input').props.value).toBe('');
    expect(queryByTestId('chat-typing')).toBeTruthy();
    act(() => { jest.advanceTimersByTime(1400); });
    expect(getByText(/Noted\. A specialist will pick this up/)).toBeTruthy();
    expect(queryByTestId('chat-typing')).toBeNull();
  });
  it('ignores an empty send; Enter submits; Close closes the screen', () => {
    const { getByTestId, getByLabelText, queryByText } = render(<ChatScreen />);
    act(() => { jest.advanceTimersByTime(11000); });
    fireEvent.press(getByLabelText('Send'));
    expect(queryByText('Noted. A specialist', { exact: false })).toBeNull();
    fireEvent.changeText(getByTestId('chat-input'), 'Thanks');
    fireEvent(getByTestId('chat-input'), 'submitEditing');
    expect(queryByText('Thanks')).toBeTruthy();
    fireEvent.press(getByLabelText('Close'));
    expect(s().screen).toBeNull();
  });
});
```

- [ ] **Step 3: Gate** — `npm test -- ChatScreen`, then `npm test && npm run typecheck`. Report.

**Checkpoint commit message (controller):** `feat: concierge chat with the scripted reveal, typing indicator and canned reply`
