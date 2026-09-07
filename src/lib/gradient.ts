// CSS linear-gradient angle → expo-linear-gradient start/end points.
// The gradient line runs through the centre at angle θ (0 = to top, clockwise)
// and its length is |w·sinθ| + |h·cosθ| per the CSS spec.
export function cssAngleToPoints(deg: number, w: number, h: number) {
  const t = (deg * Math.PI) / 180;
  const dx = Math.sin(t);
  const dy = -Math.cos(t);
  const len = Math.abs(w * dx) + Math.abs(h * dy);
  const cx = w / 2;
  const cy = h / 2;
  return {
    start: { x: (cx - (dx * len) / 2) / w, y: (cy - (dy * len) / 2) / h },
    end: { x: (cx + (dx * len) / 2) / w, y: (cy + (dy * len) / 2) / h },
  };
}
