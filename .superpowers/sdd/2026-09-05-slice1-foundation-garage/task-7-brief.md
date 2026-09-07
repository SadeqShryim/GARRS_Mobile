### Task 7: Derivations

**Files:**
- Create: `src/lib/derive.ts`
- Test: `src/lib/__tests__/derive.test.ts`

**Interfaces:**
- Consumes: `Vehicle`, `DECODE`, `Decoded`.
- Produces: `isOpenRecall(v, scheduled)`, `recallCount(vs, scheduled)`, `fleetLine(vs, scheduled)`, `counter(idx, n)`, `vinOk(raw)`, `maskVin(raw)`, `decodeVin(raw): Decoded`, `statsFor(v, scheduled): Stats` where
  `Stats = { name, metaUpper, hasRecall, recallCode, recallTitle, clearTitle, clearMeta, word, gaugeColor, summary, tiles: { icon, tone, label, value, note }[], service: { key, label, due, pct: number, tone, meta }[] }`.

- [ ] **Step 1: Write the failing tests**

```ts
import { SEED_VEHICLES } from '../../fixtures/vehicles';
import { DEMO_VIN } from '../../fixtures/decode';
import { counter, decodeVin, fleetLine, maskVin, statsFor, vinOk } from '../derive';

const [modelS, taycan, civic] = SEED_VEHICLES;

describe('fleetLine / counter', () => {
  it('counts open recalls', () => expect(fleetLine(SEED_VEHICLES, false)).toBe('3 VEHICLES · 1 RECALL'));
  it('is all clear once scheduled', () => expect(fleetLine(SEED_VEHICLES, true)).toBe('3 VEHICLES · ALL CLEAR'));
  it('singular vehicle', () => expect(fleetLine([taycan], false)).toBe('1 VEHICLE · ALL CLEAR'));
  it('zero-pads the counter', () => expect(counter(0, 3)).toBe('01 / 03'));
});

describe('vin helpers', () => {
  it('vinOk needs 11+ chars', () => {
    expect(vinOk('')).toBe(false);
    expect(vinOk('1234567890')).toBe(false);
    expect(vinOk('12345678901')).toBe(true);
  });
  it('masks to the last six', () => expect(maskVin(DEMO_VIN)).toBe('···· G00001'));
  it('decodes known and falls back', () => {
    expect(decodeVin(DEMO_VIN).name).toBe('F-150 Lightning');
    expect(decodeVin('ABCDEFGHIJK')).toEqual({ name: 'New Vehicle', meta: 'Decoded from VIN', health: 90, range: '—' });
  });
});

describe('statsFor — Model S (open recall)', () => {
  const s = statsFor(modelS, false);
  it('header + recall', () => {
    expect(s.metaUpper).toBe('2024 TESLA · 42,000 MI · VIN ···· F12345');
    expect(s.hasRecall).toBe(true);
    expect(s.recallCode).toBe('NHTSA 24V-137');
    expect(s.word).toBe('Fair');
    expect(s.gaugeColor).toBe('#0F638F');
    expect(s.summary).toBe('One open safety recall is holding this score down. Everything else is inside spec.');
  });
  it('tiles', () => {
    expect(s.tiles.map((t) => [t.label, t.value, t.note, t.tone])).toEqual([
      ['ODOMETER', '42,000 mi', 'Read 2 min ago', '#57565e'],
      ['NEXT OIL CHANGE', '1,200 mi', 'On schedule', '#c98a1f'],
      ['TIRE ROTATION', '3,400 mi', 'Pressure 42 / 40 psi', '#01a08c'],
      ['BATTERY HEALTH', '92%', 'Registration in 42 days', '#01a08c'],
    ]);
  });
  it('service rows', () => {
    expect(s.service.map((m) => [m.label, m.due, m.pct, m.tone, m.meta])).toEqual([
      ['Oil & filter', 'in 1,200 mi', 80, '#c98a1f', 'LAST DONE AT 37,200 MI'],
      ['Tire rotation', 'in 3,400 mi', 43, '#01a08c', 'LAST DONE AT 39,400 MI'],
      ['Brake fluid', 'in 9,000 mi', 63, '#01a08c', 'LAST DONE AT 27,000 MI'],
    ]);
  });
  it('scheduled flips to the clear row', () => {
    const t = statsFor(modelS, true);
    expect(t.hasRecall).toBe(false);
    expect(t.clearTitle).toBe('Recall remedy scheduled');
    expect(t.clearMeta).toBe('THU 10:30 AM · NHTSA 24V-137');
  });
});

describe('statsFor — Taycan and Civic', () => {
  it('taycan is excellent and clear', () => {
    const s = statsFor(taycan, false);
    expect([s.word, s.gaugeColor, s.clearTitle, s.clearMeta]).toEqual(['Excellent', '#01a08c', 'No open recalls', '12 MIN AGO']);
    expect(s.summary).toBe('All monitored systems are inside spec for a 2022 at this mileage.');
    expect(s.tiles[2].tone).toBe('#c98a1f');
  });
  it('civic flags oil and registration', () => {
    const s = statsFor(civic, false);
    expect([s.word, s.gaugeColor]).toEqual(['Good', '#01a08c']);
    expect(s.tiles[1]).toMatchObject({ note: 'Overdue soon', tone: '#D0021B' });
    expect(s.tiles[3]).toMatchObject({ note: 'Registration due in 12 days', tone: '#c98a1f' });
  });
});
```

