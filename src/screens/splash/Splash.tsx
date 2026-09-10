// design/Splash.dc.html — the whole artboard. Layer order (bottom → top) follows the DOM: stage (Skia: marquee + vignette + photo +
// veil + bubble backdrop) → mark → blob layer → bubble face → auth → REPLAY. Same `onDone` contract as the Slice 1 stub.
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';
import { color } from '../../theme/tokens';
import { AuthPanel } from './AuthPanel';
import { Blobs } from './Blobs';
import { Bubble, useBubbleValues } from './Bubble';
import { Mark } from './Mark';
import { ReplayPill } from './ReplayPill';
import { Stage } from './Stage';
import { useMarqueeDrive } from './useMarqueeDrive';
import { useSplashTimeline } from './useSplashTimeline';

export function Splash({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const bubble = useBubbleValues();
  const { phase, runId, run, v } = useSplashTimeline(bubble);
  const marquee = useMarqueeDrive(runId);
  const markOpacity = useDerivedValue(() => v.stageOp.value * v.markOp.value);
  const bubbleUp = phase === 'bubble' || phase === 'fade';
  return (
    <View testID="splash" style={[StyleSheet.absoluteFill, { backgroundColor: color.splash }]}>
      <Stage width={width} height={height} marquee={marquee} tl={v} bubble={bubble} bubbleMounted={bubbleUp} />
      <Mark opacity={markOpacity} />
      <Blobs opacity={v.blobOp} />
      {bubbleUp && <Bubble key={runId} v={bubble} />}
      <AuthPanel opacity={v.authOp} active={phase === 'auth'} runId={runId} onDone={onDone} />
      <ReplayPill onPress={run} />
      <StatusBar style="light" />
    </View>
  );
}
