import { Platform, Text, type TextProps } from 'react-native';
import { color as C, font } from '../theme/tokens';

export type TxtProps = TextProps & { size: number; lh?: number; ls?: number; color?: string; weight?: 300 | 400 | 500 | 600 | 700; center?: boolean };
type Faces = Record<300 | 400 | 500 | 600 | 700, string>;
const SANS: Faces = { 300: font.sans300, 400: font.sans400, 500: font.sans500, 600: font.sans600, 700: font.sans700 };
const MONO: Faces = { 300: font.mono400, 400: font.mono400, 500: font.mono500, 600: font.mono500, 700: font.mono500 };
const SERIF: Faces = { 300: font.serif400, 400: font.serif400, 500: font.serif400, 600: font.serif400, 700: font.serif400 };

// Geist, Geist Mono and Instrument Serif all report a 1.3 em natural line height (hhea ascender − descender) with the tallest
// lowercase strokes at ≈ 0.75 em. When `lh` is tighter than that, iOS lays the excess out above the first line, where the Text
// view's bounds clip it — the 52/52 splash title lost the top of its caps on the iPhone (Android draws the same overflow
// unclipped, which is why the emulator captures never showed it). Once the excess reaches the ascenders, give the glyphs that
// room as padding and take it back as margin, so nothing around the text moves.
const NATURAL = 1.3;
const ASCENDER = 0.75;
export function overflowRoom(size: number, lh: number | undefined) {
  if (Platform.OS !== 'ios' || lh === undefined) return undefined;
  const excess = size * NATURAL - lh;
  if (excess <= size * (1 - ASCENDER)) return undefined;
  const room = Math.ceil(excess);
  return { paddingTop: room, paddingBottom: room, marginTop: -room, marginBottom: -room };
}

function make(faces: Faces) {
  return function Txt({ size, lh, ls, color = C.ink, weight = 400, center, style, ...rest }: TxtProps) {
    return (
      <Text
        allowFontScaling={false}
        {...rest}
        style={[{ fontFamily: faces[weight], fontSize: size, lineHeight: lh, letterSpacing: ls, color, includeFontPadding: false, textAlign: center ? 'center' : undefined }, overflowRoom(size, lh), style]}
      />
    );
  };
}
export const Sans = make(SANS);
export const Mono = make(MONO);
export const Serif = make(SERIF);
