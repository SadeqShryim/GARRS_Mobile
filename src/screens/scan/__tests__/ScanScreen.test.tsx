import { act, fireEvent, render } from '@testing-library/react-native';
import { Linking } from 'react-native';
import decodeHonda from '../../../lib/__tests__/fixtures/nhtsa/decode-1HGCM82633A004352.json';
import recallsHonda2003 from '../../../lib/__tests__/fixtures/nhtsa/recalls-make-honda_model-accord_modelYear-2003.json';
import lab from '../../../lib/__tests__/fixtures/ocr-lab.json';
import { resetAppStore, useAppStore } from '../../../store/useAppStore';
import { ADDED_DWELL_MS, ScanScreen } from '../ScanScreen';
import { REASONS } from '../scanFlow';

// The camera, the image manipulator and the WebView are the mocks from jest.setup.ts (spec §14): the camera hands
// back a 4000×3000 still, the manipulator a 1400-wide JPEG as base64 'QUJD', and the WebView records `onMessage`
// so the OCR protocol can be driven by hand. NHTSA is a fetch stub over the recorded fixtures.
type CameraMock = {
  state: { permission: { granted: boolean; status: string; canAskAgain: boolean; expires?: string } };
  request: jest.Mock;
  takePictureAsync: jest.Mock;
};
type WebViewMock = {
  hooks: { onMessage: ((e: { nativeEvent: { data: string } }) => void) | null; injected: string[] };
  post: (m: unknown) => void;
};
const cam = (jest.requireMock('expo-camera') as { __cameraMock: CameraMock }).__cameraMock;
const web = (jest.requireMock('react-native-webview') as { __webviewMock: WebViewMock }).__webviewMock;

const GRANTED = { granted: true, status: 'granted', canAskAgain: true, expires: 'never' };
const HONDA = '1HGCM82633A004352';
const s = () => useAppStore.getState();

const labRow = (plate: string, vin: string) => {
  const r = lab.find((x) => x.plate === plate && x.vin === vin);
  if (!r) throw new Error('no lab row for ' + plate + ' ' + vin);
  return r;
};
const post = (m: unknown) => act(() => { web.post(m); });
const settle = async () => { await act(async () => {}); };
/** The whole read: the engine answers request #1 (one provider mount = one id), then NHTSA answers. */
const answerRead = async (plate: string, vin: string) => {
  const r = labRow(plate, vin);
  await act(async () => { web.post({ type: 'result', id: 1, text: r.text, symbols: r.symbols, ms: 10 }); });
  await settle();
};

const honda = jest.fn(async (url: string) => {
  if (url.includes('DecodeVinValues')) return { ok: true, status: 200, json: async () => decodeHonda } as Response;
  if (url.includes('recallsByVehicle')) return { ok: true, status: 200, json: async () => ({ Count: 1, results: [recallsHonda2003.results[0]] }) } as Response;
  throw new Error('unexpected url: ' + url);
});

const realFetch = globalThis.fetch;

beforeEach(() => {
  jest.useFakeTimers();
  resetAppStore();
  s().openScan();
  cam.state.permission = { ...GRANTED };
  cam.request.mockClear();
  cam.takePictureAsync.mockClear();
  honda.mockClear();
  web.hooks.injected.length = 0;
  web.hooks.onMessage = null;
  globalThis.fetch = honda as unknown as typeof fetch;
});

afterEach(() => {
  jest.useRealTimers();
  globalThis.fetch = realFetch;
  cam.state.permission = { ...GRANTED };
  jest.restoreAllMocks();
});

