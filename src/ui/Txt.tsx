import { Text, type TextProps } from 'react-native';
import { color as C, font } from '../theme/tokens';

export type TxtProps = TextProps & { size: number; lh?: number; ls?: number; color?: string; weight?: 300 | 400 | 500 | 600; center?: boolean };
type Faces = Record<300 | 400 | 500 | 600, string>;
const SANS: Faces = { 300: font.sans300, 400: font.sans400, 500: font.sans500, 600: font.sans600 };
const MONO: Faces = { 300: font.mono400, 400: font.mono400, 500: font.mono500, 600: font.mono500 };
const SERIF: Faces = { 300: font.serif400, 400: font.serif400, 500: font.serif400, 600: font.serif400 };

function make(faces: Faces) {
  return function Txt({ size, lh, ls, color = C.ink, weight = 400, center, style, ...rest }: TxtProps) {
    return (
      <Text
        allowFontScaling={false}
        {...rest}
        style={[{ fontFamily: faces[weight], fontSize: size, lineHeight: lh, letterSpacing: ls, color, includeFontPadding: false, textAlign: center ? 'center' : undefined }, style]}
      />
    );
  };
}
export const Sans = make(SANS);
export const Mono = make(MONO);
export const Serif = make(SERIF);
