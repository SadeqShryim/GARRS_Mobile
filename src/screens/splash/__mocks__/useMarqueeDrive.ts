// Jest stand-in: no frame loop; static values that Skia mock nodes can read.
import { useSharedValue } from 'react-native-reanimated';
import type { MarqueeValues } from '../useMarqueeDrive';

export function useMarqueeDrive(_runId: number): MarqueeValues {
  return { t: useSharedValue(0), dist: useSharedValue(0), sigma: useSharedValue(0), scale: useSharedValue(1) };
}
