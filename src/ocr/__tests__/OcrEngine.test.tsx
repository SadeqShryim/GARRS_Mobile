import { act, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { OcrEngineProvider, useOcrEngine, type OcrEngine } from '../OcrEngine';
import {
  OCR_PAGE,
  TESSERACT_CORE_URL,
  TESSERACT_JS_URL,
  TESSERACT_LANG_PATH,
  TESSERACT_WORKER_URL,
  VIN_WHITELIST,
} from '../ocrPage';

// The WebView is the mock from jest.setup.ts: it records the latest `onMessage` and every injected script, so the
// protocol can be driven from the test without a browser.
type WebViewMock = {
  hooks: { onMessage: ((e: { nativeEvent: { data: string } }) => void) | null; injected: string[] };
  post: (m: unknown) => void;
};
const web = (jest.requireMock('react-native-webview') as { __webviewMock: WebViewMock }).__webviewMock;

let captured: OcrEngine | null = null;
const engine = () => {
  if (!captured) throw new Error('the provider is not mounted');
  return captured;
};

function Probe() {
  const e = useOcrEngine();
  captured = e;
  return <Text testID="probe">{e.status + ' ' + e.progress + ' ' + (e.error ?? '-')}</Text>;
}

const mount = () => render(<OcrEngineProvider><Probe /></OcrEngineProvider>);
const post = (m: unknown) => act(() => { web.post(m); });
const ready = () => post({ type: 'ready' });
const RECOGNIZE_1 = 'window.__ocr && window.__ocr.recognize(1, "data:image/jpeg;base64,QUJD"); true;';

beforeEach(() => {
  jest.useFakeTimers();
  web.hooks.injected.length = 0;
  web.hooks.onMessage = null;
  captured = null;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ocrPage', () => {
  it('is one HTML document carrying the CDN URLs, the language path and the VIN whitelist', () => {
    expect(OCR_PAGE.startsWith('<!doctype html>')).toBe(true);
    for (const s of [TESSERACT_JS_URL, TESSERACT_WORKER_URL, TESSERACT_CORE_URL, TESSERACT_LANG_PATH, VIN_WHITELIST]) {
      expect(OCR_PAGE).toContain(s);
    }
    expect(VIN_WHITELIST).toBe('ABCDEFGHJKLMNPRSTUVWXYZ0123456789');
    expect(OCR_PAGE).toContain('tessedit_char_whitelist');
    expect(OCR_PAGE).toContain('tessedit_pageseg_mode: "7"');
    expect(OCR_PAGE).toContain('workerBlobURL: true');
    expect(OCR_PAGE).toContain('window.ReactNativeWebView.postMessage(JSON.stringify(m))');
    expect(OCR_PAGE).toContain('window.__ocr = {');
    expect(OCR_PAGE).toContain('"superseded"');
    expect(OCR_PAGE).toContain('onerror="window.__ocrLoadError()"');
    expect(OCR_PAGE).not.toContain('`');            // nothing in the page may collide with a TS template literal
  });
});

describe('OcrEngineProvider', () => {
  it('renders the hidden WebView and starts out loading', () => {
    const { getByTestId } = mount();
    expect(getByTestId('ocr-webview')).toBeTruthy();
    expect(getByTestId('probe').props.children).toBe('loading 0 -');
  });

  it('tracks the boot progress reported by the tesseract logger', () => {
    const { getByTestId } = mount();
    post({ type: 'progress', status: 'loading language traineddata', progress: 0.5 });
    expect(engine().progress).toBe(0.5);
    expect(engine().status).toBe('loading');
    expect(getByTestId('probe').props.children).toBe('loading 0.5 -');
  });

  it('flips to ready when the page reports the worker is up', () => {
    mount();
    expect(engine().status).toBe('loading');
    ready();
    expect(engine().status).toBe('ready');
    expect(engine().error).toBeUndefined();
  });

  it('injects a recognise call and resolves with the read when the matching result arrives', async () => {
    mount();
    ready();
    const read = engine().recognize('QUJD');
    expect(web.hooks.injected).toEqual([RECOGNIZE_1]);
    post({ type: 'result', id: 1, text: 'ABC', symbols: [{ t: 'A', c: 98 }, { t: 'B', c: 97.5 }], ms: 12 });
    await expect(read).resolves.toEqual({ text: 'ABC', symbols: [{ t: 'A', c: 98 }, { t: 'B', c: 97.5 }] });
  });

  it('numbers requests monotonically', async () => {
    mount();
    ready();
    const first = engine().recognize('QUJD');
    post({ type: 'result', id: 1, text: 'ONE', symbols: [] });
    const second = engine().recognize('QUJD');
    post({ type: 'result', id: 2, text: 'TWO', symbols: [] });
    await expect(first).resolves.toEqual({ text: 'ONE', symbols: [] });
    await expect(second).resolves.toEqual({ text: 'TWO', symbols: [] });
    expect(web.hooks.injected[1]).toContain('window.__ocr.recognize(2, "data:image/jpeg;base64,QUJD")');
  });

  it('ignores a result for a stale id and still settles the live request', async () => {
    mount();
    ready();
    const read = engine().recognize('QUJD');
    post({ type: 'result', id: 99, text: 'STALE', symbols: [{ t: 'X', c: 10 }] });
    post({ type: 'error', id: 42, message: 'also stale' });
    post({ type: 'result', id: 1, text: 'LIVE', symbols: [] });
    await expect(read).resolves.toEqual({ text: 'LIVE', symbols: [] });
  });

  it('rejects the request an error message is addressed to', async () => {
    mount();
    ready();
    const read = engine().recognize('QUJD');
    post({ type: 'error', id: 1, message: 'superseded' });
    await expect(read).rejects.toThrow('superseded');
  });

  it('breaks the engine on an error with no request id, and rejects what is in flight', async () => {
    mount();
    ready();
    const read = engine().recognize('QUJD');
    post({ type: 'error', message: 'load' });
    await expect(read).rejects.toThrow('load');
    expect(engine().status).toBe('error');
    expect(engine().error).toBe('load');
  });

  it('goes to error with reason timeout when ready never arrives within 45 s', () => {
    mount();
    act(() => { jest.advanceTimersByTime(45_000); });
    expect(engine().status).toBe('error');
    expect(engine().error).toBe('timeout');
  });

  it('rejects a request that gets no answer within 20 s', async () => {
    mount();
    ready();
    const read = engine().recognize('QUJD');
    act(() => { jest.advanceTimersByTime(20_000); });
    await expect(read).rejects.toThrow('timeout');
    expect(engine().status).toBe('ready');          // one slow read does not break the engine
  });

  it('rejects immediately with engine once the engine has failed', async () => {
    mount();
    post({ type: 'error', message: 'load' });
    await expect(engine().recognize('QUJD')).rejects.toThrow('engine');
    expect(web.hooks.injected).toHaveLength(0);
  });

  it('clears the ready timer and every request timer on unmount', async () => {
    const { unmount } = mount();
    expect(jest.getTimerCount()).toBe(1);           // the 45 s ready timer
    ready();
    expect(jest.getTimerCount()).toBe(0);
    const read = engine().recognize('QUJD');
    expect(jest.getTimerCount()).toBe(1);           // the 20 s request timer
    unmount();
    expect(jest.getTimerCount()).toBe(0);
    await expect(read).rejects.toThrow('unmounted');
  });

  it('reports itself broken when the hook is used with no provider', async () => {
    render(<Probe />);
    expect(engine().status).toBe('error');
    expect(engine().error).toBe('engine');
    await expect(engine().recognize('QUJD')).rejects.toThrow('engine');
  });
});
