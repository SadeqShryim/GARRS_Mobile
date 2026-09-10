import { View } from 'react-native';
import { MEMBERSHIP_COPY, PLANS } from '../../fixtures/profile';
import { useAppStore } from '../../store/useAppStore';
import { color } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { SlideUpScreen } from '../../ui/SlideUpScreen';
import { Sans } from '../../ui/Txt';
import { PlanCard } from './PlanCard';

export function MembershipScreen() {
  const plan = useAppStore((s) => s.plan);
  const setPlan = useAppStore((s) => s.setPlan);
  const closeScreen = useAppStore((s) => s.closeScreen);
  return (
    <SlideUpScreen caption={MEMBERSHIP_COPY.caption} onClose={closeScreen} gap={16} testID="screen-membership">
      <View style={{ gap: 7 }}>
        <Sans size={32} lh={36} weight={600} ls={-1.1} color={color.ink}>{MEMBERSHIP_COPY.title}</Sans>
        <Sans size={14} lh={21} color={color.ink5}>{MEMBERSHIP_COPY.sub}</Sans>
      </View>
      {PLANS.map((p) => <PlanCard key={p.id} plan={p} active={p.id === plan} onSelect={() => setPlan(p.id)} />)}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingTop: 2, paddingHorizontal: 2 }}>
        <Icon name="lock-line" size={14} color={color.ink4} />
        <Sans size={12} lh={18} color={color.ink5} style={{ flex: 1 }}>{MEMBERSHIP_COPY.billed}</Sans>
      </View>
    </SlideUpScreen>
  );
}
