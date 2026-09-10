import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { EMPTY_REASON, REASONS } from '../../fixtures/recalls';
import { SERVICE_COPY } from '../../fixtures/service';
import { openRecallVehicle, reasonRows } from '../../lib/service';
import { useAppStore } from '../../store/useAppStore';
import { color } from '../../theme/tokens';
import { OutlinePill } from '../../ui/OutlinePill';
import { SheetShell } from '../../ui/Sheet';
import { StatusChip } from '../../ui/StatusChip';
import { Mono, Sans } from '../../ui/Txt';

export function ReasonSheet() {
  const router = useRouter();
  const vehicles = useAppStore((s) => s.vehicles);
  const closeSheet = useAppStore((s) => s.closeSheet);
  const switchTab = useAppStore((s) => s.switchTab);
  const setRecallFilter = useAppStore((s) => s.setRecallFilter);
  const open = openRecallVehicle(vehicles);
  if (!open || !open.recall) return null;
  const recall = open.recall;
  const why = (REASONS[recall.code] ?? EMPTY_REASON).why;
  return (
    <SheetShell onClose={closeSheet} handleMargin={6} paddingBottom={26} gap={14} testID="sheet-reason">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <StatusChip bg={color.red} fg="#fff" icon="alarm-warning-fill" label={SERVICE_COPY.activeRecall} />
        <Mono size={10} ls={1.2} color={color.ink3}>{recall.code}</Mono>
      </View>
      <View style={{ gap: 4 }}>
        <Sans size={21} lh={26} weight={600} ls={-0.5} color={color.ink}>{recall.title}</Sans>
        <Sans size={13} color={color.ink5}>{open.name + ' · ' + open.meta}</Sans>
      </View>
      <View>
        {reasonRows().map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: color.hair07 }}>
            <Mono size={9} ls={1.2} color={color.ink3}>{k}</Mono>
            <Sans size={13} color={color.ink} style={{ textAlign: 'right', flexShrink: 1 }}>{v}</Sans>
          </View>
        ))}
      </View>
      <Sans size={13.5} lh={20} color={color.ink2}>{why}</Sans>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'stretch' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={SERVICE_COPY.continueBooking} onPress={closeSheet}
          style={{ flex: 1.4, height: 50, borderRadius: 999, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' }}>
          <Sans size={14} weight={500} color={color.textOnDark}>{SERVICE_COPY.continueBooking}</Sans>
        </Pressable>
        <OutlinePill label={SERVICE_COPY.fullRecall} icon="arrow-right-up-line" height={50}
          onPress={() => { closeSheet(); switchTab('recalls'); setRecallFilter('open'); router.navigate({ pathname: '/(tabs)/recalls/[id]', params: { id: 'v' + open.id } }); }} />
      </View>
    </SheetShell>
  );
}
