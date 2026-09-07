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
