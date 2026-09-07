import { Pressable } from 'react-native';
import { color } from '../theme/tokens';
import { Icon } from './Icon';
import { Sans } from './Txt';

export function OutlinePill({ label, icon, height, flex = 1, onPress, testID }: { label: string; icon: string; height: number; flex?: number; onPress: () => void; testID?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} testID={testID}
      style={{ flex, height, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 999, borderWidth: 1, borderColor: color.hair14 }}>
      <Sans size={14} weight={500} color={color.ink}>{label}</Sans>
      <Icon name={icon} size={15} color={color.ink} />
    </Pressable>
  );
}
