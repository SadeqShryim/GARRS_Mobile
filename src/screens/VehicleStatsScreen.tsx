import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { statsFor } from '../lib/derive';
import { useAppStore } from '../store/useAppStore';
import { color } from '../theme/tokens';
import { GlowCard } from '../ui/GlowCard';
import { HealthGauge } from '../ui/HealthGauge';
import { Icon } from '../ui/Icon';
import { MetalButton } from '../ui/MetalButton';
import { OutlinePill } from '../ui/OutlinePill';
import { Mono, Sans } from '../ui/Txt';

export function VehicleStatsScreen({ id, onBack, onRecallDetails }: { id: number; onBack: () => void; onRecallDetails: () => void }) {
  const insets = useSafeAreaInsets();
  const v = useAppStore((s) => s.vehicles.find((x) => x.id === id));
  const scheduled = useAppStore((s) => s.scheduled);
  const schedule = useAppStore((s) => s.schedule);
  const flash = useAppStore((s) => s.flash);
  if (!v) return null;
  const s = statsFor(v, scheduled);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 22, paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable accessibilityLabel="Back" onPress={onBack} style={{ width: 36, height: 36, marginLeft: -8, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrow-left-line" size={20} color={color.ink} />
        </Pressable>
        <View style={{ gap: 2 }}>
          <Sans size={24} lh={28} weight={600} ls={-0.7} color={color.ink}>{s.name}</Sans>
          <Mono size={10} ls={1.4} color={color.ink3}>{s.metaUpper}</Mono>
        </View>
      </View>

      {s.hasRecall ? (
        <GlowCard shell={color.shellDark} radius={20} glow blobSize={210} faceOpacity={0.84} faceRadius={18} faceStyle={{ padding: 18, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: color.red, paddingVertical: 5, paddingHorizontal: 10 }}>
              <Icon name="alarm-warning-fill" size={12} color="#fff" />
              <Mono size={9} ls={1.4} color="#fff">ACTIVE SAFETY RECALL</Mono>
            </View>
            <Mono size={10} ls={1.2} color={color.ink3}>{s.recallCode}</Mono>
          </View>
          <View style={{ gap: 4 }}>
            <Sans size={21} lh={25} weight={600} ls={-0.5} color={color.ink}>{s.recallTitle}</Sans>
            <Sans size={13} color={color.ink5}>Free remedy available · 45 min at Tesla Service, 6.2 mi away</Sans>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'stretch' }}>
            <MetalButton tint="blue" label="Schedule Repair" icon="calendar-2-line" flex={1.4} width="auto" height={50} radius={999} gap={8} iconSize={16} fontSize={14}
              onPress={() => { schedule(); flash('Service booked · Thu 10:30 AM'); }} />
            <OutlinePill label="Details" icon="arrow-right-up-line" height={50} onPress={onRecallDetails} />
          </View>
        </GlowCard>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 16, backgroundColor: color.sunken, paddingVertical: 15, paddingHorizontal: 16 }}>
          <Icon name="shield-check-fill" size={19} color={color.teal} />
          <View style={{ flex: 1, gap: 2 }}>
            <Sans size={14} weight={500} color={color.ink}>{s.clearTitle}</Sans>
            <Mono size={9} ls={1.2} color={color.ink3}>{'CHECKED AGAINST NHTSA · ' + s.clearMeta}</Mono>
          </View>
        </View>
      )}

      <View style={{ borderRadius: 20, backgroundColor: color.sunken, paddingTop: 22, paddingHorizontal: 22, paddingBottom: 26, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Sans size={17} weight={500} color={color.ink5}>Vehicle health</Sans>
          <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: s.gaugeColor }}><Icon name="pulse-line" size={19} color="#ffffff" /></View>
        </View>
        <HealthGauge health={v.health} gaugeColor={s.gaugeColor} word={s.word} />
        <Sans size={13} color={color.ink5} center>{s.summary}</Sans>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {s.tiles.map((t) => (
          <View key={t.label} style={{ width: '48%', flexGrow: 1, borderRadius: 14, backgroundColor: color.sunken, paddingVertical: 14, paddingHorizontal: 15, gap: 7 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <Icon name={t.icon} size={15} color={t.tone} />
              <Mono size={9} ls={1.3} color={color.ink3}>{t.label}</Mono>
            </View>
            <Sans size={20} weight={600} ls={-0.5} color={color.ink}>{t.value}</Sans>
            <Sans size={12} color={color.ink5}>{t.note}</Sans>
          </View>
        ))}
      </View>

      <View style={{ gap: 10 }}>
        <Mono size={10} ls={1.8} color={color.ink4}>MAINTENANCE</Mono>
        {s.service.map((m) => (
          <View key={m.key} style={{ borderRadius: 14, backgroundColor: color.sunken, paddingVertical: 14, paddingHorizontal: 15, gap: 9 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
              <Sans size={14} weight={500} color={color.ink}>{m.label}</Sans>
              <Mono size={11} color={m.tone}>{m.due}</Mono>
            </View>
            <View style={{ height: 3, borderRadius: 2, backgroundColor: color.hair, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${m.pct}%`, borderRadius: 2, backgroundColor: m.tone }} />
            </View>
            <Mono size={9} ls={1.2} color={color.ink3}>{m.meta}</Mono>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}