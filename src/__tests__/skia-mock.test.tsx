import { render } from '@testing-library/react-native';
import { Canvas, Group, Image as SkImage, Skia, TileMode, useFont, useImage } from '@shopify/react-native-skia';

function Probe() {
  const img = useImage(1);
  const font = useFont(1, 40);
  return (
    <Canvas testID="canvas" style={{ width: 10, height: 10 }}>
      <Group>
        <SkImage image={img} x={0} y={0} width={1} height={1} fit="cover" />
      </Group>
      {font ? null : null}
    </Canvas>
  );
}

it('renders Skia components through the jest mock and exposes inert factories', () => {
  const { getByTestId } = render(<Probe />);
  expect(getByTestId('canvas')).toBeTruthy();
  expect(getByTestId('skia-Group')).toBeTruthy();
  expect(Skia.RRectXY(Skia.XYWHRect(0, 0, 1, 1), 2, 2)).toEqual({ rect: { x: 0, y: 0, width: 1, height: 1 }, rx: 2, ry: 2 });
  expect(TileMode.Decal).toBe(3);
  const p = Skia.Paint();
  p.setAlphaf(0.5);
  expect(Skia.ImageFilter.MakeBlur(1, 1, TileMode.Clamp, null)).toEqual({});
  const path = Skia.Path.Make();
  path.moveTo(1, 2);
  expect(path.moveTo).toHaveBeenCalledWith(1, 2);
});
