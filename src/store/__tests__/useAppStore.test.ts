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
