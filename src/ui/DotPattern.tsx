import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';

const FADE = ['transparent', '#000', '#000', 'transparent'] as const;

export function DotPattern() {
  return (
    <MaskedView
      testID="dot-pattern"
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      maskElement={<LinearGradient colors={[...FADE]} locations={[0, 0.1, 0.9, 1]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />}
    >
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={<LinearGradient colors={[...FADE]} locations={[0, 0.14, 0.86, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />}
      >
        <Svg width="100%" height="100%">
          <Defs>
            <Pattern id="dots" width={16} height={16} patternUnits="userSpaceOnUse">
              <Circle cx={1} cy={1} r={1} fill="rgba(120,120,120,0.48)" />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#dots)" />
        </Svg>
      </MaskedView>
    </MaskedView>
  );
}
