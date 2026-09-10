import { View } from 'react-native';
import { Icon } from './Icon';
import { Mono } from './Txt';

export function StatusChip({ bg, fg, icon, label, size = 9, ls = 1.4, padX = 10, padY = 5, testID }:
  { bg: string; fg: string; icon?: string; label: string; size?: number; ls?: number; padX?: number; padY?: number; testID?: string }) {
  return (
    <View testID={testID} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: bg, paddingVertical: padY, paddingHorizontal: padX }}>
      {icon ? <Icon name={icon} size={12} color={fg} /> : null}
      <Mono size={size} ls={ls} color={fg}>{label}</Mono>
    </View>
  );
}
