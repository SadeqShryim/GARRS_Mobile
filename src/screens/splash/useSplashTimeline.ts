// design: run() + renderVals() + the inline `transition:` of every layer. Phases flip on setTimeouts exactly like the source;
// each layer's shared value retargets with withTiming from wherever it is (CSS transition semantics), so REPLAY cross-fades.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { bez, ease } from '../../theme/tokens';
import { fadeOutBubble, type BubbleValues } from './Bubble';
import { DUR, T } from './timeline';

export type Phase = 'run' | 'photo' | 'bubble' | 'fade' | 'auth';
export type TimelineValues = {
  stageOp: SharedValue<number>; markOp: SharedValue<number>; photoOp: SharedValue<number>; photoScale: SharedValue<number>;
  photoFx: SharedValue<number>; veilOp: SharedValue<number>; blobOp: SharedValue<number>; authOp: SharedValue<number>;
};

export function useSplashTimeline(bubble: BubbleValues) {
  const [phase, setPhase] = useState<Phase>('run');
  const [runId, setRunId] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stageOp = useSharedValue(1);
  const markOp = useSharedValue(1);
  const photoOp = useSharedValue(0);
  const photoScale = useSharedValue(1.1);
  const photoFx = useSharedValue(0);
  const veilOp = useSharedValue(0);
  const blobOp = useSharedValue(0);
  const authOp = useSharedValue(0);
  const v: TimelineValues = { stageOp, markOp, photoOp, photoScale, photoFx, veilOp, blobOp, authOp };

  // design: run()
  const run = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase('run');
    setRunId((r) => r + 1);
    const at = (ms: number, p: Phase) => { timers.current.push(setTimeout(() => setPhase(p), ms)); };
    at(T.photo, 'photo');
    at(T.bubble, 'bubble');
    at(T.fade, 'fade');
    at(T.auth, 'auth');
  }, []);
  useEffect(() => {
    run();
    const pending = timers;
    return () => { pending.current.forEach(clearTimeout); };
  }, [run]);

  // design: renderVals() — stageOp, markOp, photoOp, photoScale, photoFilter, veilOp, blobOp, bubbleOp, authOp.
  useEffect(() => {
    const css = (ms: number) => ({ duration: ms, easing: bez(ease.css) });
    const marquee = phase === 'run';
    const photoUp = phase !== 'run';
    const blurred = phase === 'bubble' || phase === 'fade' || phase === 'auth';
    const authUp = phase === 'auth';
    stageOp.value = withTiming(marquee ? 1 : 0, css(DUR.stage));
    markOp.value = withTiming(marquee ? 1 : 0, css(DUR.mark));
    photoOp.value = withTiming(photoUp ? 1 : 0, css(DUR.photo));
    photoScale.value = withTiming(photoUp ? (blurred ? 1.16 : 1) : 1.1, { duration: DUR.photoScale, easing: bez(ease.standard) });
    photoFx.value = withTiming(blurred ? 1 : 0, css(DUR.photoFx));
    veilOp.value = withTiming(photoUp ? 1 : 0, css(DUR.veil));
    blobOp.value = withTiming(authUp || phase === 'fade' ? 1 : 0, css(DUR.blob));
    authOp.value = withTiming(authUp ? 1 : 0, css(DUR.auth));
    if (phase === 'fade') fadeOutBubble(bubble);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return { phase, runId, run, v };
}
