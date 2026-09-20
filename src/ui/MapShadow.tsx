// The silhouette under the Service map (user request, 2026-09-20): the design tilts the card up to ±8° with nothing to show
// it against, so on the white page the motion barely reads. The Garage cards have the look wanted here — a still, solid
// shell one step darker than the face, the face sitting 2 px inside it (GlowCard) — so the map gets the same: a solid
// rounded rect one step darker than the map's own sunken fill, 2 px outside the card, no blur, no offset. The card leaning
// over it is what makes the tilt visible. It is a sibling under the card, outside its overflow clip.
import { StyleSheet, View } from 'react-native';

const INSET = 2;                 // GlowCard's face margin
const SHELL = '#E4E3DF';         // one step below color.sunken (#F2F1EE), as the Garage shell sits one step below its face

export function MapShadow() {
  return <View pointerEvents="none" testID="map-shadow" style={styles.shell} />;
}

const styles = StyleSheet.create({
  shell: { position: 'absolute', left: -INSET, right: -INSET, top: -INSET, bottom: -INSET, borderRadius: 16 + INSET, backgroundColor: SHELL },
});
