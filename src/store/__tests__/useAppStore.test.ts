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
