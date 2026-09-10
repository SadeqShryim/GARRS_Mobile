# Task 12 brief — Slice 3 (app tabs)

Extracted verbatim from `docs/superpowers/plans/2026-09-10-slice3-app-tabs.md`. The spec `docs/superpowers/specs/2026-09-10-slice3-app-tabs-design.md` (§4 Overlay host) is the binding authority; z-order from the source: sheets z20 → light/reason z24 → membership z25 → chat z26 → VIN help z27 → article z28 → toast z30 → splash z60.

## Rules for this task
- Work in `C:\GarrsMobile`. **Do not run git. Do not install packages. Do not download anything.**
- Transcribe the code in this brief exactly. Deviate only when something does not compile or pass, keep the deviation minimal, and state exactly what you changed and why in the report.
- Only create/modify/delete the files listed under **Files**.
- Gate: `npm test -- OverlayHost`, then the full `npm test && npm run typecheck` before reporting.
- Environment: Windows 11 x64, Node 24, Expo SDK 57, jest-expo 57, TypeScript 6 strict. Tasks 6–11 are complete: `ReasonSheet` (`src/screens/service/ReasonSheet.tsx`), `LightSheet` and `ArticleReader` (`src/screens/hub/`), `MembershipScreen` and `ChatScreen` (`src/screens/profile/`) all exist and take no props. The stub routes were replaced by Tasks 6, 7, 8, 10, so nothing imports `TabStub` any more.
- Report: write `.superpowers/sdd/2026-09-10-slice3-app-tabs/task-12-report.md` with: **Status** (DONE / DONE_WITH_CONCERNS / BLOCKED), files created/modified/deleted, the test and typecheck output summary (numbers), deviations, deferred steps, concerns.

---

### Task 12: Overlay host integration, hardware back order, stub removal

**Files:**
- Modify: `src/overlays/OverlayHost.tsx` (replace the whole file), `src/overlays/__tests__/OverlayHost.test.tsx` (replace the whole file)
- Delete: `src/screens/TabStub.tsx`, `src/screens/__tests__/TabStub.test.tsx`

- [ ] **Step 1: `src/overlays/OverlayHost.tsx`**

```tsx
// src/overlays/OverlayHost.tsx — every overlay, mounted here in the source's z-order: add/recall sheet (z20), light sheet and
// reason sheet (z24), membership (z25), chat (z26), VIN help (z27), article reader (z28), toast (z30), splash (z60).
import { useEffect } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '../store/useAppStore';
import { AddVehicleSheet } from '../screens/AddVehicleSheet';
import { RecallSheet } from '../screens/RecallSheet';
import { VinHelpScreen } from '../screens/VinHelpScreen';
import { ArticleReader } from '../screens/hub/ArticleReader';
import { LightSheet } from '../screens/hub/LightSheet';
import { ChatScreen } from '../screens/profile/ChatScreen';
import { MembershipScreen } from '../screens/profile/MembershipScreen';
import { ReasonSheet } from '../screens/service/ReasonSheet';
import { Splash } from '../screens/splash/Splash';
import { Toast } from '../ui/Toast';

export function OverlayHost() {
  const sheet = useAppStore((s) => s.sheet);
  const screen = useAppStore((s) => s.screen);
  const hubLight = useAppStore((s) => s.hubLight);
  const splash = useAppStore((s) => s.splash);
  const dismissSplash = useAppStore((s) => s.dismissSplash);
  const closeSheet = useAppStore((s) => s.closeSheet);
  const closeScreen = useAppStore((s) => s.closeScreen);
  const closeArticle = useAppStore((s) => s.closeArticle);
  const closeLight = useAppStore((s) => s.closeLight);
  const router = useRouter();

  // Android back closes the topmost overlay (screens above the light sheet above the sheets) instead of leaving the app;
  // with nothing open it falls through to the navigator (pops a stats/detail route or exits).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'article') { closeArticle(); return true; }
      if (screen) { closeScreen(); return true; }
      if (hubLight) { closeLight(); return true; }
      if (sheet) { closeSheet(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [sheet, screen, hubLight, closeSheet, closeScreen, closeArticle, closeLight]);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {sheet === 'add' && <AddVehicleSheet />}
      {sheet === 'recall' && <RecallSheet onDetails={() => router.navigate('/(tabs)/recalls')} />}
      {hubLight && <LightSheet />}
      {sheet === 'reason' && <ReasonSheet />}
      {screen === 'membership' && <MembershipScreen />}
      {screen === 'chat' && <ChatScreen />}
      {screen === 'vinhelp' && <VinHelpScreen />}
      {screen === 'article' && <ArticleReader />}
      <Toast />
      {splash && <Splash onDone={dismissSplash} />}
    </View>
  );
}
```

