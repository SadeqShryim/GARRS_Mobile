import { LinearGradient } from 'expo-linear-gradient';
import { type DimensionValue, Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { SERVICE_COPY, SVC_CENTER } from '../fixtures/service';
import { color } from '../theme/tokens';
import { Icon } from './Icon';
import { Mono, Sans } from './Txt';
import { useTilt } from './useTilt';

type Pct = `${number}%`;
const pct = (n: number): Pct => `${n}%`;

// Roads (lines 391–402): orientation, position %, stroke width, colour — each line centred on its percentage.
const ROADS: ['h' | 'v', number, number, string][] = [
  ['h', 35, 4, color.mapInk], ['h', 65, 4, color.mapInk],
  ['v', 30, 3, color.mapInk2], ['v', 70, 3, color.mapInk2],
  ['h', 20, 1.5, color.mapInk3], ['h', 50, 1.5, color.mapInk3], ['h', 80, 1.5, color.mapInk3],
  ['v', 15, 1.5, color.mapInk3], ['v', 45, 1.5, color.mapInk3], ['v', 55, 1.5, color.mapInk3], ['v', 85, 1.5, color.mapInk3],
];
// Buildings (lines 403–408): percentage boxes, r3, rgba(107,106,114, fill) with a 1 px rgba(107,106,114, edge) border.
const BUILDINGS: { top: Pct; left?: Pct; right?: Pct; width: Pct; height: Pct; fill: number; edge: number }[] = [
  { top: '40%', left: '10%', width: '15%', height: '20%', fill: 0.3, edge: 0.2 },
  { top: '15%', left: '35%', width: '12%', height: '15%', fill: 0.25, edge: 0.15 },
  { top: '70%', left: '75%', width: '18%', height: '18%', fill: 0.28, edge: 0.18 },
  { top: '20%', right: '10%', width: '10%', height: '25%', fill: 0.22, edge: 0.15 },
  { top: '55%', left: '5%', width: '8%', height: '12%', fill: 0.2, edge: 0.12 },
  { top: '8%', left: '75%', width: '14%', height: '10%', fill: 0.22, edge: 0.15 },
];
const PIN = 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z';

export function TiltMap() {
  const { tiltX, tiltY, tiltOn } = useTilt();
  // perspective:1000px on the wrapper + rotateX(tiltX) rotateY(tiltY) on the card (line 388–389)
  const tilt = useAnimatedStyle(() => ({ transform: [{ perspective: 1000 }, { rotateX: `${tiltX.value}deg` }, { rotateY: `${tiltY.value}deg` }] }));
  return (
    <Animated.View testID="tilt-map" style={[styles.card, tilt]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[StyleSheet.absoluteFill, { backgroundColor: color.sunken }]} />
        {ROADS.map(([o, pos, w, c], i) => o === 'h'
          ? <View key={i} style={{ position: 'absolute', left: 0, right: 0, top: pct(pos) as DimensionValue, height: w, marginTop: -w / 2, backgroundColor: c }} />
          : <View key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: pct(pos) as DimensionValue, width: w, marginLeft: -w / 2, backgroundColor: c }} />)}
        {BUILDINGS.map((b, i) => (
          <View key={i} style={{ position: 'absolute', top: b.top, left: b.left, right: b.right, width: b.width, height: b.height, borderRadius: 3, backgroundColor: `rgba(107,106,114,${b.fill})`, borderWidth: 1, borderColor: `rgba(107,106,114,${b.edge})` }} />
        ))}
        <View style={styles.pin}>
          <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
            <Path d={PIN} fill={color.blueDeep} />
            <Circle cx={12} cy={9} r={2.5} fill="#FFFFFF" />
          </Svg>
        </View>
        <LinearGradient colors={['#FFFFFF', 'rgba(255,255,255,0)']} locations={[0, 0.55]} start={{ x: 0.5, y: 1 }} end={{ x: 0.5, y: 0 }} style={[StyleSheet.absoluteFill, { opacity: 0.72 }]} />
      </View>
      <View style={styles.content}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.86)' }}>
            <Icon name="map-pin-line" size={20} color={color.ink} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: color.mapTint, paddingVertical: 5, paddingHorizontal: 9 }}>
            <View style={{ width: 6, height: 6, borderRadius: 4, backgroundColor: color.teal }} />
            <Mono size={9} ls={1.2} color={color.ink3}>{tiltOn ? SERVICE_COPY.liveTilt : SERVICE_COPY.live}</Mono>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ gap: 3 }}>
            <Sans size={18} weight={600} ls={-0.3} color={color.ink}>{SVC_CENTER.name}</Sans>
            <Sans size={13} color={color.ink5}>{SVC_CENTER.address}</Sans>
            <Mono size={11} ls={0.6} color={color.ink3}>{SVC_CENTER.coords}</Mono>
            <LinearGradient colors={['rgba(15,99,143,0.5)', 'rgba(15,99,143,0.25)', 'rgba(15,99,143,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ height: 1, marginTop: 3 }} />
          </View>
          <Mono size={11} color={color.blueDeep}>{SVC_CENTER.distance}</Mono>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { height: 250, borderRadius: 16, backgroundColor: color.surface, borderWidth: 1, borderColor: color.hair10, overflow: 'hidden' },
  // drop-shadow(0 0 10px rgba(15,99,143,.45)). RN `filter: dropShadow` is Android-only; elsewhere the layer shadow does the same job —
  // with no background colour it follows the pin's alpha, and a CSS blur radius of 10 is a Gaussian σ of 5 = `shadowRadius`.
  pin: {
    position: 'absolute', left: '50%', top: '50%', marginLeft: -15, marginTop: -15, width: 30, height: 30,
    ...Platform.select({
      android: { filter: [{ dropShadow: '0 0 10px rgba(15,99,143,0.45)' }] },
      default: { shadowColor: color.blueDeep, shadowOpacity: 0.45, shadowRadius: 5, shadowOffset: { width: 0, height: 0 } },
    }),
  },
  content: { flex: 1, justifyContent: 'space-between', paddingVertical: 15, paddingHorizontal: 16 },
});
