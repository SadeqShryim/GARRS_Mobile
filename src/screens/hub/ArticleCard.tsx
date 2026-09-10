import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, View } from 'react-native';
import type { Article } from '../../fixtures/types';
import { cssAngleToPoints } from '../../lib/gradient';
import { color } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { Mono, Sans } from '../../ui/Txt';

const WASH = cssAngleToPoints(135, 318, 132);   // linear-gradient(135deg, from 0%, to 100%) over the 318×132 wash

export function ArticleCard({ article: a, onPress }: { article: Article; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={a.title} onPress={onPress} testID={`article-${a.id}`}
      style={{ width: 318, borderRadius: 18, overflow: 'hidden', backgroundColor: color.sunken }}>
      <LinearGradient colors={a.wash} start={WASH.start} end={WASH.end} style={{ height: 132, justifyContent: 'space-between', padding: 16 }}>
        <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.9)', paddingVertical: 5, paddingHorizontal: 10 }}>
          <Icon name={a.icon} size={12} color={color.ink} />
          <Mono size={9} ls={1.3} color={color.ink}>{a.kicker}</Mono>
        </View>
        <Icon name={a.icon} size={44} color="rgba(255,255,255,0.85)" style={{ alignSelf: 'flex-end' }} />
      </LinearGradient>
      <View style={{ paddingTop: 15, paddingHorizontal: 16, paddingBottom: 17, gap: 6 }}>
        <Sans size={18} lh={23} weight={600} ls={-0.4} color={color.ink}>{a.title}</Sans>
        <Sans size={13} lh={19} color={color.ink5}>{a.dek}</Sans>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <Mono size={9} ls={1.2} color={color.ink3}>{a.read}</Mono>
          <Icon name="arrow-right-up-line" size={14} color={color.ink4} />
        </View>
      </View>
    </Pressable>
  );
}