- [ ] **Step 2: `src/overlays/__tests__/OverlayHost.test.tsx`** — replace the whole file (the global `expo-router` mock from `jest.setup.ts` now covers `useRouter`)

```tsx
import { act, render } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { OverlayHost } from '../OverlayHost';
import { resetAppStore, useAppStore } from '../../store/useAppStore';

jest.mock('../../screens/splash/useMarqueeDrive');

type Handler = () => boolean | null | undefined;
const handlers: Handler[] = [];
const pressBack = () => handlers[handlers.length - 1]();
const s = () => useAppStore.getState();

beforeEach(() => {
  handlers.length = 0;
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => { handlers.push(handler as Handler); return { remove: jest.fn() }; });
  resetAppStore();
  useAppStore.setState({ splash: false });
  jest.useFakeTimers();
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

describe('OverlayHost mounts', () => {
  it('the light sheet while hubLight is set', () => {
    s().openLight('l1');
    const { getByTestId } = render(<OverlayHost />);
    expect(getByTestId('sheet-light')).toBeTruthy();
  });
  it('the reason sheet, membership, chat and article by state', () => {
    s().openSheet('reason');
    const { getByTestId, rerender } = render(<OverlayHost />);
    expect(getByTestId('sheet-reason')).toBeTruthy();
    act(() => { s().closeSheet(); s().openScreen('membership'); });
    rerender(<OverlayHost />);
    expect(getByTestId('screen-membership')).toBeTruthy();
    act(() => { s().openScreen('chat'); });
    rerender(<OverlayHost />);
    expect(getByTestId('screen-chat')).toBeTruthy();
    act(() => { s().closeScreen(); s().openArticle('a1'); });
    rerender(<OverlayHost />);
    expect(getByTestId('article-reader')).toBeTruthy();
  });
  it('the real Splash while splash is true', () => {
    useAppStore.setState({ splash: true });
    const { getByTestId, getByText } = render(<OverlayHost />);
    expect(getByTestId('stage')).toBeTruthy();
    expect(getByText('REPLAY')).toBeTruthy();
  });
});

describe('OverlayHost hardware back', () => {
  it('closes the add sheet instead of leaving the app', () => {
    s().openSheet('add');
    render(<OverlayHost />);
    expect(pressBack()).toBe(true);
    expect(s().sheet).toBeNull();
  });
  it('closes VIN help first, then the sheet beneath it', () => {
    s().openSheet('add'); s().openVinHelp();
    const { rerender } = render(<OverlayHost />);
    expect(pressBack()).toBe(true);
    expect(s().screen).toBeNull();
    expect(s().sheet).toBe('add');
    rerender(<OverlayHost />);
    expect(pressBack()).toBe(true);
    expect(s().sheet).toBeNull();
  });
  it('closes the article (clearing it), the chat, the membership screen, the light sheet and the reason sheet', () => {
    s().openArticle('a2');
    const { rerender } = render(<OverlayHost />);
    expect(pressBack()).toBe(true);
    expect(s()).toMatchObject({ screen: null, article: null });
    act(() => { s().openScreen('chat'); }); rerender(<OverlayHost />);
    expect(pressBack()).toBe(true); expect(s().screen).toBeNull();
    act(() => { s().openScreen('membership'); }); rerender(<OverlayHost />);
    expect(pressBack()).toBe(true); expect(s().screen).toBeNull();
    act(() => { s().openLight('l3'); }); rerender(<OverlayHost />);
    expect(pressBack()).toBe(true); expect(s().hubLight).toBeNull();
    act(() => { s().openSheet('reason'); }); rerender(<OverlayHost />);
    expect(pressBack()).toBe(true); expect(s().sheet).toBeNull();
  });
  it('lets the system handle back when nothing is open', () => {
    render(<OverlayHost />);
    expect(pressBack()).toBe(false);
  });
});
```

- [ ] **Step 3: Delete** `src/screens/TabStub.tsx` and `src/screens/__tests__/TabStub.test.tsx`. Confirm with a search that no file imports `TabStub` (the four tab routes were replaced by Tasks 6–10). If a route still imports it, report BLOCKED with the file name — do not rewrite another task's route.

- [ ] **Step 4: Gate** — `npm test -- OverlayHost`, then `npm test && npm run typecheck`. Report.

**Checkpoint commit message (controller):** `feat: overlay host mounts every Slice 3 overlay; stub tab removed`
