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

describe('store — Slice 3', () => {
  it('starts with the design defaults', () => {
    expect(s()).toMatchObject({ rFilter: 'open', rOpen: null, plan: 'pro', hubIdx: 0, hubGroup: 'all', hubLight: null, article: null, svcMethod: 'dropoff', svcDate: '13', svcTime: '09:30 AM', svcDone: false, pfPush: true, pfEmail: true, pfBio: false });
  });
  it('recall filter, toggle, showRecall and scheduleFromRecalls', () => {
    s().toggleRecall('v1'); expect(s().rOpen).toBe('v1');
    s().toggleRecall('v1'); expect(s().rOpen).toBeNull();
    s().toggleRecall('h1'); s().setRecallFilter('closed');
    expect(s()).toMatchObject({ rFilter: 'closed', rOpen: null });
    s().showRecall('v1');
    expect(s()).toMatchObject({ tab: 'recalls', screen: null, rFilter: 'open', rOpen: 'v1' });
    s().scheduleFromRecalls();
    expect(s()).toMatchObject({ scheduled: true, rFilter: 'scheduled', rOpen: null, toast: 'Service booked · Thu 10:30 AM' });
  });
  it('setPlan toasts the plan name', () => {
    s().setPlan('plus');
    expect(s()).toMatchObject({ plan: 'plus', toast: 'Plus membership active' });
  });
  it('hub: index, group, light sheet, article screen', () => {
    s().setHubIdx(2); s().setHubGroup('warning'); s().openLight('l8');
    expect(s()).toMatchObject({ hubIdx: 2, hubGroup: 'warning', hubLight: 'l8' });
    s().closeLight(); expect(s().hubLight).toBeNull();
    s().openArticle('a2'); expect(s()).toMatchObject({ screen: 'article', article: 'a2' });
    s().setArticle('a3'); expect(s().article).toBe('a3');
    s().closeArticle(); expect(s()).toMatchObject({ screen: null, article: null });
  });
  it('service: selections, confirm toasts the chosen slot, return resets the form', () => {
    s().setSvcMethod('concierge'); s().setSvcDate('15'); s().setSvcTime('02:30 PM');
    s().confirmService();
    expect(s()).toMatchObject({ svcDone: true, scheduled: true, toast: 'Service booked · Tuesday, Oct 15 at 02:30 PM' });
    s().returnToGarage();
    expect(s()).toMatchObject({ tab: 'garage', svcDone: false });
  });
  it('togglePref flips one preference', () => {
    s().togglePref('pfBio'); expect(s().pfBio).toBe(true);
    s().togglePref('pfPush'); expect(s().pfPush).toBe(false);
    expect(s().pfEmail).toBe(true);
  });
  it('switchTab also closes the light sheet and the article', () => {
    s().openLight('l1'); s().openArticle('a1');
    s().switchTab('hub');
    expect(s()).toMatchObject({ tab: 'hub', sheet: null, screen: null, hubLight: null, article: null });
  });
  it('openScreen / closeScreen', () => {
    s().openScreen('chat'); expect(s().screen).toBe('chat');
    s().closeScreen(); expect(s().screen).toBeNull();
    s().openSheet('reason'); expect(s().sheet).toBe('reason');
  });
});

describe('Slice 4 — scan', () => {
  it('openScan sets the screen and the idle scan state', () => {
    s().setScan({ phase: 'reading', score: 42 });
    s().openScan();
    expect(s().screen).toBe('scan');
    expect(s().scan).toEqual({ phase: 'idle', score: null, vin: null, vehicleName: null, reason: null, toast: null });
  });
  it('setScan merges a patch without dropping other fields', () => {
    s().openScan();
    s().setScan({ phase: 'reading' });
    expect(s().scan).toMatchObject({ phase: 'reading', score: null, vin: null, vehicleName: null, reason: null, toast: null });
    s().setScan({ score: 96, vin: '1HGCM82633A004352' });
    expect(s().scan).toMatchObject({ phase: 'reading', score: 96, vin: '1HGCM82633A004352' });
  });
  it('resetScan restores the idle state', () => {
    s().setScan({ phase: 'failed', reason: 'Confidence below 90 %' });
    s().resetScan();
    expect(s().scan).toEqual({ phase: 'idle', score: null, vin: null, vehicleName: null, reason: null, toast: null });
  });
  it('addScannedVehicle with a recall: appends, selects it, closes overlays, toasts "1 recall found"', () => {
    s().openSheet('add'); s().openScan(); s().setVin('1HGCM82633A004352');
    const v = { id: 99, name: 'Accord EX-V6', meta: '2003 Honda · Coupe', health: 90, range: '—', vin: '···· 04352', sync: 'SYNCED JUST NOW', recall: { code: '19V-182', title: 'Airbag' }, odo: 8410, oilIn: 4800, tireIn: 2600, brakeIn: 21000, regDays: 240, psi: '40 / 40', battery: 99 };
    s().addScannedVehicle(v);
    expect(s().vehicles).toHaveLength(4);
    expect(s().vehicles[3]).toEqual(v);
    expect(s().idx).toBe(3);
    expect(s().sheet).toBeNull();
    expect(s().screen).toBeNull();
    expect(s().vin).toBe('');
    // the toast is prepared, not shown: it would cover the success card. finishScan (dwell / Done / back) shows it.
    expect(s().toast).toBeNull();
    expect(s().scan.toast).toBe('Accord EX-V6 added · 1 recall found');
    s().finishScan();
    expect(s().toast).toBe('Accord EX-V6 added · 1 recall found');
    expect(s().scan).toEqual({ phase: 'idle', score: null, vin: null, vehicleName: null, reason: null, toast: null });
    jest.advanceTimersByTime(2200);
    expect(s().toast).toBeNull();
  });
  it('addScannedVehicle without a recall toasts "monitoring for recalls"', () => {
    const v = { id: 100, name: 'New Vehicle', meta: 'Decoded from VIN', health: 90, range: '—', vin: '···· FGHIJK', sync: 'SYNCED JUST NOW', recall: null, odo: 8410, oilIn: 4800, tireIn: 2600, brakeIn: 21000, regDays: 240, psi: '40 / 40', battery: 99 };
    s().addScannedVehicle(v);
    expect(s().scan.toast).toBe('New Vehicle added · monitoring for recalls');
    s().finishScan();
    expect(s().toast).toBe('New Vehicle added · monitoring for recalls');
  });
  it('finishScan without a prepared toast just clears the scan and the screen', () => {
    s().openScan(); s().setScan({ phase: 'failed', score: 59 });
    s().finishScan();
    expect(s().toast).toBeNull();
    expect(s().screen).toBeNull();
    expect(s().scan.phase).toBe('idle');
  });
  it('closeScreen after openScan resets the screen and the scan state', () => {
    s().openScan(); s().setScan({ phase: 'added', score: 96 });
    s().closeScreen();
    expect(s().screen).toBeNull();
    expect(s().scan).toEqual({ phase: 'idle', score: null, vin: null, vehicleName: null, reason: null, toast: null });
  });
  it('switchTab after openScan clears the screen', () => {
    s().openScan(); s().setScan({ phase: 'checking' });
    s().switchTab('hub');
    expect(s().screen).toBeNull();
    expect(s().scan).toEqual({ phase: 'idle', score: null, vin: null, vehicleName: null, reason: null, toast: null });
  });
});
