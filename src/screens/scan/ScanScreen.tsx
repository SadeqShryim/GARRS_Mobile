// src/screens/scan/ScanScreen.tsx
// Spec §11 — the VIN scanner: a full-screen dark overlay over whatever tab (and Add sheet) it was opened from.
// The screen owns no scan logic; it wires the camera and the OCR engine into `runScan` (scanFlow.ts) and renders
// the phase the store reports. Dark chrome is `color.splash` + `color.textOnDark`, the app's chat-family palette.
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Linking, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureVin } from '../../ocr/capture';
import { guideRect } from '../../ocr/crop';
import { OcrEngineProvider, useOcrEngine } from '../../ocr/OcrEngine';
import { useAppStore } from '../../store/useAppStore';
import { color } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { MetalButton } from '../../ui/MetalButton';
import { Mono, Sans } from '../../ui/Txt';
import { ScanGuide } from './ScanGuide';
import { ScanResult } from './ScanResult';
import { REASONS, runScan } from './scanFlow';

/** §11 — the success card stays this long, then the scanner closes itself. */
export const ADDED_DWELL_MS = 1600;
const SWEEP_MS = 900;                       // §11 — the scan line's top→bottom loop
const DIM = 'rgba(255,255,255,0.72)';       // §11 — the secondary line under the guide
const FAINT = 'rgba(255,255,255,0.55)';     // §11 — the reader status line
const BUTTON_FILL = 'rgba(255,255,255,0.14)'; // §11 — the header's round buttons

export const SCAN_COPY = {
  caption: 'SCAN VIN',
  line: 'Line up the VIN inside the frame',
  where: 'Dashboard plate, door sticker or registration card',
  reading: 'Reading VIN…',
  checking: 'Checking with NHTSA…',
  ready: 'READER READY',
  unavailable: 'READER UNAVAILABLE',
  preparing: (pct: number) => `PREPARING READER · ${pct}%`,
  needCamera: 'Camera access is needed to scan your VIN',
  allow: 'Allow camera',
  settings: 'Open settings',
  capture: 'Capture',
} as const;

export function ScanScreen() {
  // The engine warms up (≈ 7 MB of CDN downloads on first run) while the user is still framing the plate (§7).
  return (
    <OcrEngineProvider>
      <ScanFrame />
    </OcrEngineProvider>
  );
}
export default ScanScreen;