describe('ScanScreen — the live camera (§11)', () => {
  it('shows the camera, the guide, the framing copy and the Capture button', () => {
    const { getByTestId, getByText, getByLabelText } = render(<ScanScreen />);
    expect(getByTestId('screen-scan')).toBeTruthy();
    expect(getByTestId('camera-view')).toBeTruthy();
    expect(getByTestId('scan-guide')).toBeTruthy();
    expect(getByTestId('ocr-webview')).toBeTruthy();
    expect(getByText('SCAN VIN')).toBeTruthy();
    expect(getByText('Line up the VIN inside the frame')).toBeTruthy();
    expect(getByText('Dashboard plate, door sticker or registration card')).toBeTruthy();
    expect(getByLabelText('Capture')).toBeTruthy();
    expect(getByLabelText('Close')).toBeTruthy();
    expect(getByLabelText('Torch')).toBeTruthy();
  });

  it('reports the reader booting, then ready, then broken', () => {
    const { getByTestId } = render(<ScanScreen />);
    expect(getByTestId('scan-status').props.children).toBe('PREPARING READER · 0%');
    post({ type: 'progress', status: 'loading language traineddata', progress: 0.62 });
    expect(getByTestId('scan-status').props.children).toBe('PREPARING READER · 62%');
    post({ type: 'ready' });
    expect(getByTestId('scan-status').props.children).toBe('READER READY');
    post({ type: 'error', message: 'load' });
    expect(getByTestId('scan-status').props.children).toBe('READER UNAVAILABLE');
  });

  it('closes on the header button and resets the scan', () => {
    const { getByLabelText } = render(<ScanScreen />);
    fireEvent.press(getByLabelText('Close'));
    expect(s().screen).toBeNull();
    expect(s().scan.phase).toBe('idle');
  });
});

describe('ScanScreen — permission (§11)', () => {
  it('asks for the camera when the answer is a denial that can be asked again', () => {
    cam.state.permission = { granted: false, status: 'denied', canAskAgain: true };
    const { getByText, getByLabelText, queryByTestId } = render(<ScanScreen />);
    expect(queryByTestId('camera-view')).toBeNull();
    expect(getByText('Camera access is needed to scan your VIN')).toBeTruthy();
    fireEvent.press(getByLabelText('Allow camera'));
    expect(cam.request).toHaveBeenCalled();
  });

  it('sends the user to Settings once the OS will not ask again', () => {
    cam.state.permission = { granted: false, status: 'denied', canAskAgain: false };
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    const { getByLabelText, queryByLabelText } = render(<ScanScreen />);
    expect(queryByLabelText('Allow camera')).toBeNull();
    fireEvent.press(getByLabelText('Open settings'));
    expect(openSettings).toHaveBeenCalled();
  });
});

