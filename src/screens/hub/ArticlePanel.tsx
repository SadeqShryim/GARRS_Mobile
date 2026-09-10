import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Article } from '../../fixtures/types';
import { cssAngleToPoints } from '../../lib/gradient';
import { color } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { Mono, Sans } from '../../ui/Txt';

export function Wash({ article: a }: { article: Article }) {
  const { width } = useWindowDimensions();
  const pts = cssAngleToPoints(135, width - 40, 150);
  return (
    <LinearGradient colors={a.wash} start={pts.start} end={pts.end} style={{ height: 150, borderRadius: 18, alignItems: 'flex-end', justifyContent: 'flex-end', padding: 16 }}>
      <Icon name={a.icon} size={56} color="rgba(255,255,255,0.85)" />
    </LinearGradient>
  );
}

export function ArticlePeek({ article: a, testID }: { article: Article; testID?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View testID={testID} style={[StyleSheet.absoluteFill, { backgroundColor: color.surface }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: 8 }}>
        <View style={{ width: 38, height: 38, marginLeft: -9, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close-line" size={23} color={color.ink} />
        </View>
        <Mono size={10} ls={1.8} color={color.ink3}>{a.kicker}</Mono>
      </View>
      <View style={{ flex: 1, overflow: 'hidden', gap: 18, paddingTop: 8, paddingHorizontal: 20, paddingBottom: 32 }}>
        <Wash article={a} />
        <Sans size={30} lh={35} weight={600} ls={-1.1} color={color.ink}>{a.title}</Sans>
        <Sans size={15} lh={24} color={color.ink2}>{a.body[0].text}</Sans>
      </View>
    </View>
  );
}
