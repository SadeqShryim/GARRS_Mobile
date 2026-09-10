// Splash.dc.html — the email / password / confirm fields: h52, r999, gap 8, padding 0 6 0 (16 | 12), glass fill,
// a 40×40 glass arrow on the right when the step's condition holds.
import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { cssAngleToPoints } from '../../lib/gradient';
import { font } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';

const FILL = ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.14)', 'rgba(255,255,255,0.04)'] as const;
const ARROW_FILL = ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.24)', 'rgba(255,255,255,0.08)'] as const;
const STOPS = [0, 0.45, 1] as const;
const SHADOW = 'inset 0 1.5px 1px rgba(255,255,255,0.26), inset 0 -1.5px 1.5px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.13), 0 10px 24px rgba(0,0,0,0.4)';
const ARROW_SHADOW = 'inset 0 1px 1px rgba(255,255,255,0.4), inset 0 0 0 1px rgba(255,255,255,0.18)';
const ARROW_PTS = cssAngleToPoints(-72, 40, 40);

export type GlassFieldProps = {
  leading: ReactNode;
  paddingLeft: 16 | 12;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  secure?: boolean;
  email?: boolean;
  onSubmit: () => void;
  arrow: boolean;
  arrowLabel: 'Continue' | 'Finish';
  testID?: string;
};

export function GlassField({ leading, paddingLeft, value, onChangeText, placeholder, secure, email, onSubmit, arrow, arrowLabel, testID }: GlassFieldProps) {
  const [box, setBox] = useState({ w: 320, h: 52 });
  const pts = cssAngleToPoints(-72, box.w, box.h);
  return (
    <View onLayout={(e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} style={[styles.field, { paddingLeft }]}>
      <LinearGradient colors={FILL} locations={STOPS} start={pts.start} end={pts.end} style={StyleSheet.absoluteFill} />
      {leading}
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.45)"
        secureTextEntry={secure}
        keyboardType={email ? 'email-address' : 'default'}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType={arrowLabel === 'Finish' ? 'done' : 'next'}
        submitBehavior="submit"
        onSubmitEditing={onSubmit}
        allowFontScaling={false}
        style={styles.input}
      />
      {arrow && (
        <Pressable accessibilityRole="button" accessibilityLabel={arrowLabel} onPress={onSubmit} style={styles.arrow}>
          <LinearGradient colors={ARROW_FILL} locations={STOPS} start={ARROW_PTS.start} end={ARROW_PTS.end} style={StyleSheet.absoluteFill} />
          <Icon name="arrow-right-line" size={18} color="#FFFFFF" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 52, paddingRight: 6, borderRadius: 999, overflow: 'hidden', boxShadow: SHADOW },
  input: { flex: 1, minWidth: 0, height: '100%', fontFamily: font.sans400, fontSize: 15, color: '#FFFFFF', padding: 0, includeFontPadding: false },
  arrow: { width: 40, height: 40, borderRadius: 999, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', boxShadow: ARROW_SHADOW },
});