describe('ScanScreen — capture (§4, §11)', () => {
  it('walks idle → reading → added and shows the match card, then closes itself', async () => {
    const { getByLabelText, getByTestId, getByText, queryByTestId } = render(<ScanScreen />);
    post({ type: 'ready' });
    fireEvent.press(getByLabelText('Capture'));
    await settle();

    expect(cam.takePictureAsync).toHaveBeenCalledTimes(1);
    expect(web.hooks.injected).toHaveLength(1);
    expect(web.hooks.injected[0]).toContain('window.__ocr.recognize(1, "data:image/jpeg;base64,QUJD")');
    expect(s().scan.phase).toBe('reading');
    expect(getByText('Reading VIN…')).toBeTruthy();
    expect(getByTestId('scan-crop')).toBeTruthy();
    expect(queryByTestId('scan-line')).toBeTruthy();

    await answerRead('sticker', HONDA);

    expect(getByTestId('scan-result')).toBeTruthy();
    expect(getByText('99% MATCH')).toBeTruthy();
    expect(getByText('1HGC M826 33A0 0435 2')).toBeTruthy();
    expect(getByText('Accord EX-V6')).toBeTruthy();
    expect(getByText('2003 Honda · Coupe')).toBeTruthy();
    expect(getByText('1 open recall — NHTSA 19V-182')).toBeTruthy();
    expect(getByText('Added to your garage')).toBeTruthy();
    // addScannedVehicle already landed: the vehicle is in the garage, the rail is on it, the sheet is gone.
    expect(s().vehicles).toHaveLength(4);
    expect(s()).toMatchObject({ idx: 3, sheet: null, screen: null });
    // the toast waits for the card to leave, so it never covers the card's recall line
    expect(s().toast).toBeNull();

    act(() => { jest.advanceTimersByTime(ADDED_DWELL_MS); });
    expect(s().scan.phase).toBe('idle');
    expect(s().screen).toBeNull();
    expect(s().toast).toBe('Accord EX-V6 added · 1 recall found');
  });

  it('Done closes the card without waiting for the dwell', async () => {
    const { getByLabelText } = render(<ScanScreen />);
    post({ type: 'ready' });
    fireEvent.press(getByLabelText('Capture'));
    await settle();
    await answerRead('sticker', HONDA);
    fireEvent.press(getByLabelText('Done'));
    expect(s().scan.phase).toBe('idle');
  });

  it('shows the TOO LOW card for a read that fails the check digit, and Try again returns to the camera', async () => {
    const { getByLabelText, getByTestId, getByText, queryByTestId } = render(<ScanScreen />);
    post({ type: 'ready' });
    fireEvent.press(getByLabelText('Capture'));
    await settle();
    await answerRead('sticker', '5YJ3E1EA7KF317654');

    expect(honda).not.toHaveBeenCalled();                      // a failed check digit never reaches the network
    expect(getByTestId('scan-result')).toBeTruthy();
    expect(getByText('59% — TOO LOW')).toBeTruthy();
    expect(getByText("Couldn't read the VIN")).toBeTruthy();
    expect(getByText('Check digit does not match')).toBeTruthy();
    expect(getByText('Fill the frame, avoid glare and hold the phone steady, then try again.')).toBeTruthy();
    expect(s().vehicles).toHaveLength(3);

    fireEvent.press(getByLabelText('Try again'));
    expect(s().scan.phase).toBe('idle');
    expect(queryByTestId('scan-result')).toBeNull();
    expect(getByTestId('camera-view')).toBeTruthy();
  });

  it('Type it instead hands the best-guess VIN to the Add sheet and closes the scanner', async () => {
    const { getByLabelText } = render(<ScanScreen />);
    post({ type: 'ready' });
    fireEvent.press(getByLabelText('Capture'));
    await settle();
    await answerRead('sticker', '5YJ3E1EA7KF317654');
    fireEvent.press(getByLabelText('Type it instead'));
    expect(s().vin).toBe('5YJ3E1EA7KF317654');
    expect(s().screen).toBeNull();
    expect(s().scan.phase).toBe('idle');
  });

  it('a Capture tapped while the reader is still booting runs itself when the reader is ready', async () => {
    const { getByLabelText, getByTestId, getByText } = render(<ScanScreen />);
    fireEvent.press(getByLabelText('Capture'));
    await settle();
    expect(web.hooks.injected).toHaveLength(0);
    expect(getByTestId('scan-status').props.children).toBe('PREPARING READER · 0%');

    post({ type: 'ready' });
    await settle();
    expect(web.hooks.injected).toHaveLength(1);
    await answerRead('sticker', HONDA);
    expect(getByText('99% MATCH')).toBeTruthy();
  });

  it('abandons a scan whose screen closed mid-read — no late add, no card', async () => {
    const { getByLabelText, unmount } = render(<ScanScreen />);
    post({ type: 'ready' });
    fireEvent.press(getByLabelText('Capture'));
    await settle();
    unmount();                                                 // the engine rejects the pending read on unmount
    await settle();
    const r = labRow('sticker', HONDA);
    await act(async () => { web.post({ type: 'result', id: 1, text: r.text, symbols: r.symbols, ms: 10 }); });
    expect(s().vehicles).toHaveLength(3);
    expect(s().scan.phase).not.toBe('added');
    expect(honda).not.toHaveBeenCalled();
  });

  it('goes straight to the reader-unavailable card when the engine is broken', () => {
    const { getByLabelText, getByText } = render(<ScanScreen />);
    post({ type: 'error', message: 'load' });
    fireEvent.press(getByLabelText('Capture'));
    expect(s().scan).toMatchObject({ phase: 'failed', score: null, reason: REASONS.engine });
    expect(getByText('READER UNAVAILABLE')).toBeTruthy();
    expect(getByText('Reader unavailable — check your connection and try again')).toBeTruthy();
  });
});