- [ ] **Step 2: Run** `npm test -- derive` → FAIL.

- [ ] **Step 3: Write `src/lib/derive.ts`** (mirrors `renderVals` line 2330 and `statsFor` line 1380)

```ts
import { DECODE, type Decoded } from '../fixtures/decode';
import type { Vehicle } from '../fixtures/types';

export const isOpenRecall = (v: Vehicle, scheduled: boolean) => !!v.recall && !scheduled;
export const recallCount = (vs: Vehicle[], scheduled: boolean) => vs.filter((v) => isOpenRecall(v, scheduled)).length;

export function fleetLine(vs: Vehicle[], scheduled: boolean) {
  const n = vs.length;
  const rc = recallCount(vs, scheduled);
  return n + (n === 1 ? ' VEHICLE · ' : ' VEHICLES · ') + (rc ? rc + ' RECALL' : 'ALL CLEAR');
}

export const counter = (idx: number, n: number) => String(idx + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0');
export const vinOk = (raw: string) => raw.length >= 11;
export const maskVin = (raw: string) => '···· ' + raw.slice(-6);
export const decodeVin = (raw: string): Decoded => DECODE[raw] ?? { name: 'New Vehicle', meta: 'Decoded from VIN', health: 90, range: '—' };

const mi = (n: number) => n.toLocaleString('en-US') + ' mi';
const tone = (n: number, warn: number, bad: number) => (n <= bad ? '#D0021B' : n <= warn ? '#c98a1f' : '#01a08c');

export type StatTile = { icon: string; tone: string; label: string; value: string; note: string };
export type ServiceRow = { key: string; label: string; due: string; pct: number; tone: string; meta: string };
export type Stats = {
  name: string; metaUpper: string; hasRecall: boolean; recallCode: string; recallTitle: string;
  clearTitle: string; clearMeta: string; word: string; gaugeColor: string; summary: string;
  tiles: StatTile[]; service: ServiceRow[];
};

export function statsFor(v: Vehicle, scheduled: boolean): Stats {
  const open = isOpenRecall(v, scheduled);
  const word = v.health >= 90 ? 'Excellent' : v.health >= 80 ? 'Good' : v.health >= 65 ? 'Fair' : 'Needs work';
  const gaugeColor = v.health >= 80 ? '#01a08c' : v.health >= 65 ? '#0F638F' : '#D0021B';
  const due = [
    { key: 'oil', label: 'Oil & filter', in: v.oilIn, span: 6000, warn: 1500, bad: 500 },
    { key: 'tire', label: 'Tire rotation', in: v.tireIn, span: 6000, warn: 1500, bad: 500 },
    { key: 'brake', label: 'Brake fluid', in: v.brakeIn, span: 24000, warn: 6000, bad: 2000 },
  ];
  return {
    name: v.name,
    metaUpper: v.meta.toUpperCase() + ' · VIN ' + v.vin,
    hasRecall: open,
    recallCode: open && v.recall ? v.recall.code : '',
    recallTitle: open && v.recall ? v.recall.title : '',
    clearTitle: v.recall ? 'Recall remedy scheduled' : 'No open recalls',
    clearMeta: v.recall ? 'THU 10:30 AM · ' + v.recall.code : v.sync.replace('SYNCED ', ''),
    word,
    gaugeColor,
    summary: open
      ? 'One open safety recall is holding this score down. Everything else is inside spec.'
      : 'All monitored systems are inside spec for a ' + v.meta.split(' ')[0] + ' at this mileage.',
    tiles: [
      { icon: 'dashboard-3-line', tone: '#57565e', label: 'ODOMETER', value: mi(v.odo), note: 'Read ' + v.sync.replace('SYNCED ', '').toLowerCase() },
      { icon: 'oil-line', tone: tone(v.oilIn, 1500, 500), label: 'NEXT OIL CHANGE', value: mi(v.oilIn), note: v.oilIn <= 500 ? 'Overdue soon' : 'On schedule' },
      { icon: 'loader-2-line', tone: tone(v.tireIn, 1500, 500), label: 'TIRE ROTATION', value: mi(v.tireIn), note: 'Pressure ' + v.psi + ' psi' },
      { icon: 'battery-charge-line', tone: tone(v.battery, 90, 80), label: 'BATTERY HEALTH', value: v.battery + '%', note: v.regDays <= 30 ? 'Registration due in ' + v.regDays + ' days' : 'Registration in ' + v.regDays + ' days' },
    ],
    service: due.map((d) => ({
      key: d.key,
      label: d.label,
      due: 'in ' + d.in.toLocaleString('en-US') + ' mi',
      pct: Math.max(4, Math.min(100, Math.round(100 - (d.in / d.span) * 100))),
      tone: tone(d.in, d.warn, d.bad),
      meta: 'LAST DONE AT ' + mi(v.odo - (d.span - d.in)).toUpperCase(),
    })),
  };
}
```

- [ ] **Step 4: Run** `npm test -- derive && npm run typecheck` → PASS.

- [ ] **Step 5: Checkpoint** — "feat: pure derivations mirroring renderVals and statsFor"

---

