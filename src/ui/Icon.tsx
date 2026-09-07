import { createIconSet } from '@expo/vector-icons';
import type { TextStyle } from 'react-native';
import glyphMap from '../assets/remixicon.glyphmap.json';

export type IconName = keyof typeof glyphMap;
const Remix = createIconSet(glyphMap as Record<string, number>, 'remixicon', require('../assets/fonts/remixicon.ttf'));

export function Icon({ name, size = 16, color = '#17161A', style }: { name: IconName | string; size?: number; color?: string; style?: TextStyle }) {
  return <Remix name={name as IconName} size={size} color={color} style={style} />;
}
