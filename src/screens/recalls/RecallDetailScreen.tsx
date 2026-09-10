import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RECALLS_COPY } from '../../fixtures/recalls';
import { allRecalls, detailFor } from '../../lib/recalls';
import { useAppStore } from '../../store/useAppStore';
import { color } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { MetalButton } from '../../ui/MetalButton';
import { StatusChip } from '../../ui/StatusChip';
import { Mono, Sans } from '../../ui/Txt';

export function RecallDetailScreen({ id, onBack }: { id: string; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const vehicles = useAppStore((s) => s.vehicles);
  const scheduled = useAppStore((s) => s.scheduled);
  const scheduleFromRecalls = useAppStore((s) => s.scheduleFromRecalls);
  const flash = useAppStore((s) => s.flash);
  const d = detailFor(allRecalls(vehicles, scheduled), vehicles, id);
  if (!d) return null;
  return (
    <View style={{ flex: 1 }} testID="recall-detail">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 20, paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable accessibilityLabel="Back" onPress={onBack} style={{ width: 36, height: 36, marginLeft: -8, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="arrow-left-line" size={20} color={color.ink} />
          </Pressable>
          <Mono size={10} ls={1.6} color={color.ink3}>{d.code}</Mono>
          <View style={{ marginLeft: 'auto' }}>
            <StatusChip bg={d.meta.chipBg} fg={d.meta.chipFg} icon={d.meta.icon} label={d.meta.status} />
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Sans size={28} lh={33} weight={600} ls={-0.9} color={color.ink}>{d.title}</Sans>
          <Sans size={14} color={color.ink5}>{d.vehicle}</Sans>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {d.facts.map((f) => (
            <View key={f.k} style={{ width: '48%', flexGrow: 1, borderRadius: 14, backgroundColor: color.sunken, paddingVertical: 13, paddingHorizontal: 14, gap: 5 }}>
              <Mono size={9} ls={1.3} color={color.ink3}>{f.k}</Mono>
              <Sans size={15} weight={500} color={color.ink}>{f.v}</Sans>
            </View>
          ))}
        </View>

        <View style={{ gap: 9 }}>
          <Mono size={10} ls={1.8} color={color.ink4}>{RECALLS_COPY.why}</Mono>
          <Sans size={15} lh={23} color={color.ink2}>{d.why}</Sans>
        </View>

        <View style={{ gap: 11 }}>
          <Mono size={10} ls={1.8} color={color.ink4}>{RECALLS_COPY.remedy}</Mono>
          {d.steps.map((st) => (
            <View key={st.n} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' }}>
                <Mono size={11} color={color.textOnDark}>{String(st.n)}</Mono>
              </View>
              <View style={{ flex: 1, gap: 2, paddingTop: 2 }}>
                <Sans size={14} weight={500} color={color.ink}>{st.title}</Sans>
                <Sans size={13} lh={19} color={color.ink5}>{st.body}</Sans>
              </View>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, backgroundColor: color.sunken, paddingVertical: 14, paddingHorizontal: 15 }}>
          <Icon name="information-line" size={17} color={color.blueDeep} />
          <Sans size={13} lh={19} color={color.ink2} style={{ flex: 1 }}>{d.note}</Sans>
        </View>
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'stretch', paddingTop: 12, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: 'rgba(255,255,255,0.94)', borderTopWidth: 1, borderTopColor: color.hair07 }}>
        {d.state === 'open' ? (
          <MetalButton tint="blue" label={RECALLS_COPY.scheduleRepair} icon="calendar-2-line" flex={1} width="auto" height={54} radius={999} gap={9} iconSize={17} fontSize={15} onPress={scheduleFromRecalls} />
        ) : (
          <View style={{ flex: 1, height: 54, borderRadius: 999, backgroundColor: color.sunken, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icon name="checkbox-circle-line" size={17} color={color.ink5} />
            <Sans size={15} weight={500} color={color.ink5}>{d.state === 'scheduled' ? RECALLS_COPY.scheduledLabel : RECALLS_COPY.repairComplete}</Sans>
          </View>
        )}
        <Pressable accessibilityLabel="Call the service centre" onPress={() => flash(RECALLS_COPY.callToast)}
          style={{ width: 54, height: 54, borderRadius: 999, borderWidth: 1, borderColor: color.hair14, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="phone-line" size={19} color={color.ink} />
        </Pressable>
      </View>
    </View>
  );
}
