import { Pressable, View } from 'react-native';
import { RECALLS_COPY, STATE_META } from '../../fixtures/recalls';
import type { RecallItem } from '../../fixtures/types';
import { itemRows } from '../../lib/recalls';
import { color } from '../../theme/tokens';
import { GlowCard } from '../../ui/GlowCard';
import { Icon } from '../../ui/Icon';
import { MetalButton } from '../../ui/MetalButton';
import { OutlinePill } from '../../ui/OutlinePill';
import { StatusChip } from '../../ui/StatusChip';
import { Mono, Sans } from '../../ui/Txt';

export function RecallCard({ item: x, vehicleLabel, expanded, onToggle, onSchedule, onDetails }:
  { item: RecallItem; vehicleLabel: string; expanded: boolean; onToggle: () => void; onSchedule: () => void; onDetails: () => void }) {
  const m = STATE_META[x.state];
  const open = x.state === 'open';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={x.title} onPress={onToggle} testID={`recall-${x.id}`}>
      <GlowCard shell={open ? color.shellDark : color.sunken} radius={18} glow={open} blobSize={200} faceOpacity={open ? 0.86 : 0} faceRadius={16} faceStyle={{ padding: 16, gap: 12 }} outline="rgba(0,0,0,0.08)">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <StatusChip bg={m.chipBg} fg={m.chipFg} icon={m.icon} label={m.status} />
          <Mono size={10} ls={1.2} color={color.ink3}>{x.code}</Mono>
          <Icon name={expanded ? 'arrow-up-s-line' : 'arrow-down-s-line'} size={20} color={color.ink4} style={{ marginLeft: 'auto' }} />
        </View>
        <View style={{ gap: 3 }}>
          <Sans size={18} lh={23} weight={600} ls={-0.3} color={color.ink}>{x.title}</Sans>
          <Sans size={13} color={color.ink5}>{vehicleLabel}</Sans>
        </View>
        {expanded && (
          <View testID={`recall-rows-${x.id}`}>
            {itemRows(x).map(([k, v]) => (
              <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: color.hair07 }}>
                <Mono size={9} ls={1.2} color={color.ink3}>{k}</Mono>
                <Sans size={13} color={color.ink} style={{ textAlign: 'right', flexShrink: 1 }}>{v}</Sans>
              </View>
            ))}
          </View>
        )}
        {open && (
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'stretch' }}>
            <MetalButton tint="blue" label={RECALLS_COPY.scheduleRepair} icon="calendar-2-line" flex={1.4} width="auto" height={48} radius={999} gap={8} iconSize={16} fontSize={14} onPress={onSchedule} />
            <OutlinePill label={RECALLS_COPY.seeDetails} icon="arrow-right-line" height={48} onPress={onDetails} />
          </View>
        )}
      </GlowCard>
    </Pressable>
  );
}
