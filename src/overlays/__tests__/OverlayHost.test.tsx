import { act, render } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { OverlayHost } from '../OverlayHost';
import { resetAppStore, useAppStore } from '../../store/useAppStore';
import type { Vehicle } from '../../fixtures/types';

jest.mock('../../screens/splash/useMarqueeDrive');

type Handler = () => boolean | null | undefined;
const handlers: Handler[] = [];
const pressBack = () => handlers[handlers.length - 1]();
const s = () => useAppStore.getState();
const SCANNED: Vehicle = {
  id: 99, name: 'Accord EX-V6', meta: '2003 Honda · Coupe', health: 90, range: '—', vin: '···· 004352',
  sync: 'SYNCED JUST NOW', recall: null, odo: 8410, oilIn: 4800, tireIn: 2600, brakeIn: 21000, regDays: 240, psi: '40 / 40', battery: 99,
};

beforeEach(() => {
  handlers.length = 0;
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => { handlers.push(handler as Handler); return { remove: jest.fn() }; });
  resetAppStore();
  useAppStore.setState({ splash: false });
  jest.useFakeTimers();
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

describe('OverlayHost mounts', () => {
  it('the light sheet while hubLight is set', () => {
    s().openLight('l1');
    const { getByTestId } = render(<OverlayHost />);
    expect(getByTestId('sheet-light')).toBeTruthy();
  });
  it('the reason sheet, membership, chat and article by state', () => {
    s().openSheet('reason');
    const { getByTestId, rerender } = render(<OverlayHost />);
    expect(getByTestId('sheet-reason')).toBeTruthy();
    act(() => { s().closeSheet(); s().openScreen('membership'); });
    rerender(<OverlayHost />);
    expect(getByTestId('screen-membership')).toBeTruthy();
    act(() => { s().openScreen('chat'); });
    rerender(<OverlayHost />);
    expect(getByTestId('screen-chat')).toBeTruthy();
    act(() => { s().closeScreen(); s().openArticle('a1'); });
    rerender(<OverlayHost />);
    expect(getByTestId('article-reader')).toBeTruthy();
  });
  // Slice 4 (spec §11): the scanner sits above the sheets, and its success card outlives the `screen` flag that
  // `addScannedVehicle` clears.
  it('the VIN scanner while screen is scan, and keeps its card up after the vehicle is added', () => {
    s().openSheet('add'); s().openScan();
    const { getByTestId, queryByTestId, rerender } = render(<OverlayHost />);
    expect(getByTestId('screen-scan')).toBeTruthy();
    act(() => { s().setScan({ phase: 'added', score: 99, vin: '1HGCM82633A004352', vehicleName: SCANNED.name }); s().addScannedVehicle(SCANNED); });
    rerender(<OverlayHost />);
    expect(s()).toMatchObject({ screen: null, sheet: null });
    expect(getByTestId('scan-result')).toBeTruthy();
    act(() => { s().resetScan(); });
    rerender(<OverlayHost />);
    expect(queryByTestId('screen-scan')).toBeNull();
  });
  it('the real Splash while splash is true', () => {
    useAppStore.setState({ splash: true });
    const { getByTestId, getByText } = render(<OverlayHost />);
    expect(getByTestId('stage')).toBeTruthy();
    expect(getByText('REPLAY')).toBeTruthy();
  });
});

describe('OverlayHost hardware back', () => {
  it('closes the add sheet instead of leaving the app', () => {
    s().openSheet('add');
    render(<OverlayHost />);
    expect(pressBack()).toBe(true);
    expect(s().sheet).toBeNull();
  });
  it('closes VIN help first, then the sheet beneath it', () => {
    s().openSheet('add'); s().openVinHelp();
    const { rerender } = render(<OverlayHost />);
    expect(pressBack()).toBe(true);
    expect(s().screen).toBeNull();
    expect(s().sheet).toBe('add');
    rerender(<OverlayHost />);
    expect(pressBack()).toBe(true);
    expect(s().sheet).toBeNull();
  });
  it('closes the article (clearing it), the chat, the membership screen, the light sheet and the reason sheet', () => {
    s().openArticle('a2');
    const { rerender } = render(<OverlayHost />);
    expect(pressBack()).toBe(true);
    expect(s()).toMatchObject({ screen: null, article: null });
    act(() => { s().openScreen('chat'); }); rerender(<OverlayHost />);
    expect(pressBack()).toBe(true); expect(s().screen).toBeNull();
    act(() => { s().openScreen('membership'); }); rerender(<OverlayHost />);
    expect(pressBack()).toBe(true); expect(s().screen).toBeNull();
    act(() => { s().openLight('l3'); }); rerender(<OverlayHost />);
    expect(pressBack()).toBe(true); expect(s().hubLight).toBeNull();
    act(() => { s().openSheet('reason'); }); rerender(<OverlayHost />);
    expect(pressBack()).toBe(true); expect(s().sheet).toBeNull();
  });
  it('closes the scanner, then the success card it leaves behind', () => {
    // The scanner re-renders on every scan patch, so this one presses back inside act().
    const back = () => { let r: boolean | null | undefined; act(() => { r = pressBack(); }); return r; };
    s().openScan();
    const { rerender } = render(<OverlayHost />);
    expect(back()).toBe(true);
    expect(s()).toMatchObject({ screen: null });
    expect(s().scan.phase).toBe('idle');
    act(() => { s().openScan(); s().setScan({ phase: 'added', score: 99, vin: '1HGCM82633A004352', vehicleName: SCANNED.name }); s().addScannedVehicle(SCANNED); });
    rerender(<OverlayHost />);
    expect(back()).toBe(true);
    expect(s().scan.phase).toBe('idle');
  });
  it('lets the system handle back when nothing is open', () => {
    render(<OverlayHost />);
    expect(pressBack()).toBe(false);
  });
});
