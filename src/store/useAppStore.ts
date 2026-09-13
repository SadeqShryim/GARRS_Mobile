import { create } from 'zustand';
import { RECALLS_COPY } from '../fixtures/recalls';
import { SEED_VEHICLES } from '../fixtures/vehicles';
import type { LightFilter, PlanId, RecallFilter, SvcMethod, TabId, Vehicle } from '../fixtures/types';
import { decodeVin, maskVin } from '../lib/derive';
import { planToast } from '../lib/membership';
import { bookedToast } from '../lib/service';

export type SheetId = 'add' | 'recall' | 'reason';
export type ScreenId = 'vinhelp' | 'membership' | 'chat' | 'article' | 'scan';
export type PrefKey = 'pfPush' | 'pfEmail' | 'pfBio';

// Slice 4 (spec §10) — VIN scanner: driven entirely through the store so tests
// can walk the screen without a camera.
export type ScanPhase = 'idle' | 'reading' | 'checking' | 'added' | 'failed';
// `toast` is the message `addScannedVehicle` prepares; `finishScan` shows it when the scanner closes, so it never covers the card.
export type ScanState = { phase: ScanPhase; score: number | null; vin: string | null; vehicleName: string | null; reason: string | null; toast: string | null };
export const initialScan = (): ScanState => ({ phase: 'idle', score: null, vin: null, vehicleName: null, reason: null, toast: null });

type State = {
  tab: TabId; idx: number; sheet: SheetId | null; screen: ScreenId | null; scheduled: boolean;
  toast: string | null; vin: string; splash: boolean; vehicles: Vehicle[];
  // Slice 3 (design state, line 1227)
  rFilter: RecallFilter; rOpen: string | null;
  plan: PlanId;
  hubIdx: number; hubGroup: LightFilter; hubLight: string | null; article: string | null;
  svcMethod: SvcMethod; svcDate: string; svcTime: string; svcDone: boolean;
  pfPush: boolean; pfEmail: boolean; pfBio: boolean;
  // Slice 4 (spec §10)
  scan: ScanState;
};
type Actions = {
  switchTab: (tab: TabId) => void; setIdx: (i: number) => void;
  openSheet: (s: SheetId) => void; closeSheet: () => void;
  openScreen: (s: ScreenId) => void; closeScreen: () => void;
  openVinHelp: () => void; closeVinHelp: () => void;
  setVin: (v: string) => void; addVehicle: () => void; schedule: () => void;
  flash: (msg: string) => void; dismissSplash: () => void;
  // Slice 3
  setRecallFilter: (f: RecallFilter) => void; toggleRecall: (id: string) => void; showRecall: (id: string) => void; scheduleFromRecalls: () => void;
  setPlan: (p: PlanId) => void;
  setHubIdx: (i: number) => void; setHubGroup: (g: LightFilter) => void; openLight: (id: string) => void; closeLight: () => void;
  openArticle: (id: string) => void; setArticle: (id: string) => void; closeArticle: () => void;
  setSvcMethod: (m: SvcMethod) => void; setSvcDate: (d: string) => void; setSvcTime: (t: string) => void;
  confirmService: () => void; returnToGarage: () => void;
  togglePref: (k: PrefKey) => void;
  // Slice 4 (spec §10)
  openScan: () => void; setScan: (patch: Partial<ScanState>) => void; resetScan: () => void; finishScan: () => void;
  addScannedVehicle: (v: Vehicle) => void;
};

const initial = (): State => ({
  tab: 'garage', idx: 0, sheet: null, screen: null, scheduled: false, toast: null, vin: '', splash: true,
  vehicles: SEED_VEHICLES.map((v) => ({ ...v })),
  rFilter: 'open', rOpen: null,
  plan: 'pro',
  hubIdx: 0, hubGroup: 'all', hubLight: null, article: null,
  svcMethod: 'dropoff', svcDate: '13', svcTime: '09:30 AM', svcDone: false,
  pfPush: true, pfEmail: true, pfBio: false,
  scan: initialScan(),
});

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useAppStore = create<State & Actions>((set, get) => ({
  ...initial(),
  // tab onTap (line 2366): every overlay closes; rDetail is a route and is popped by the tab bar.
  switchTab: (tab) => set({ tab, sheet: null, screen: null, hubLight: null, article: null, scan: initialScan() }),
  setIdx: (idx) => set({ idx }),
  openSheet: (sheet) => set({ sheet }),
  closeSheet: () => set({ sheet: null }),
  openScreen: (screen) => set({ screen }),
  // Slice 4 (spec §10): closing the scanner also resets its state so reopening starts idle.
  closeScreen: () => set((state) => ({ screen: null, scan: state.screen === 'scan' ? initialScan() : state.scan })),
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
  // Recalls (lines 1401, 1471, 1520, 1552, 1555)
  setRecallFilter: (rFilter) => set({ rFilter, rOpen: null }),
  toggleRecall: (id) => set({ rOpen: get().rOpen === id ? null : id }),
  showRecall: (id) => set({ tab: 'recalls', screen: null, rFilter: 'open', rOpen: id }),
  scheduleFromRecalls: () => { set({ scheduled: true, rFilter: 'scheduled', rOpen: null }); get().flash(RECALLS_COPY.bookedToast); },
  // Membership (lines 2108, 2113)
  setPlan: (plan) => { set({ plan }); get().flash(planToast(plan)); },
  // Hub (lines 1918, 1935, 1944, 1948)
  setHubIdx: (hubIdx) => set({ hubIdx }),
  setHubGroup: (hubGroup) => set({ hubGroup }),
  openLight: (hubLight) => set({ hubLight }),
  closeLight: () => set({ hubLight: null }),
  openArticle: (article) => set({ screen: 'article', article }),
  setArticle: (article) => set({ article }),
  closeArticle: () => set({ screen: null, article: null }),
  // Service (lines 1614, 1624, 1630, 1637, 1675)
  setSvcMethod: (svcMethod) => set({ svcMethod }),
  setSvcDate: (svcDate) => set({ svcDate }),
  setSvcTime: (svcTime) => set({ svcTime }),
  confirmService: () => { const { svcDate, svcTime } = get(); set({ svcDone: true, scheduled: true }); get().flash(bookedToast(svcDate, svcTime)); },
  returnToGarage: () => set({ tab: 'garage', svcDone: false }),
  // Profile (line 1683)
  togglePref: (k) => set({ [k]: !get()[k] } as Partial<State>),
  // Slice 4 (spec §10) — VIN scanner
  openScan: () => set({ screen: 'scan', scan: initialScan() }),
  setScan: (patch) => set({ scan: { ...get().scan, ...patch } }),
  resetScan: () => set({ scan: initialScan() }),
  addScannedVehicle: (v) => {
    const vehicles = [...get().vehicles, v];
    const toast = `${v.name} added · ${v.recall ? '1 recall found' : 'monitoring for recalls'}`;
    set({ vehicles, idx: vehicles.length - 1, screen: null, sheet: null, vin: '', scan: { ...get().scan, toast } });
  },
  // The scanner's every exit (dwell, Done, Close, hardware back): show the prepared toast, then clear the scan.
  finishScan: () => {
    const { toast } = get().scan;
    if (toast) get().flash(toast);
    set({ screen: null, scan: initialScan() });
  },
}));

export function resetAppStore() {
  if (toastTimer) clearTimeout(toastTimer);
  useAppStore.setState(initial());
}