function ScanFrame() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  // §8 — the crop maps the guide through the *camera view's* laid-out size. On Android the window size can exclude the
  // system bars while this overlay (and the CameraView) covers the whole screen, so the measured layout wins; the window
  // size is only the pre-layout fallback (found on the emulator 2026-09-13: 840 dp window vs a 914 dp view put the crop
  // a quarter of the guide too low).
  const [layout, setLayout] = useState<{ w: number; h: number } | null>(null);
  const preview = layout ?? { w: width, h: height };
  const guide = guideRect(preview);
  const [permission, requestPermission] = useCameraPermissions();
  const engine = useOcrEngine();
  const cam = useRef<CameraView | null>(null);
  const [torch, setTorch] = useState(false);
  const [camReady, setCamReady] = useState(false);
  const [shot, setShot] = useState<string | null>(null);   // the last crop, shown inside the guide while reading
  const [waiting, setWaiting] = useState(false);           // Capture pressed while the reader was still booting
  const alive = useRef(true);                              // a scan in flight when the screen closes is discarded

  const scan = useAppStore((s) => s.scan);
  const setScan = useAppStore((s) => s.setScan);
  const resetScan = useAppStore((s) => s.resetScan);
  const addScannedVehicle = useAppStore((s) => s.addScannedVehicle);
  const closeScreen = useAppStore((s) => s.closeScreen);
  const setVin = useAppStore((s) => s.setVin);
  const vehicles = useAppStore((s) => s.vehicles);
  const idx = useAppStore((s) => s.idx);

  const phase = scan.phase;
  const granted = !!permission?.granted;
  const live = phase === 'idle' || phase === 'reading' || phase === 'checking';

  // `addScannedVehicle` already cleared `screen`, so closing is also a scan reset (OverlayHost keeps the card
  // mounted while the phase is 'added' — see its header comment).
  const close = useCallback(() => { closeScreen(); resetScan(); }, [closeScreen, resetScan]);

  // Closing mid-read (header X, hardware back) abandons the scan: the engine rejects the pending request on
  // unmount, and a late result must not add a vehicle — or pop the success card back up over the garage.
  useEffect(() => () => { alive.current = false; }, []);

  // The Add sheet beneath autofocuses its VIN field (Slice 1), so the keyboard is usually up when the scanner
  // opens over it — and it would cover the Capture button. Drop it; the typed VIN lives in the store, not the field.
  useEffect(() => { Keyboard.dismiss(); }, []);

  // §11 — ask once when the user has never been asked; a denial is answered by the button, not by a loop.
  useEffect(() => { if (permission === null) void requestPermission(); }, [permission, requestPermission]);

  const failReader = useCallback(
    () => setScan({ phase: 'failed', score: null, vin: null, vehicleName: null, reason: REASONS.engine }),
    [setScan]
  );

  const capture = useCallback(() => {
    if (engine.status === 'error') { failReader(); return; }
    if (engine.status === 'loading') { setWaiting(true); return; }   // the effect below runs it when 'ready' arrives
    setWaiting(false);
    const camera = cam.current;
    if (!camera || !camReady) return;                                 // the preview is not up yet; the next tap will do it
    void runScan({
      capture: async () => {
        const out = await captureVin(camera, guide, preview);
        setShot(out.base64);
        return out;
      },
      recognize: engine.recognize,
      setScan: (p) => { if (alive.current) setScan(p); },
      addScannedVehicle: (v) => { if (alive.current) addScannedVehicle(v); },
    });
    // guide/preview are derived from the measured layout (window size before layout) and are stable for a given orientation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.status, engine.recognize, camReady, failReader, setScan, addScannedVehicle, guide.x, guide.y, guide.w, guide.h, preview.w, preview.h]);

  // §7 — Capture tapped before the reader was ready: show the preparing copy, then continue by itself.
  useEffect(() => {
    if (!waiting) return;
    if (engine.status === 'ready') capture();
    else if (engine.status === 'error') { setWaiting(false); failReader(); }
  }, [waiting, engine.status, capture, failReader]);

  // §11 — the success card is informational: it stays 1600 ms and the scanner closes itself.
  useEffect(() => {
    if (phase !== 'added') return;
    const t = setTimeout(close, ADDED_DWELL_MS);
    return () => clearTimeout(t);
  }, [phase, close]);

  const status =
    engine.status === 'ready' ? SCAN_COPY.ready
    : engine.status === 'error' ? SCAN_COPY.unavailable
    : SCAN_COPY.preparing(Math.round(engine.progress * 100));

  const added = vehicles[idx];
  const caption = phase === 'checking' ? SCAN_COPY.checking : SCAN_COPY.reading;

  return (
    <View testID="screen-scan" style={[StyleSheet.absoluteFill, { backgroundColor: color.splash }]}
      onLayout={(e) => { const { width: w, height: h } = e.nativeEvent.layout; if (w > 0 && h > 0) setLayout({ w, h }); }}>
      <StatusBar style="light" />
      {granted && live ? (
        <CameraView
          ref={cam}
          testID="camera-view"
          facing="back"
          enableTorch={torch}
          onCameraReady={() => setCamReady(true)}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      {shot && (phase === 'reading' || phase === 'checking') ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: guide.x, top: guide.y, width: guide.w, height: guide.h, overflow: 'hidden' }}>
          <Image testID="scan-crop" source={{ uri: 'data:image/jpeg;base64,' + shot }} contentFit="cover" style={StyleSheet.absoluteFill} />
          <ScanLine height={guide.h} />
        </View>
      ) : null}

      <ScanGuide rect={guide} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <RoundButton icon="close-line" size={22} label="Close" onPress={close} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Mono size={10} ls={1.8} color={color.textOnDark}>{SCAN_COPY.caption}</Mono>
        </View>
        {granted ? (
          <RoundButton icon={torch ? 'flashlight-fill' : 'flashlight-line'} size={20} label="Torch" onPress={() => setTorch((t) => !t)} />
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      {!granted ? (
        <View style={{ position: 'absolute', left: 24, right: 24, top: guide.y, alignItems: 'center', gap: 14 }}>
          <Icon name="camera-off-line" size={26} color={DIM} />
          <Sans size={14} color={color.textOnDark} center>{SCAN_COPY.needCamera}</Sans>
          {permission && !permission.canAskAgain ? (
            <MetalButton tint="blue" label={SCAN_COPY.settings} icon="settings-3-line" width={168} height={48} fontSize={14} onPress={() => void Linking.openSettings()} />
          ) : (
            <MetalButton tint="blue" label={SCAN_COPY.allow} icon="camera-line" width={168} height={48} fontSize={14} onPress={() => void requestPermission()} />
          )}
        </View>
      ) : live ? (
        // The framing copy belongs to the live states only: the result card speaks for itself (§11).
        <View pointerEvents="none" style={{ position: 'absolute', left: 24, right: 24, top: guide.y + guide.h + 16, gap: 6 }}>
          {phase === 'idle' ? (
            <>
              <Sans size={15} weight={500} color={color.textOnDark} center>{SCAN_COPY.line}</Sans>
              <Sans size={13} color={DIM} center>{SCAN_COPY.where}</Sans>
            </>
          ) : (
            <Sans size={15} weight={500} color={color.textOnDark} center>{caption}</Sans>
          )}
        </View>
      ) : null}

      {granted && live ? (
        <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
          {phase === 'idle' ? (
            <MetalButton tint="default" label={SCAN_COPY.capture} icon="camera-fill" width={168} height={52} fontSize={14} onPress={capture} />
          ) : null}
          <Mono size={9} ls={1.4} color={FAINT} testID="scan-status">{status}</Mono>
        </View>
      ) : null}

      {phase === 'added' || phase === 'failed' ? (
        <ScanResult
          phase={phase}
          score={scan.score}
          vin={scan.vin}
          name={scan.vehicleName}
          meta={added?.name === scan.vehicleName ? added.meta : null}
          reason={scan.reason}
          onDone={close}
          onRetry={() => { setShot(null); resetScan(); }}
          onType={() => { setVin(scan.vin ?? ''); close(); }}
        />
      ) : null}
    </View>
  );
}

function RoundButton({ icon, size, label, onPress }: { icon: string; size: number; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.round}>
      <Icon name={icon} size={size} color={color.textOnDark} />
    </Pressable>
  );
}

// §11 — a 2 px blue line sweeping the crop top→bottom while the read is in flight.
function ScanLine({ height }: { height: number }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withRepeat(withTiming(1, { duration: SWEEP_MS, easing: Easing.linear }), -1, false); }, [p]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: p.value * (height - 2) }] }));
  return <Animated.View testID="scan-line" style={[{ position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: color.blue }, style]} />;
}

const styles = StyleSheet.create({
  header: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 8 },
  round: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: BUTTON_FILL },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', gap: 12 },
});
