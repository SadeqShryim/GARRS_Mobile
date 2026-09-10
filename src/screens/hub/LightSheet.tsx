import { Pressable, View } from 'react-native';
import { BADGE, HUB_COPY, lightById } from '../../lib/hub';
import { useAppStore } from '../../store/useAppStore';
import { color } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { SheetShell } from '../../ui/Sheet';
import { StatusChip } from '../../ui/StatusChip';
import { Mono, Sans } from '../../ui/Txt';

export function LightSheet() {
  const hubLight = useAppStore((s) => s.hubLight);
  const closeLight = useAppStore((s) => s.closeLight);
  const l = lightById(hubLight);
  if (!l) return null;
  const [badge, badgeBg, badgeFg] = BADGE[l.group];
  return (
    <SheetShell onClose={closeLight} handleMargin={6} paddingBottom={26} gap={14} testID="sheet-light">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
        <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: color.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          {l.icon ? <Icon name={l.icon} size={27} color={l.tone} /> : null}
          {l.glyph ? <Mono size={15} weight={500} color={l.tone}>{l.glyph}</Mono> : null}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Sans size={19} weight={600} ls={-0.4} color={color.ink}>{l.name}</Sans>
          <View style={{ alignSelf: 'flex-start' }}>
            <StatusChip bg={badgeBg} fg={badgeFg} label={badge} ls={1.3} padX={9} padY={4} />
          </View>
        </View>
      </View>
      <Sans size={14} lh={21} color={color.ink2}>{l.means}</Sans>
      <View style={{ gap: 9, borderRadius: 14, backgroundColor: color.sunken, paddingVertical: 14, paddingHorizontal: 15 }}>
        <Mono size={9} ls={1.3} color={color.ink3}>{HUB_COPY.whatToDo}</Mono>
        <Sans size={13.5} lh={20} color={color.ink}>{l.action}</Sans>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={HUB_COPY.gotIt} onPress={closeLight}
        style={{ height: 50, borderRadius: 999, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' }}>
        <Sans size={14} weight={500} color={color.textOnDark}>{HUB_COPY.gotIt}</Sans>
      </Pressable>
    </SheetShell>
  );
}
