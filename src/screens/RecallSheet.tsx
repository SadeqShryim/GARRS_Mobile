import { View } from 'react-native';
import { RECALL_ROWS } from '../fixtures/recallSheet';
import { useAppStore } from '../store/useAppStore';
import { color } from '../theme/tokens';
import { MetalButton } from '../ui/MetalButton';
import { OutlinePill } from '../ui/OutlinePill';
import { Sheet } from '../ui/Sheet';
import { Mono, Sans } from '../ui/Txt';

export function RecallSheet({ onDetails }: { onDetails: () => void }) {
  const v = useAppStore((s) => s.vehicles.find((x) => x.recall));
  const scheduled = useAppStore((s) => s.scheduled);
  const schedule = useAppStore((s) => s.schedule);
  const closeSheet = useAppStore((s) => s.closeSheet);
  const switchTab = useAppStore((s) => s.switchTab);
  const flash = useAppStore((s) => s.flash);
  if (!v || !v.recall) return null;
  const r = v.recall;
  return (
    <Sheet title={r.title} sub={r.code + ' · ' + v.name.toUpperCase()} onClose={closeSheet} testID="sheet-recall">
      <View style={{ marginTop: 18 }}>
        {RECALL_ROWS.map(([k, val]) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: color.hair07 }}>
            <Mono size={10} ls={1.2} color={color.ink3}>{k}</Mono>
            <Sans size={13} color={color.ink}>{val}</Sans>
          </View>
        ))}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
          <MetalButton tint="blue" label={scheduled ? 'Scheduled' : 'Schedule Repair'} icon="calendar-2-line" flex={1.5} width="auto" height={54} radius={16} gap={9} iconSize={17} fontSize={15}
            onPress={() => { schedule(); closeSheet(); flash('Service booked · Thu 10:30 AM'); }} />
          <OutlinePill label="Details" icon="arrow-right-up-line" height={54}
            onPress={() => { closeSheet(); switchTab('recalls'); flash(r.code + ' · opening recall detail'); onDetails(); }} />
        </View>
      </View>
    </Sheet>
  );
}
