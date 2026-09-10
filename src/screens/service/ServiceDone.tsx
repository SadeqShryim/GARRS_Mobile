import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import { SERVICE_COPY } from '../../fixtures/service';
import { cssAngleToPoints } from '../../lib/gradient';
import { doneDetails, trackerSteps } from '../../lib/service';
import { useAppStore } from '../../store/useAppStore';
import { color } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { MetalButton } from '../../ui/MetalButton';
import { Mono, Sans } from '../../ui/Txt';

const FACE = cssAngleToPoints(160, 58, 58);

export function ServiceDone() {
  const router = useRouter();
  const svcMethod = useAppStore((s) => s.svcMethod);
  const svcDate = useAppStore((s) => s.svcDate);
  const svcTime = useAppStore((s) => s.svcTime);
  const returnToGarage = useAppStore((s) => s.returnToGarage);
  const details = doneDetails(svcDate, svcTime, svcMethod);
  const steps = trackerSteps();
  return (
    <View style={{ gap: 26 }} testID="service-done">
      <View style={{ alignItems: 'center', gap: 12, paddingTop: 22, paddingBottom: 4 }}>
        <View style={{ width: 146, height: 146, borderRadius: 73, alignItems: 'center', justifyContent: 'center', backgroundColor: color.sunken, borderWidth: 1, borderColor: color.doneRing, boxShadow: '0 0 34px rgba(15,99,143,0.14)' }}>
          <LinearGradient colors={['#2E93C4', '#0F638F', '#0B4E73']} locations={[0, 0.55, 1]} start={FACE.start} end={FACE.end}
            style={{ width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check-line" size={32} color="#EAF7FF" />
          </LinearGradient>
        </View>
        <Sans size={28} lh={32} weight={600} ls={-0.9} color={color.ink} style={{ marginTop: 6 }}>{SERVICE_COPY.confirmed}</Sans>
        <Sans size={13} color={color.ink5}>{SERVICE_COPY.scheduledSub}</Sans>
      </View>

      <View style={{ borderRadius: 16, backgroundColor: color.sunken, paddingHorizontal: 18 }}>
        {details.map((x) => (
          <View key={x.label} style={{ minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 18, borderTopWidth: 1, borderTopColor: x.line }}>
            <View style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface }}>
              <Icon name={x.icon} size={20} color={color.ink2} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Mono size={9} ls={1.3} color={color.ink3}>{x.label}</Mono>
              <Sans size={18} weight={600} ls={-0.3} color={color.ink}>{x.value}</Sans>
              <Sans size={12} color={color.ink5}>{x.secondary}</Sans>
            </View>
          </View>
        ))}
      </View>

      <View style={{ gap: 14 }}>
        <Mono size={10} ls={1.8} color={color.ink4}>{SERVICE_COPY.tracker}</Mono>
        <View>
          {steps.map((st) => (
            <View key={st.label} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 52 }}>
              <View style={{ width: 20, alignItems: 'center' }}>
                <View style={{ position: 'absolute', top: 20, bottom: -32, width: 1, backgroundColor: st.rail }} />
                <View style={{ width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: st.nodeBg, borderWidth: st.nodeBorderWidth, borderColor: st.nodeBorderColor }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: st.dot }} />
                </View>
              </View>
              <Sans size={st.size} weight={st.weight} ls={st.track} color={st.fg}>{st.label}</Sans>
            </View>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row' }}>
        <MetalButton tint="blue" label={SERVICE_COPY.returnToGarage} icon="inbox-line" flex={1} width="auto" height={54} radius={999} gap={9} iconSize={17} fontSize={15}
          onPress={() => { returnToGarage(); router.navigate('/(tabs)/garage'); }} />
      </View>
    </View>
  );
}
