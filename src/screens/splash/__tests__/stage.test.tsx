import { render } from '@testing-library/react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useBubbleValues } from '../Bubble';
import { glyphPlacement } from '../Marquee';
import { Stage, bubblePath } from '../Stage';

function Host({ mounted }: { mounted: boolean }) {
  const one = useSharedValue(1);
  const zero = useSharedValue(0);
  const bubble = useBubbleValues();
  return (
    <Stage
      width={412} height={915}
      marquee={{ t: zero, dist: zero, sigma: zero, scale: one }}
      tl={{ stageOp: one, markOp: one, photoOp: zero, photoScale: one, photoFx: zero, veilOp: zero, blobOp: zero, authOp: zero }}
      bubble={bubble} bubbleMounted={mounted}
    />
  );
}

it('draws the stage and mounts the bubble backdrop only while the bubble is up', () => {
  const { getByTestId, queryByTestId, rerender } = render(<Host mounted={false} />);
  expect(getByTestId('stage')).toBeTruthy();
  expect(queryByTestId('skia-BackdropFilter')).toBeNull();
  rerender(<Host mounted />);
  expect(getByTestId('skia-BackdropFilter')).toBeTruthy();
});

it('centres a telltale glyph the way flexbox centres its line box', () => {
  const font = { getGlyphIDs: () => [7], getGlyphWidths: () => [30], getMetrics: () => ({ ascent: -36, descent: 8, leading: 0 }) };
  const g = glyphPlacement(font, 'fire-fill');
  expect(g.text).toBe(String.fromCodePoint(60722));
  expect(g.dx).toBe(69);    // (168 − 30) / 2
  expect(g.dy).toBe(70);    // 112 / 2 − (−36 + 8) / 2
});

it('builds the bubble outline with a 9 px bottom-left corner', () => {
  const p = bubblePath(35, 425, 360, 82) as unknown as Record<string, jest.Mock>;
  expect(p.moveTo).toHaveBeenCalledWith(63, 425);
  expect(p.arcToTangent).toHaveBeenCalledTimes(4);
  expect(p.arcToTangent).toHaveBeenNthCalledWith(1, 395, 425, 395, 453, 28);
  expect(p.arcToTangent).toHaveBeenNthCalledWith(3, 35, 507, 35, 498, 9);
  expect(p.close).toHaveBeenCalled();
});
