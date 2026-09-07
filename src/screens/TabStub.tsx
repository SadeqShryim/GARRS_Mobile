import { View } from 'react-native';
import { TABS } from '../fixtures/tabs';
import type { TabId } from '../fixtures/types';
import { color } from '../theme/tokens';
import { Icon } from '../ui/Icon';
import { Mono, Sans } from '../ui/Txt';

export function TabStub({ tab }: { tab: TabId }) {
  const t = TABS.find((x) => x.id === tab) ?? TABS[0];
  const title = t.label.charAt(0) + t.label.slice(1).toLowerCase();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40, paddingBottom: 56 }}>
      <Icon name={t.off} size={26} color={color.ink7} />
      <Sans size={22} weight={600} ls={-0.4} color={color.ink}>{title}</Sans>
      <Mono size={10} ls={1.6} color={color.ink4} center>NOT IN THIS PROTOTYPE YET</Mono>
    </View>
  );
}
