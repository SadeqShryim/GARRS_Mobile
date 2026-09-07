import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { counter, fleetLine, isOpenRecall, recallCount } from '../lib/derive';
import { useAppStore } from '../store/useAppStore';
import { color } from '../theme/tokens';
import { Icon } from '../ui/Icon';
import { MetalButton } from '../ui/MetalButton';
import { Mono, Sans } from '../ui/Txt';
import { Pager } from './garage/Pager';
import { Rail } from './garage/Rail';

export function GarageScreen({ onOpenStats }: { onOpenStats: (id: number) => void }) {
  const insets = useSafeAreaInsets();
  const vehicles = useAppStore((s) => s.vehicles);
  const idx = useAppStore((s) => s.idx);
  const scheduled = useAppStore((s) => s.scheduled);
  const openSheet = useAppStore((s) => s.openSheet);
  const alerts = vehicles.filter((v) => isOpenRecall(v, scheduled));
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 26, paddingTop: insets.top, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
      <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}>
        <View style={{ width: 36, height: 36, marginLeft: -8, alignItems: 'center', justifyContent: 'center' }}><Icon name="menu-2-line" size={20} color={color.ink5} /></View>
        <Mono size={11} ls={2.6} color={color.ink5} center style={{ flex: 1 }}>RECALL HUB</Mono>
        <View style={{ width: 36, height: 36, marginRight: -8, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="notification-3-line" size={19} color={color.ink5} />
          <View style={{ position: 'absolute', right: 6, top: 7, width: 6, height: 6, borderRadius: 3, backgroundColor: color.red }} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, paddingHorizontal: 20 }}>
        <View style={{ gap: 6 }}>
          <Sans size={38} lh={42} weight={600} ls={-1.2} color={color.ink}>Garage</Sans>
          <Mono size={11} ls={1.4} color={color.ink4}>{fleetLine(vehicles, scheduled)}</Mono>
        </View>
        <MetalButton tint="blue" label="Add Vehicle" icon="sparkling-2-line" onPress={() => openSheet('add')} />
      </View>

      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 20 }}>
          <Mono size={10} ls={1.8} color={color.ink4}>YOUR VEHICLES</Mono>
          <Mono size={10} ls={1.8} color={color.ink4}>{counter(idx, vehicles.length)}</Mono>
        </View>
        <Rail onOpenStats={onOpenStats} />
        <Pager />
      </View>

      <View style={{ gap: 10, paddingHorizontal: 20 }}>
        <Mono size={10} ls={1.8} color={color.ink4}>NEEDS ATTENTION</Mono>
        {alerts.map((v) => (
          <Pressable key={v.id} onPress={() => openSheet('recall')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, backgroundColor: color.sunken }}>
            <Icon name="error-warning-line" size={18} color={color.red} />
            <View style={{ flex: 1, gap: 2 }}>
              <Sans size={14} weight={500} color={color.ink}>{v.recall!.title}</Sans>
              <Mono size={10} ls={1} color={color.ink3}>{v.recall!.code + ' · ' + v.name.toUpperCase()}</Mono>
            </View>
            <Icon name="arrow-right-s-line" size={20} color={color.ink4} />
          </Pressable>
        ))}
        {recallCount(vehicles, scheduled) === 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, backgroundColor: color.sunken }}>
            <Icon name="checkbox-circle-fill" size={18} color={color.teal} />
            <Sans size={14} color={color.ink2}>Nothing outstanding across your fleet.</Sans>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
