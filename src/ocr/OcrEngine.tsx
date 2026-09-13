import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { OCR_PAGE } from './ocrPage';

// The app side of the OCR engine (spec §7). `OcrEngineProvider` mounts the hidden WebView that runs tesseract.js and
// warms it up on mount — the download happens while the user is still framing the plate. `useOcrEngine()` hands the
// screen the engine status, the boot progress and `recognize(base64)`, which resolves with the flattened read.
//
// The WebView is 2×2 at 1 % opacity rather than 0×0 or hidden: Android suspends JS in a view with no layout.
// The https `baseUrl` gives the page a real (non-opaque) origin, without which IndexedDB throws and the 3 MB
// language model would be re-downloaded on every scan.

export type Read = { text: string; symbols: { t: string; c: number }[] };

export type OcrStatus = 'loading' | 'ready' | 'error';
export type OcrEngine = {
  status: OcrStatus;
  progress: number;
  error?: string;
  recognize: (base64: string) => Promise<Read>;
};

export const OCR_BASE_URL = 'https://ocr.recallhub.local/';
export const READY_TIMEOUT_MS = 45_000;
export const REQUEST_TIMEOUT_MS = 20_000;

type PageMessage =
  | { type: 'ready' }
  | { type: 'progress'; status?: string; progress?: number }
  | { type: 'result'; id?: number; text?: string; symbols?: { t: string; c: number }[]; ms?: number }
  | { type: 'error'; id?: number; message?: string };

type Pending = { resolve: (r: Read) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> };

const injection = (id: number, base64: string) =>
  'window.__ocr && window.__ocr.recognize(' + id + ', ' + JSON.stringify('data:image/jpeg;base64,' + base64) + '); true;';

// Rendered without a provider the engine reports itself broken instead of crashing the screen; every caller in the app
// sits inside `OcrEngineProvider` (ScanScreen mounts it), so this is a guard, not a code path.
const NO_PROVIDER: OcrEngine = {
  status: 'error',
  progress: 0,
  error: 'engine',
  recognize: () => Promise.reject(new Error('engine')),
};

const OcrEngineContext = createContext<OcrEngine | null>(null);

export const useOcrEngine = (): OcrEngine => useContext(OcrEngineContext) ?? NO_PROVIDER;

export function OcrEngineProvider({ children }: { children?: ReactNode }) {
  const web = useRef<WebView | null>(null);
  const [status, setStatus] = useState<OcrStatus>('loading');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | undefined>(undefined);
  // Refs, not state: `recognize` and `onMessage` keep a stable identity across the engine's lifetime.
  const statusRef = useRef<OcrStatus>('loading');
  const nextId = useRef(0);
  const pending = useRef(new Map<number, Pending>());
  const readyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const settle = useCallback((id: number): Pending | undefined => {
    const p = pending.current.get(id);
    if (!p) return undefined;                      // a stale id: the request already timed out or was superseded
    clearTimeout(p.timer);
    pending.current.delete(id);
    return p;
  }, []);

  const breakEngine = useCallback(
    (message: string) => {
      if (readyTimer.current) { clearTimeout(readyTimer.current); readyTimer.current = null; }
      statusRef.current = 'error';
      setStatus('error');
      setError(message);
      for (const id of [...pending.current.keys()]) settle(id)?.reject(new Error(message));
    },
    [settle]
  );

  useEffect(() => {
    readyTimer.current = setTimeout(() => {
      readyTimer.current = null;
      if (statusRef.current !== 'ready') breakEngine('timeout');
    }, READY_TIMEOUT_MS);
    return () => {
      if (readyTimer.current) { clearTimeout(readyTimer.current); readyTimer.current = null; }
      for (const id of [...pending.current.keys()]) settle(id)?.reject(new Error('unmounted'));
    };
  }, [breakEngine, settle]);

  const onMessage = useCallback(
    (e: WebViewMessageEvent) => {
      let m: PageMessage;
      try {
        m = JSON.parse(e.nativeEvent.data) as PageMessage;
      } catch {
        return;                                    // not ours: ignore rather than break the engine
      }
      if (m.type === 'ready') {
        if (readyTimer.current) { clearTimeout(readyTimer.current); readyTimer.current = null; }
        if (statusRef.current === 'error') return;  // the 45 s window already closed; do not un-break the engine
        statusRef.current = 'ready';
        setStatus('ready');
        return;
      }
      if (m.type === 'progress') {
        if (typeof m.progress === 'number') setProgress(Math.max(0, Math.min(1, m.progress)));
        return;
      }
      if (m.type === 'result') {
        if (typeof m.id !== 'number') return;
        settle(m.id)?.resolve({ text: m.text ?? '', symbols: m.symbols ?? [] });
        return;
      }
      const message = m.message ?? 'engine';
      if (typeof m.id === 'number') settle(m.id)?.reject(new Error(message));
      else breakEngine(message);                    // an id-less error is the page itself failing (script load, worker)
    },
    [breakEngine, settle]
  );

  const recognize = useCallback(
    (base64: string) =>
      new Promise<Read>((resolve, reject) => {
        if (statusRef.current === 'error' || !web.current) { reject(new Error('engine')); return; }
        const id = (nextId.current += 1);
        const timer = setTimeout(() => {
          pending.current.delete(id);
          reject(new Error('timeout'));
        }, REQUEST_TIMEOUT_MS);
        pending.current.set(id, { resolve, reject, timer });
        // Queued by the page when it is not ready yet, so no need to wait for `ready` here.
        web.current.injectJavaScript(injection(id, base64));
      }),
    []
  );

  const value = useMemo<OcrEngine>(() => ({ status, progress, error, recognize }), [status, progress, error, recognize]);

  return (
    <OcrEngineContext.Provider value={value}>
      <WebView
        ref={web}
        testID="ocr-webview"
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        source={{ html: OCR_PAGE, baseUrl: OCR_BASE_URL }}
        onMessage={onMessage}
        style={{ position: 'absolute', width: 2, height: 2, opacity: 0.01 }}
      />
      {children}
    </OcrEngineContext.Provider>
  );
}
