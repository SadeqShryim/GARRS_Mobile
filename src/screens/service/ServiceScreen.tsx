import { type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SERVICE_COPY, SVC_DATES, SVC_METHODS, SVC_TIMES } from '../../fixtures/service';
import { openRecallVehicle, reasonVals } from '../../lib/service';
import { useAppStore } from '../../store/useAppStore';
import { color } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { MetalButton } from '../../ui/MetalButton';
import { ShineBorder } from '../../ui/ShineBorder';
import { TiltMap } from '../../ui/TiltMap';
import { Mono, Sans } from '../../ui/Txt';
import { ServiceDone } from './ServiceDone';

// Reason card shell (lines 374–379): r16, padding 2, overflow hidden; the caution ramp spins behind it when a recall is open.
function ReasonShell({ caution, shell, children }: { caution: boolean; shell: string; children: ReactNode }) {
  return caution
    ? <ShineBorder ramp="caution" radius={16} style={{ padding: 2 }}>{children}</ShineBorder>
    : <View style={{ borderRadius: 16, padding: 2, overflow: 'hidden', backgroundColor: shell }}>{children}</View>;
}

export function ServiceScreen() {
  const insets = useSafeAreaInsets();
  const vehicles = useAppStore((s) => s.vehicles);
  const svcMethod = useAppStore((s) => s.svcMethod);
  const svcDate = useAppStore((s) => s.svcDate);
  const svcTime = useAppStore((s) => s.svcTime);
  const svcDone = useAppStore((s) => s.svcDone);
  const openSheet = useAppStore((s) => s.openSheet);
  const setSvcMethod = useAppStore((s) => s.setSvcMethod);
  const setSvcDate = useAppStore((s) => s.setSvcDate);
  const setSvcTime = useAppStore((s) => s.setSvcTime);
  const confirmService = useAppStore((s) => s.confirmService);
  const flash = useAppStore((s) => s.flash);
  const open = openRecallVehicle(vehicles);
  const r = reasonVals(open);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 24, paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
      {svcDone ? <ServiceDone /> : (
        <View style={{ gap: 24 }}>
          <View style={{ gap: 5 }}>
            <Sans size={30} lh={34} weight={600} ls={-1} color={color.ink}>{SERVICE_COPY.title}</Sans>
            <Sans size={13} color={color.ink5}>{SERVICE_COPY.sub}</Sans>
          </View>

          <Pressable accessibilityRole="button" accessibilityLabel={r.reason} onPress={() => { if (open) openSheet('reason'); }} testID="reason-card">
            <ReasonShell caution={r.caution} shell={r.shell}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, backgroundColor: color.sunken, paddingVertical: 15, paddingHorizontal: 16 }}>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <Icon name={r.icon} size={13} color={r.tone} />
                    <Mono size={9} ls={1.4} color={r.tone}>{r.ref}</Mono>
                  </View>
                  <Sans size={18} lh={23} weight={600} ls={-0.3} color={color.ink}>{r.reason}</Sans>
                  <Mono size={9} ls={1.2} color={color.ink3}>{r.hint}</Mono>
                </View>
                <Icon name="arrow-right-s-line" size={20} color={color.ink4} />
              </View>
            </ReasonShell>
          </Pressable>

          <View style={{ gap: 11 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <Mono size={10} ls={1.8} color={color.ink4}>{SERVICE_COPY.selectedCenter}</Mono>
              <Pressable accessibilityRole="button" accessibilityLabel={SERVICE_COPY.change} onPress={() => flash(SERVICE_COPY.changeToast)} hitSlop={8}>
                <Sans size={12} weight={500} color={color.blueDeep}>{SERVICE_COPY.change}</Sans>
              </Pressable>
            </View>
            <TiltMap />
          </View>

          <View style={{ gap: 11 }}>
            <Mono size={10} ls={1.8} color={color.ink4}>{SERVICE_COPY.method}</Mono>
            <View style={{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 14, backgroundColor: color.sunken }}>
              {SVC_METHODS.map((m) => {
                const on = svcMethod === m.key;
                return (
                  <Pressable key={m.key} accessibilityRole="button" accessibilityLabel={m.label} accessibilityState={{ selected: on }} onPress={() => setSvcMethod(m.key)}
                    style={{ flex: 1, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, backgroundColor: on ? color.surface : 'transparent', boxShadow: on ? '0 1px 2px rgba(0,0,0,0.08)' : undefined }}>
                    <Icon name={m.icon} size={16} color={on ? color.ink : color.ink5} />
                    <Sans size={13} weight={500} color={on ? color.ink : color.ink5}>{m.label}</Sans>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ gap: 11 }}>
            <Mono size={10} ls={1.8} color={color.ink4}>{SERVICE_COPY.selectDate}</Mono>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }}>
              {SVC_DATES.map((d) => {
                const on = svcDate === d.date;
                return (
                  <Pressable key={d.date} accessibilityRole="button" accessibilityLabel={d.day + ' ' + d.date} accessibilityState={{ selected: on }} onPress={() => setSvcDate(d.date)}
                    style={{ width: 66, height: 82, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 16, backgroundColor: on ? color.infoBg : color.surface, borderWidth: 1, borderColor: on ? color.blueDeep : color.hair10 }}>
                    <Mono size={9} ls={1.2} color={on ? color.blueDeep : color.ink4}>{d.day}</Mono>
                    <Sans size={22} weight={600} ls={-0.6} color={on ? color.blueDeep : color.ink}>{d.date}</Sans>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={{ gap: 11 }}>
            <Mono size={10} ls={1.8} color={color.ink4}>{SERVICE_COPY.times}</Mono>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {SVC_TIMES.map((t, i) => {
                const off = i === 0;                       // line 1626: the first slot is unavailable
                const on = !off && svcTime === t;
                return (
                  <Pressable key={t} accessibilityRole="button" accessibilityLabel={t} accessibilityState={{ selected: on, disabled: off }} disabled={off} onPress={() => setSvcTime(t)}
                    style={{ width: '31%', flexGrow: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: on ? color.infoBg : color.surface, borderWidth: 1, borderColor: on ? color.blueDeep : color.hair10, opacity: off ? 0.35 : 1 }}>
                    <Mono size={12} color={on ? color.blueDeep : color.ink}>{t}</Mono>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ flexDirection: 'row', paddingTop: 2 }}>
            <MetalButton tint="blue" label={SERVICE_COPY.confirm} icon="calendar-check-line" flex={1} width="auto" height={54} radius={999} gap={9} iconSize={17} fontSize={15} onPress={confirmService} />
          </View>
        </View>
      )}
    </ScrollView>
  );
}
