import { DeviceMotion } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';
import { RAD_TO_DEG, type Tilt, tiltChanged, tiltFor } from '../lib/service';
import { dur } from '../theme/tokens';

// deviceorientation → expo-sensors DeviceMotion. rotation.beta/gamma arrive in radians; the maths (tiltFor) wants degrees.
// Each accepted reading retargets the card's rotateX/rotateY over 120 ms linear (the source's `transition: transform .12s linear`).
// If the sensor is unavailable or denied, the card stays flat and the pill reads LIVE (spec §9).
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
        const p = await DeviceMotion.requestPermissionsAsync();
        if (!p.granted || cancelled) return;
        DeviceMotion.setUpdateInterval(60);
        sub = DeviceMotion.addListener((m) => {
          if (!m.rotation) return;
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
