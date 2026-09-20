// The shadow under the Service map (user request, 2026-09-20): the design tilts the card up to ±8° with nothing to show it
// against, so on the white page the motion barely reads. A still, soft darkness sits behind the card — it does not move; the
// card leaning over it is what makes the tilt visible. It is a sibling under the card, outside its overflow clip.
import { StyleSheet, View } from 'react-native';

const SHADOW = '0 16px 32px rgba(23,22,26,0.30), 0 4px 10px rgba(23,22,26,0.14)';

export function MapShadow() {
  return <View pointerEvents="none" testID="map-shadow" style={styles.plate} />;
}

const styles = StyleSheet.create({
  plate: { position: 'absolute', left: 6, right: 6, top: 10, bottom: -6, borderRadius: 16, boxShadow: SHADOW },
});
