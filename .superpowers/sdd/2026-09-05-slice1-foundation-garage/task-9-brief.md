### Task 9: The store

**Files:**
- Create: `src/store/useAppStore.ts`
- Test: `src/store/__tests__/useAppStore.test.ts`

**Interfaces:**
- Consumes: `Vehicle`, `TabId`, `SEED_VEHICLES`, `decodeVin`, `maskVin`.
- Produces: `useAppStore` (zustand hook) with state `{ tab, idx, sheet, screen, scheduled, toast, vin, splash, vehicles }` and actions `switchTab(tab)`, `setIdx(i)`, `openSheet('add'|'recall')`, `closeSheet()`, `openVinHelp()`, `closeVinHelp()`, `setVin(v)`, `addVehicle()`, `schedule()`, `flash(msg)`, `dismissSplash()`; plus `resetAppStore()` for tests. `openVinHelp` leaves `sheet` untouched (the design keeps the add sheet mounted under VIN help).

- [ ] **Step 1: Write the failing tests**

```ts
import { DEMO_VIN } from '../../fixtures/decode';
import { resetAppStore, useAppStore } from '../useAppStore';

const s = () => useAppStore.getState();

beforeEach(() => { resetAppStore(); jest.useFakeTimers(); });
afterEach(() => jest.useRealTimers());

describe('store', () => {
  it('starts on garage with the splash up', () => {
    expect(s().tab).toBe('garage');
    expect(s().splash).toBe(true);
    expect(s().vehicles).toHaveLength(3);
  });
  it('flash shows a toast for 2200ms and cancels the previous timer', () => {
    s().flash('one');
    expect(s().toast).toBe('one');
    jest.advanceTimersByTime(2199);
    expect(s().toast).toBe('one');
    jest.advanceTimersByTime(1);
    expect(s().toast).toBeNull();
    s().flash('a'); jest.advanceTimersByTime(1000); s().flash('b'); jest.advanceTimersByTime(1500);
    expect(s().toast).toBe('b');
  });
  it('addVehicle decodes the sample VIN, appends, selects it, closes the sheet, toasts', () => {
    s().openSheet('add'); s().setVin(DEMO_VIN); s().addVehicle();
    const v = s().vehicles[3];
    expect(s().vehicles).toHaveLength(4);
    expect(v).toMatchObject({ name: 'F-150 Lightning', vin: '···· G00001', sync: 'SYNCED JUST NOW', recall: null, odo: 8410, oilIn: 4800, tireIn: 2600, brakeIn: 21000, regDays: 240, psi: '40 / 40', battery: 99 });
    expect(s().idx).toBe(3);
    expect(s().sheet).toBeNull();
    expect(s().vin).toBe('');
    expect(s().toast).toBe('F-150 Lightning added · monitoring for recalls');
  });
  it('addVehicle falls back for unknown VINs and uppercases', () => {
    s().setVin(' abcdefghijk '); s().addVehicle();
    expect(s().vehicles[3]).toMatchObject({ name: 'New Vehicle', meta: 'Decoded from VIN', health: 90, range: '—', vin: '···· FGHIJK' });
  });
  it('switchTab clears overlays', () => {
    s().openSheet('add'); s().openVinHelp();
    expect(s().sheet).toBe('add'); expect(s().screen).toBe('vinhelp');
    s().switchTab('recalls');
    expect(s()).toMatchObject({ tab: 'recalls', sheet: null, screen: null });
  });
  it('schedule and dismissSplash', () => {
    s().schedule(); expect(s().scheduled).toBe(true);
    s().dismissSplash(); expect(s().splash).toBe(false);
  });
});
```

- [ ] **Step 2: Run** `npm test -- useAppStore` → FAIL.

- [ ] **Step 3: Write `src/store/useAppStore.ts`**

```ts
import { create } from 'zustand';
import { SEED_VEHICLES } from '../fixtures/vehicles';
import type { TabId, Vehicle } from '../fixtures/types';
import { decodeVin, maskVin } from '../lib/derive';

export type SheetId = 'add' | 'recall';
export type ScreenId = 'vinhelp';

type State = {
  tab: TabId; idx: number; sheet: SheetId | null; screen: ScreenId | null; scheduled: boolean;
  toast: string | null; vin: string; splash: boolean; vehicles: Vehicle[];
};
type Actions = {
  switchTab: (tab: TabId) => void; setIdx: (i: number) => void;
  openSheet: (s: SheetId) => void; closeSheet: () => void;
  openVinHelp: () => void; closeVinHelp: () => void;
  setVin: (v: string) => void; addVehicle: () => void; schedule: () => void;
  flash: (msg: string) => void; dismissSplash: () => void;
};

const initial = (): State => ({
  tab: 'garage', idx: 0, sheet: null, screen: null, scheduled: false, toast: null, vin: '', splash: true,
  vehicles: SEED_VEHICLES.map((v) => ({ ...v })),
});

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useAppStore = create<State & Actions>((set, get) => ({
  ...initial(),
  switchTab: (tab) => set({ tab, sheet: null, screen: null }),
  setIdx: (idx) => set({ idx }),
  openSheet: (sheet) => set({ sheet }),
  closeSheet: () => set({ sheet: null }),
  openVinHelp: () => set({ screen: 'vinhelp' }),
  closeVinHelp: () => set({ screen: null }),
  setVin: (vin) => set({ vin }),
  schedule: () => set({ scheduled: true }),
  dismissSplash: () => set({ splash: false }),
  flash: (msg) => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: msg });
    toastTimer = setTimeout(() => set({ toast: null }), 2200);
  },
  addVehicle: () => {
    const raw = get().vin.trim().toUpperCase();
    const d = decodeVin(raw);
    const v: Vehicle = {
      id: Date.now(), name: d.name, meta: d.meta, health: d.health, range: d.range,
      vin: maskVin(raw), sync: 'SYNCED JUST NOW', recall: null,
      odo: 8410, oilIn: 4800, tireIn: 2600, brakeIn: 21000, regDays: 240, psi: '40 / 40', battery: 99,
    };
    const vehicles = [...get().vehicles, v];
    set({ vehicles, sheet: null, vin: '', idx: vehicles.length - 1 });
    get().flash(d.name + ' added · monitoring for recalls');
  },
}));

export function resetAppStore() {
  if (toastTimer) clearTimeout(toastTimer);
  useAppStore.setState(initial());
}
```

- [ ] **Step 4: Run** `npm test -- useAppStore && npm run typecheck` → PASS.

- [ ] **Step 5: Checkpoint** — "feat: zustand store mirroring the design's state"

---

