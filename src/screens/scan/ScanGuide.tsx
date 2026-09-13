// src/screens/scan/ScanGuide.tsx
// Spec §11 — the capture window: a scrim built from four views around the guide rect (no mask needed, so nothing
// here depends on masked-view or Skia) plus the four corner marks and the window hairline. Pure layout: it takes a
// rect in preview points and draws, so the same component works for any device width.
import { StyleSheet, View } from 'react-native';
import type { Rect } from '../../ocr/crop';

export const SCAN_SCRIM = 'rgba(8,8,10,0.62)';          // §11 — color.splash at 62 %
export const GUIDE_HAIRLINE = 'rgba(255,255,255,0.35)'; // §11
const MARK = 18;                                        // §11 — 18 px legs, 2 px, white, radius 6 on the outer corner

export function ScanGuide({ rect, testID = 'scan-guide' }: { rect: Rect; testID?: string }) {
  const { x, y, w, h } = rect;
  return (
    <View pointerEvents="none" testID={testID} style={StyleSheet.absoluteFill}>
      <View style={[styles.scrim, { left: 0, right: 0, top: 0, height: y }]} />
      <View style={[styles.scrim, { left: 0, right: 0, top: y + h, bottom: 0 }]} />
      <View style={[styles.scrim, { left: 0, width: x, top: y, height: h }]} />
      <View style={[styles.scrim, { left: x + w, right: 0, top: y, height: h }]} />
      <View style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderWidth: 1, borderColor: GUIDE_HAIRLINE }} />
      <View style={[styles.mark, { left: x, top: y, borderLeftWidth: 2, borderTopWidth: 2, borderTopLeftRadius: 6 }]} />
      <View style={[styles.mark, { left: x + w - MARK, top: y, borderRightWidth: 2, borderTopWidth: 2, borderTopRightRadius: 6 }]} />
      <View style={[styles.mark, { left: x, top: y + h - MARK, borderLeftWidth: 2, borderBottomWidth: 2, borderBottomLeftRadius: 6 }]} />
      <View style={[styles.mark, { left: x + w - MARK, top: y + h - MARK, borderRightWidth: 2, borderBottomWidth: 2, borderBottomRightRadius: 6 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', backgroundColor: SCAN_SCRIM },
  mark: { position: 'absolute', width: MARK, height: MARK, borderColor: '#FFFFFF' },
});
