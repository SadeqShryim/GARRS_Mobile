### Task 19: VIN help screen

**Files:**
- Create: `src/screens/VinHelpScreen.tsx`
- Modify: `src/overlays/OverlayHost.tsx` (add `{screen === 'vinhelp' && <VinHelpScreen />}` after the sheets, before `<Toast />`)
- Test: `src/screens/__tests__/VinHelpScreen.test.tsx`

**Interfaces:**
- Consumes: `SlideUpScreen`, `VIN_SPOTS`, `Icon`, `Sans`, `Mono`, `OutlinePill`, store.
- Produces: `VinHelpScreen()`. Source: template lines 848–895.

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { VinHelpScreen } from '../VinHelpScreen';
import { resetAppStore, useAppStore } from '../../store/useAppStore';

beforeEach(() => { resetAppStore(); useAppStore.getState().openSheet('add'); useAppStore.getState().openVinHelp(); });

describe('VinHelpScreen', () => {
  it('renders the four spots and the sample VIN', () => {
    const { getByText } = render(<VinHelpScreen />);
    expect(getByText('Where to find your VIN')).toBeTruthy();
    expect(getByText('Base of the windshield')).toBeTruthy();
    expect(getByText('Vehicle software')).toBeTruthy();
    expect(getByText('1FTVW1EL5NWG00001')).toBeTruthy();
    expect(getByText('17 CHARACTERS · NO I, O OR Q')).toBeTruthy();
  });
  it('Enter manually returns to the add sheet', () => {
    const { getByLabelText } = render(<VinHelpScreen />);
    fireEvent.press(getByLabelText('Enter manually'));
    expect(useAppStore.getState()).toMatchObject({ screen: null, sheet: 'add' });
  });
  it('Scan returns to the sheet and flashes', () => {
    const { getByLabelText } = render(<VinHelpScreen />);
    fireEvent.press(getByLabelText('Scan'));
    expect(useAppStore.getState().screen).toBeNull();
    expect(useAppStore.getState().toast).toBe('Camera scan is not wired up in this prototype');
  });
  it('Close only closes the help screen', () => {
    const { getByLabelText } = render(<VinHelpScreen />);
    fireEvent.press(getByLabelText('Close'));
    expect(useAppStore.getState()).toMatchObject({ screen: null, sheet: 'add' });
  });
});
```

- [ ] **Step 2: Run** `npm test -- VinHelpScreen` → FAIL.

- [ ] **Step 3: Write `src/screens/VinHelpScreen.tsx`**

```tsx
import { Pressable, View } from 'react-native';
import { VIN_SPOTS } from '../fixtures/vinHelp';
import { useAppStore } from '../store/useAppStore';
import { color } from '../theme/tokens';
import { Icon } from '../ui/Icon';
import { OutlinePill } from '../ui/OutlinePill';
import { SlideUpScreen } from '../ui/SlideUpScreen';
import { Mono, Sans } from '../ui/Txt';

export function VinHelpScreen() {
  const closeVinHelp = useAppStore((s) => s.closeVinHelp);
  const openSheet = useAppStore((s) => s.openSheet);
  const flash = useAppStore((s) => s.flash);
  const manual = () => { closeVinHelp(); openSheet('add'); };
  const scan = () => { manual(); flash('Camera scan is not wired up in this prototype'); };

  const footer = (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel="Enter manually" onPress={manual}
        style={{ flex: 1, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 999, backgroundColor: color.ink }}>
        <Icon name="keyboard-line" size={17} color={color.textOnDark} />
        <Sans size={15} weight={500} color={color.textOnDark}>Enter manually</Sans>
      </Pressable>
      <OutlinePill label="Scan" icon="camera-line" height={52} onPress={scan} />
    </>
  );

  return (
    <SlideUpScreen caption="FINDING YOUR VIN" onClose={closeVinHelp} footer={footer} testID="vin-help">
      <View style={{ gap: 7 }}>
        <Sans size={30} lh={35} weight={600} ls={-1.1} color={color.ink}>Where to find your VIN</Sans>
        <Sans size={14} lh={21} color={color.ink5}>Every road vehicle carries a unique 17-character Vehicle Identification Number. Any of these four places will have it.</Sans>
      </View>
      <View style={{ gap: 10 }}>
        {VIN_SPOTS.map((sp) => (
          <View key={sp.tag} style={{ borderRadius: 16, backgroundColor: color.sunken, padding: 16, flexDirection: 'row', gap: 13, alignItems: 'flex-start' }}>
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' }}><Icon name={sp.icon} size={19} color={color.blueDeep} /></View>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Sans size={15} weight={600} ls={-0.2} color={color.ink}>{sp.title}</Sans>
                <Mono size={9} ls={1.2} color={color.ink3}>{sp.tag}</Mono>
              </View>
              <Sans size={13} lh={19} color={color.ink5}>{sp.body}</Sans>
            </View>
          </View>
        ))}
      </View>
      <View style={{ gap: 9 }}>
        <Mono size={10} ls={1.8} color={color.ink4}>WHAT IT LOOKS LIKE</Mono>
        <View style={{ borderRadius: 16, backgroundColor: color.ink, paddingVertical: 18, paddingHorizontal: 16, gap: 9 }}>
          <Mono size={17} ls={2.4} color={color.textOnDark}>1FTVW1EL5NWG00001</Mono>
          <Mono size={9} ls={1.3} color="rgba(255,255,255,0.45)">17 CHARACTERS · NO I, O OR Q</Mono>
        </View>
        <Sans size={13} lh={19} color={color.ink5}>If a character looks like a letter I, O or Q, it is a 1 or a 0 — those three letters are never used in a VIN.</Sans>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, backgroundColor: color.sunken, paddingVertical: 14, paddingHorizontal: 15 }}>
        <Icon name="information-line" size={17} color={color.blueDeep} />
        <Sans size={13} lh={19} color={color.ink2} style={{ flex: 1 }}>Your VIN is only used to match your vehicle against NHTSA recall records. It is never shared.</Sans>
      </View>
    </SlideUpScreen>
  );
}
```

- [ ] **Step 4: Mount it** — in `OverlayHost.tsx` add `const screen = useAppStore((s) => s.screen);` and `{screen === 'vinhelp' && <VinHelpScreen />}` after the sheet lines.

- [ ] **Step 5: Run** `npm test -- VinHelpScreen && npm run typecheck` → PASS.

- [ ] **Step 6: Verify on the emulator** — Add Vehicle → info button → screenshot `t19-vinhelp.png` vs `vin-help.png`. Close → the add sheet is still there underneath.
Expected: white full screen sliding up over the sheet in ~0.34 s; four grey spot cards with blue icons in white discs; the dark VIN sample card; two pinned footer buttons above the gesture inset.

- [ ] **Step 7: Checkpoint** — "feat: VIN help screen"

---

