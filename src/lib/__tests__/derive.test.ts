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
