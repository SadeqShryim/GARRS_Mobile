### Task 6: Fixtures and types (verbatim from the design)

**Files:**
- Create: `src/fixtures/types.ts`, `src/fixtures/vehicles.ts`, `src/fixtures/decode.ts`, `src/fixtures/tabs.ts`, `src/fixtures/vinHelp.ts`, `src/fixtures/recallSheet.ts`
- Test: `src/fixtures/__tests__/fixtures.test.ts`

**Interfaces:**
- Produces: `Vehicle`, `Recall`, `TabId`; `SEED_VEHICLES: Vehicle[]`; `DECODE`, `DEMO_VIN`; `TABS: { id: TabId; label: string; on: string; off: string }[]`; `VIN_SPOTS`; `RECALL_ROWS: [string, string][]`.

- [ ] **Step 1: Write the failing test**

```ts
import { SEED_VEHICLES } from '../vehicles';
import { DECODE, DEMO_VIN } from '../decode';
import { TABS } from '../tabs';
import { VIN_SPOTS } from '../vinHelp';
import { RECALL_ROWS } from '../recallSheet';

describe('fixtures', () => {
  it('seeds three vehicles, only the Model S with a recall', () => {
    expect(SEED_VEHICLES.map((v) => v.name)).toEqual(['Model S Plaid', 'Taycan 4S', 'Civic Type R']);
    expect(SEED_VEHICLES[0].recall).toEqual({ code: 'NHTSA 24V-137', title: 'Rear camera image failure' });
    expect(SEED_VEHICLES[1].recall).toBeNull();
  });
  it('decodes the demo VIN to the F-150 Lightning', () => {
    expect(DEMO_VIN).toBe('1FTVW1EL5NWG00001');
    expect(DECODE[DEMO_VIN].name).toBe('F-150 Lightning');
  });
  it('lists the five tabs in order', () => {
    expect(TABS.map((t) => t.id)).toEqual(['garage', 'recalls', 'service', 'hub', 'profile']);
    expect(TABS[0]).toEqual({ id: 'garage', label: 'GARAGE', on: 'inbox-fill', off: 'inbox-line' });
  });
  it('has four VIN spots and four recall rows', () => {
    expect(VIN_SPOTS).toHaveLength(4);
    expect(VIN_SPOTS[0].tag).toBe('MOST COMMON');
    expect(RECALL_ROWS).toEqual([
      ['SEVERITY', 'Safety recall'], ['REMEDY', 'Software update, free'],
      ['DEALER', 'Tesla Service — 6.2 mi'], ['EST. TIME', '45 minutes'],
    ]);
  });
});
```

- [ ] **Step 2: Run it** — `npm test -- fixtures` → FAIL.

- [ ] **Step 3: Write the fixtures**

`src/fixtures/types.ts`:
```ts
export type Recall = { code: string; title: string };
export type Vehicle = {
  id: number; name: string; meta: string; health: number; range: string; vin: string; sync: string;
  recall: Recall | null; odo: number; oilIn: number; tireIn: number; brakeIn: number; regDays: number; psi: string; battery: number;
};
export type TabId = 'garage' | 'recalls' | 'service' | 'hub' | 'profile';
```

`src/fixtures/vehicles.ts` (source line 1247):
```ts
import type { Vehicle } from './types';
export const SEED_VEHICLES: Vehicle[] = [
  { id: 1, name: 'Model S Plaid', meta: '2024 Tesla · 42,000 mi', health: 65, range: '340 mi', vin: '···· F12345', sync: 'SYNCED 2 MIN AGO', recall: { code: 'NHTSA 24V-137', title: 'Rear camera image failure' }, odo: 42000, oilIn: 1200, tireIn: 3400, brakeIn: 9000, regDays: 42, psi: '42 / 40', battery: 92 },
  { id: 2, name: 'Taycan 4S', meta: '2022 Porsche · 17,680 mi', health: 91, range: '227 mi', vin: '···· K88201', sync: 'SYNCED 12 MIN AGO', recall: null, odo: 17680, oilIn: 4300, tireIn: 900, brakeIn: 12000, regDays: 190, psi: '41 / 41', battery: 97 },
  { id: 3, name: 'Civic Type R', meta: '2021 Honda · 31,905 mi', health: 88, range: '402 mi', vin: '···· R55019', sync: 'SYNCED 1 HR AGO', recall: null, odo: 31905, oilIn: 300, tireIn: 2100, brakeIn: 5200, regDays: 12, psi: '38 / 36', battery: 88 },
];
```

`src/fixtures/decode.ts` (lines 1010–1014):
```ts
export type Decoded = { name: string; meta: string; health: number; range: string };
export const DECODE: Record<string, Decoded> = {
  '5YJ3E1EA7KF317726': { name: 'Model 3 Long Range', meta: '2019 Tesla · 61,240 mi', health: 78, range: '310 mi' },
  '1FTVW1EL5NWG00001': { name: 'F-150 Lightning', meta: '2023 Ford · 8,410 mi', health: 94, range: '320 mi' },
};
export const DEMO_VIN = '1FTVW1EL5NWG00001';
```

`src/fixtures/tabs.ts` (line 1132):
```ts
import type { TabId } from './types';
export type TabDef = { id: TabId; label: string; on: string; off: string };
export const TABS: TabDef[] = [
  { id: 'garage', label: 'GARAGE', on: 'inbox-fill', off: 'inbox-line' },
  { id: 'recalls', label: 'RECALLS', on: 'error-warning-fill', off: 'error-warning-line' },
  { id: 'service', label: 'SERVICE', on: 'tools-fill', off: 'tools-line' },
  { id: 'hub', label: 'HUB', on: 'book-2-fill', off: 'book-2-line' },
  { id: 'profile', label: 'PROFILE', on: 'user-fill', off: 'user-line' },
];
```

`src/fixtures/vinHelp.ts` (line 2312 — keep the curly apostrophes):
```ts
export const VIN_SPOTS = [
  { icon: 'window-line', tag: 'MOST COMMON', title: 'Base of the windshield', body: 'Stand outside on the driver’s side and look through the glass at the far corner of the dashboard. A small metal plate is riveted there.' },
  { icon: 'car-line', tag: 'DOOR JAMB', title: 'Driver’s door frame', body: 'Open the driver’s door and check the sticker on the B-pillar or the edge of the door itself, usually beside the tyre pressure label.' },
  { icon: 'file-text-line', tag: 'PAPERWORK', title: 'Registration or insurance', body: 'The VIN is printed on your registration card, title and insurance documents — often the fastest place to read it from.' },
  { icon: 'settings-3-line', tag: 'IN-CAR', title: 'Vehicle software', body: 'Many newer cars list the VIN under Settings, Software or Service info on the centre display.' },
] as const;
```

`src/fixtures/recallSheet.ts` (line 2259):
```ts
export const RECALL_ROWS: [string, string][] = [
  ['SEVERITY', 'Safety recall'],
  ['REMEDY', 'Software update, free'],
  ['DEALER', 'Tesla Service — 6.2 mi'],
  ['EST. TIME', '45 minutes'],
];
```

- [ ] **Step 4: Run** `npm test -- fixtures && npm run typecheck` → PASS.

- [ ] **Step 5: Checkpoint** — "feat: typed demo fixtures copied verbatim from the design"

---

