### Task 20: Recall sheet

**Files:**
- Create: `src/screens/RecallSheet.tsx`
- Modify: `src/overlays/OverlayHost.tsx` (add `{sheet === 'recall' && <RecallSheet onDetails={…} />}`)
- Test: `src/screens/__tests__/RecallSheet.test.tsx`

**Interfaces:**
- Consumes: `Sheet`, `RECALL_ROWS`, `MetalButton`, `OutlinePill`, store.
- Produces: `RecallSheet({ onDetails: () => void })`. Source: `recallSheet`, line 2250.

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { RecallSheet } from '../RecallSheet';
import { resetAppStore, useAppStore } from '../../store/useAppStore';

beforeEach(() => { resetAppStore(); useAppStore.getState().openSheet('recall'); });

describe('RecallSheet', () => {
  it('shows the recall title, code line and four rows', () => {
    const { getByText } = render(<RecallSheet onDetails={jest.fn()} />);
    expect(getByText('Rear camera image failure')).toBeTruthy();
    expect(getByText('NHTSA 24V-137 · MODEL S PLAID')).toBeTruthy();
    expect(getByText('Tesla Service — 6.2 mi')).toBeTruthy();
    expect(getByText('45 minutes')).toBeTruthy();
  });
  it('Schedule Repair schedules, closes and toasts; label flips to Scheduled', () => {
    const { getByLabelText, rerender, queryByLabelText } = render(<RecallSheet onDetails={jest.fn()} />);
    fireEvent.press(getByLabelText('Schedule Repair'));
    expect(useAppStore.getState()).toMatchObject({ scheduled: true, sheet: null, toast: 'Service booked · Thu 10:30 AM' });
    useAppStore.getState().openSheet('recall');
    rerender(<RecallSheet onDetails={jest.fn()} />);
    expect(queryByLabelText('Schedule Repair')).toBeNull();
    expect(getByLabelText('Scheduled')).toBeTruthy();
  });
  it('Details closes, switches to recalls, toasts and calls back', () => {
    const onDetails = jest.fn();
    const { getByLabelText } = render(<RecallSheet onDetails={onDetails} />);
    fireEvent.press(getByLabelText('Details'));
    expect(useAppStore.getState()).toMatchObject({ sheet: null, tab: 'recalls', toast: 'NHTSA 24V-137 · opening recall detail' });
    expect(onDetails).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run** `npm test -- RecallSheet` → FAIL.

- [ ] **Step 3: Write `src/screens/RecallSheet.tsx`**

```tsx
import { View } from 'react-native';
import { RECALL_ROWS } from '../fixtures/recallSheet';
import { useAppStore } from '../store/useAppStore';
import { color } from '../theme/tokens';
import { MetalButton } from '../ui/MetalButton';
import { OutlinePill } from '../ui/OutlinePill';
import { Sheet } from '../ui/Sheet';
import { Mono, Sans } from '../ui/Txt';

export function RecallSheet({ onDetails }: { onDetails: () => void }) {
  const v = useAppStore((s) => s.vehicles.find((x) => x.recall));
  const scheduled = useAppStore((s) => s.scheduled);
  const schedule = useAppStore((s) => s.schedule);
  const closeSheet = useAppStore((s) => s.closeSheet);
  const switchTab = useAppStore((s) => s.switchTab);
  const flash = useAppStore((s) => s.flash);
  if (!v || !v.recall) return null;
  const r = v.recall;
  return (
    <Sheet title={r.title} sub={r.code + ' · ' + v.name.toUpperCase()} onClose={closeSheet} testID="sheet-recall">
      <View style={{ marginTop: 18 }}>
        {RECALL_ROWS.map(([k, val]) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: color.hair07 }}>
            <Mono size={10} ls={1.2} color={color.ink3}>{k}</Mono>
            <Sans size={13} color={color.ink}>{val}</Sans>
          </View>
        ))}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
          <MetalButton tint="blue" label={scheduled ? 'Scheduled' : 'Schedule Repair'} icon="calendar-2-line" flex={1.5} width="auto" height={54} radius={16} gap={9} iconSize={17} fontSize={15}
            onPress={() => { schedule(); closeSheet(); flash('Service booked · Thu 10:30 AM'); }} />
          <OutlinePill label="Details" icon="arrow-right-up-line" height={54}
            onPress={() => { closeSheet(); switchTab('recalls'); flash(r.code + ' · opening recall detail'); onDetails(); }} />
        </View>
      </View>
    </Sheet>
  );
}
```

- [ ] **Step 4: Mount it** — in `OverlayHost.tsx`:

```tsx
import { useRouter } from 'expo-router';
import { RecallSheet } from '../screens/RecallSheet';
// inside OverlayHost:
const router = useRouter();
// JSX, after the add sheet:
{sheet === 'recall' && <RecallSheet onDetails={() => router.navigate('/(tabs)/recalls')} />}
```

- [ ] **Step 5: Run** `npm test -- RecallSheet && npm run typecheck` → PASS.

- [ ] **Step 6: Verify on the emulator** — tap the alert row → screenshot `t20-recall.png` vs `sheet-recall.png`. Tap Schedule Repair.
Expected: sheet with the four hairline rows, a wide blue metal "Schedule Repair" (54 tall, radius 16) beside an outlined "Details"; after scheduling: toast, the Model S card loses its glow and reads "No recalls / Monitored" with a grey "Open" pill, the alert list becomes "Nothing outstanding across your fleet.", the fleet line reads "3 VEHICLES · ALL CLEAR"; reopening from a card is no longer possible (no open recall), which matches the design.

- [ ] **Step 7: Checkpoint** — "feat: recall sheet"

---

