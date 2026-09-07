### Task 18: Add-vehicle sheet

**Files:**
- Create: `src/screens/AddVehicleSheet.tsx`
- Modify: `src/overlays/OverlayHost.tsx` (add `{sheet === 'add' && <AddVehicleSheet />}` before `<Toast />`)
- Test: `src/screens/__tests__/AddVehicleSheet.test.tsx`

**Interfaces:**
- Consumes: `Sheet`, `Icon`, `Sans`, `Mono`, `vinOk`, `decodeVin`, `DECODE`, `DEMO_VIN`, store.
- Produces: `AddVehicleSheet()` — reads/writes the store directly. Source: `addSheet`, line 2217.

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { AddVehicleSheet } from '../AddVehicleSheet';
import { DEMO_VIN } from '../../fixtures/decode';
import { resetAppStore, useAppStore } from '../../store/useAppStore';

beforeEach(() => { resetAppStore(); useAppStore.getState().openSheet('add'); });

describe('AddVehicleSheet', () => {
  it('flashes when submitting an empty VIN', () => {
    const { getByLabelText } = render(<AddVehicleSheet />);
    fireEvent.press(getByLabelText('Add to garage'));
    expect(useAppStore.getState().toast).toBe('Enter a VIN first');
    expect(useAppStore.getState().vehicles).toHaveLength(3);
  });
  it('sample VIN chip fills the field and shows the decoded preview', () => {
    const { getByText, rerender } = render(<AddVehicleSheet />);
    fireEvent.press(getByText('Use sample VIN'));
    expect(useAppStore.getState().vin).toBe(DEMO_VIN);
    rerender(<AddVehicleSheet />);
    expect(getByText('F-150 Lightning')).toBeTruthy();
    expect(getByText('2023 Ford · 8,410 mi')).toBeTruthy();
  });
  it('typing a VIN and submitting adds the vehicle and closes', () => {
    const { getByPlaceholderText, getByLabelText, rerender } = render(<AddVehicleSheet />);
    fireEvent.changeText(getByPlaceholderText('1FTVW1EL5NWG00001'), DEMO_VIN);
    rerender(<AddVehicleSheet />);
    fireEvent.press(getByLabelText('Add to garage'));
    expect(useAppStore.getState().vehicles).toHaveLength(4);
    expect(useAppStore.getState().sheet).toBeNull();
  });
  it('scan chip flashes the not-wired message; info opens VIN help', () => {
    const { getByText, getByLabelText } = render(<AddVehicleSheet />);
    fireEvent.press(getByText('Scan'));
    expect(useAppStore.getState().toast).toBe('Camera scan is not wired up in this prototype');
    fireEvent.press(getByLabelText('Where do I find my VIN?'));
    expect(useAppStore.getState().screen).toBe('vinhelp');
    expect(useAppStore.getState().sheet).toBe('add');
  });
});
```

- [ ] **Step 2: Run** `npm test -- AddVehicleSheet` → FAIL.

- [ ] **Step 3: Write `src/screens/AddVehicleSheet.tsx`**

```tsx
import { useEffect } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { DECODE, DEMO_VIN } from '../fixtures/decode';
import { vinOk } from '../lib/derive';
import { useAppStore } from '../store/useAppStore';
import { color, dur, font } from '../theme/tokens';
import { Icon } from '../ui/Icon';
import { Sheet } from '../ui/Sheet';
import { Sans } from '../ui/Txt';

export function AddVehicleSheet() {
  const vin = useAppStore((s) => s.vin);
  const setVin = useAppStore((s) => s.setVin);
  const addVehicle = useAppStore((s) => s.addVehicle);
  const closeSheet = useAppStore((s) => s.closeSheet);
  const openVinHelp = useAppStore((s) => s.openVinHelp);
  const flash = useAppStore((s) => s.flash);
  const raw = vin.trim().toUpperCase();
  const decoded = DECODE[raw];
  const ok = vinOk(raw);

  const info = (
    <Pressable accessibilityLabel="Where do I find my VIN?" onPress={openVinHelp}
      style={{ width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: color.hair14, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="information-line" size={18} color={color.ink2} />
    </Pressable>
  );

  return (
    <Sheet title="Add a vehicle" sub="ENTER VIN · 17 CHARACTERS" action={info} onClose={closeSheet} testID="sheet-add">
      <View style={{ gap: 14, marginTop: 20 }}>
        <TextInput
          value={vin}
          onChangeText={setVin}
          onSubmitEditing={() => { if (ok) addVehicle(); }}
          autoFocus
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="1FTVW1EL5NWG00001"
          placeholderTextColor={color.ink7}
          allowFontScaling={false}
          style={{ fontFamily: font.mono400, fontSize: 15, letterSpacing: 1.2, color: color.ink, paddingVertical: 15, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: color.hair14, backgroundColor: color.input }}
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip icon="file-list-3-line" label="Use sample VIN" onPress={() => setVin(DEMO_VIN)} />
          <Chip icon="camera-line" label="Scan" onPress={() => flash('Camera scan is not wired up in this prototype')} />
        </View>
        {decoded ? <Preview name={decoded.name} meta={decoded.meta} /> : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Add to garage" onPress={() => (ok ? addVehicle() : flash('Enter a VIN first'))}
          style={{ marginTop: 4, alignItems: 'center', paddingVertical: 15, borderRadius: 999, backgroundColor: ok ? color.ink : color.disabled }}>
          <Sans size={14} weight={500} color={ok ? '#fff' : color.disabledInk}>Add to garage</Sans>
        </Pressable>
      </View>
    </Sheet>
  );
}

function Chip({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: color.hair14 }}>
      <Icon name={icon} size={14} color={color.ink2} />
      <Sans size={12} color={color.ink2}>{label}</Sans>
    </Pressable>
  );
}

function Preview({ name, meta }: { name: string; meta: string }) {
  const o = useSharedValue(0);
  useEffect(() => { o.value = withTiming(1, { duration: dur.fade }); }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: color.sunken }, style]}>
      <Icon name="checkbox-circle-fill" size={17} color={color.teal} />
      <View>
        <Sans size={14} weight={500} color={color.ink}>{name}</Sans>
        <Sans size={12} color={color.ink5}>{meta}</Sans>
      </View>
    </Animated.View>
  );
}
```

- [ ] **Step 4: Mount it** — in `OverlayHost.tsx`:

```tsx
import { useAppStore } from '../store/useAppStore';
import { AddVehicleSheet } from '../screens/AddVehicleSheet';
// inside OverlayHost:
const sheet = useAppStore((s) => s.sheet);
// in the JSX, above <Toast />:
{sheet === 'add' && <AddVehicleSheet />}
```

- [ ] **Step 5: Run** `npm test -- AddVehicleSheet && npm run typecheck` → PASS.

- [ ] **Step 6: Verify on the emulator** — tap Add Vehicle → screenshot `t18-sheet-empty.png` vs `sheet-add-empty.png`; tap Use sample VIN → `t18-sheet-sample.png` vs `sheet-add-sample.png`; tap Add to garage → `t18-added.png` vs `garage-added-toast.png`.
Expected: sheet slides up in ~0.3 s over a dimmed, faintly blurred garage; mono VIN field focused with the keyboard up and the sheet above it; the F-150 preview fades in; the CTA turns black; after adding, the rail scrolls to the new "F-150 Lightning" card and the toast reads "F-150 Lightning added · monitoring for recalls".

- [ ] **Step 7: Checkpoint** — "feat: add-vehicle sheet"

---

