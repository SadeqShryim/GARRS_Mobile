import { DeviceMotion } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';
import { RAD_TO_DEG, type Tilt, tiltChanged, tiltFor } from '../lib/service';
import { dur } from '../theme/tokens';

// deviceorientation → expo-sensors DeviceMotion. rotation.beta/gamma arrive in radians; the maths (tiltFor) wants degrees.
// Each accepted reading retargets the card's rotateX/rotateY over 120 ms linear (the source's `transition: transform .12s linear`).
// If the sensor is unavailable, the card stays flat and the pill reads LIVE (spec §9).
export function useTilt() {
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const [tiltOn, setTiltOn] = useState(false);
  const last = useRef<Tilt>({ tiltX: 0, tiltY: 0 });
  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    let cancelled = false;
    (async () => {
      try {
        if (!(await DeviceMotion.isAvailableAsync())) return;
        // Ask, but do not gate on the answer: Android's HIGH_SAMPLING_RATE_SENSORS permission only matters above 200 Hz, and
        // Expo Go reports it denied while still delivering 60 ms updates (verified on the emulator, 2026-09-10).
        await DeviceMotion.requestPermissionsAsync().catch(() => undefined);
        if (cancelled) return;
        DeviceMotion.setUpdateInterval(60);
        sub = DeviceMotion.addListener((m) => {
          if (!m.rotation) return;   // the first sample can arrive before the rotation-vector sensor reports
          const next = tiltFor(m.rotation.beta * RAD_TO_DEG, m.rotation.gamma * RAD_TO_DEG);
          if (!tiltChanged(last.current, next)) return;
          last.current = next;
          tiltX.value = withTiming(next.tiltX, { duration: dur.tilt, easing: Easing.linear });
          tiltY.value = withTiming(next.tiltY, { duration: dur.tilt, easing: Easing.linear });
          setTiltOn(true);
        });
      } catch {
        /* no sensor on this device: stay flat */
      }
    })();
    return () => { cancelled = true; sub?.remove(); };
  }, [tiltX, tiltY]);
  return { tiltX, tiltY, tiltOn };
}
