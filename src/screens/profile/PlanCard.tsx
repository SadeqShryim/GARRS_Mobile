import { Pressable, View } from 'react-native';
import { MEMBERSHIP_COPY } from '../../fixtures/profile';
import type { Plan } from '../../fixtures/types';
import { featureVals } from '../../lib/membership';
import { color } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { MetalButton } from '../../ui/MetalButton';
import { ShineBorder } from '../../ui/ShineBorder';
import { Sans } from '../../ui/Txt';

export function PlanCard({ plan: p, active, onSelect }: { plan: Plan; active: boolean; onSelect: () => void }) {
  const label = active ? MEMBERSHIP_COPY.current : p.cta;
  const inner = (
    <View style={{ borderRadius: 14, backgroundColor: color.surface, borderWidth: 1, borderColor: p.recommend ? 'transparent' : color.hair10, padding: 18, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ gap: 5 }}>
          <Sans size={18} weight={600} ls={-0.3} color={color.ink}>{p.name}</Sans>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Sans size={32} weight={600} ls={-1.3} color={color.ink}>{p.price}</Sans>
            <Sans size={13} color={color.ink5}>{MEMBERSHIP_COPY.perMonth}</Sans>
          </View>
        </View>
        {p.recommend ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, backgroundColor: color.ink, paddingVertical: 5, paddingHorizontal: 10 }}>
            <Icon name="fire-fill" size={13} color={color.textOnDark} />
            <Sans size={11} weight={500} color={color.textOnDark}>{MEMBERSHIP_COPY.recommend}</Sans>
          </View>
        ) : null}
      </View>
      <View style={{ height: 1, backgroundColor: color.hair08 }} />
      <View style={{ gap: 10 }}>
        {p.features.map((f) => {
          const v = featureVals(f);
          return (
            <View key={v.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <Icon name={v.icon} size={15} color={v.color} />
              <Sans size={13} color={v.text}>{v.label}</Sans>
            </View>
          );
        })}
      </View>
      {p.recommend ? (
        // metalPill without a tint (line 2109): the default chrome ramp over the dark face, r12, full width
        <MetalButton tint="default" label={label} icon="sparkling-2-line" width="auto" height={48} radius={12} gap={8} iconSize={16} fontSize={14} onPress={onSelect} testID={`plan-cta-${p.id}`} />
      ) : (
        <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: active }} disabled={active} onPress={onSelect} testID={`plan-cta-${p.id}`}
          style={{ height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: active ? color.sunken : color.surface, borderWidth: 1, borderColor: active ? 'transparent' : color.hair14 }}>
          <Sans size={14} weight={500} color={active ? color.ink5 : color.ink}>{label}</Sans>
        </Pressable>
      )}
    </View>
  );
  return p.recommend
    ? <ShineBorder ramp="plus" radius={16} style={{ padding: 2 }} testID={`plan-${p.id}`}>{inner}</ShineBorder>
    : <View testID={`plan-${p.id}`} style={{ borderRadius: 16, backgroundColor: color.surface }}>{inner}</View>;
}
