// design: tick — the rAF loop of run(). Runs on the UI thread from run() until ACCEL + 0.15 s; every consumer is a Skia prop.
import { useCallback, useEffect, useRef } from 'react';
import { runOnJS, useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { RUN_END, advance, blurAt, scaleAt } from './timeline';

export type MarqueeValues = { t: SharedValue<number>; dist: SharedValue<number>; sigma: SharedValue<number>; scale: SharedValue<number> };

export function useMarqueeDrive(runId: number): MarqueeValues {
  const t = useSharedValue(0);
  const dist = useSharedValue(0);
  const sigma = useSharedValue(0);
  const scale = useSharedValue(1);
  const start = useSharedValue(-1);
  const last = useSharedValue(-1);
  const frameRef = useRef<{ setActive: (active: boolean) => void } | null>(null);
  const stop = useCallback(() => { frameRef.current?.setActive(false); }, []);
  const tick = useCallback((info: { timestamp: number }) => {
    'worklet';
    const now = info.timestamp;
    if (start.value < 0) { start.value = now; last.value = now; }
    const dt = (now - last.value) / 1000;
    last.value = now;
    const tt = (now - start.value) / 1000;
    t.value = tt;
    dist.value = advance(dist.value, tt, dt);
    sigma.value = blurAt(tt);
    scale.value = scaleAt(tt);
    if (tt >= RUN_END) runOnJS(stop)();
  }, [dist, last, scale, sigma, start, stop, t]);
  const frame = useFrameCallback(tick, false);
  frameRef.current = frame;
  useEffect(() => {
    start.value = -1; last.value = -1; t.value = 0; dist.value = 0; sigma.value = 0; scale.value = 1;
    frame.setActive(true);
    return () => frame.setActive(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);
  return { t, dist, sigma, scale };
}
