// The single Skia canvas under the RN layers: marquee (blur layer inside the zoom/rotate group), vignette, the crash photo with
// its live filter, the veil, and the bubble's backdrop filter. Everything animated is a shared/derived value.
import { BackdropFilter, Blur, Canvas, ColorMatrix, Fill, Group, ImageFilter, Image as SkImage, LinearGradient as SkLinearGradient, RadialGradient, Rect, Skia, TileMode, useFont, useImage, vec, type SkImage as SkImageType } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { HERO, TILES } from '../../fixtures/splash';
import { color } from '../../theme/tokens';
import type { BubbleValues } from './Bubble';
import { Marquee } from './Marquee';
import { MQ, colorMatrix, coverRect } from './timeline';
import type { MarqueeValues } from './useMarqueeDrive';
import type { TimelineValues } from './useSplashTimeline';

const REMIX = require('../../assets/fonts/remixicon.ttf');

export type StageProps = { width: number; height: number; marquee: MarqueeValues; tl: TimelineValues; bubble: BubbleValues; bubbleMounted: boolean };

export function Stage({ width, height, marquee, tl, bubble, bubbleMounted }: StageProps) {
  const t1 = useImage(TILES[0]);
  const t2 = useImage(TILES[1]);
  const t3 = useImage(TILES[2]);
  const t4 = useImage(TILES[3]);
  const t5 = useImage(TILES[4]);
  const hero = useImage(HERO);
  const font = useFont(REMIX, MQ.glyphSize);
  return (
    <Canvas style={{ position: 'absolute', left: 0, top: 0, width, height }} testID="stage">
      <Fill color={color.splash} />
      <Marquee width={width} height={height} images={[t1, t2, t3, t4, t5]} font={font} v={marquee} stageOp={tl.stageOp} />
      <Vignette width={width} height={height} opacity={tl.stageOp} />
      <Photo width={width} height={height} image={hero} scale={tl.photoScale} opacity={tl.photoOp} fx={tl.photoFx} />
      <Veil width={width} height={height} opacity={tl.veilOp} />
      {bubbleMounted && <BubbleBackdrop v={bubble} />}
    </Canvas>
  );
}

// radial-gradient(118% 76% at 50% 50%, rgba(8,8,10,0) 22%, rgba(8,8,10,.68) 64%, #08080A 100%) — the two sizes are radii.
function Vignette({ width, height, opacity }: { width: number; height: number; opacity: SharedValue<number> }) {
  return (
    <Rect x={0} y={0} width={width} height={height} opacity={opacity}>
      <RadialGradient
        c={vec(0, 0)} r={1}
        colors={['rgba(8,8,10,0)', 'rgba(8,8,10,0.68)', '#08080A']} positions={[0.22, 0.64, 1]}
        transform={[{ translateX: width / 2 }, { translateY: height / 2 }, { scaleX: 1.18 * width }, { scaleY: 0.76 * height }]}
      />
    </Rect>
  );
}

// crash-hero.jpg cover 50% 40%; opacity .32 s; filter none → blur(11px) brightness(.6) saturate(.9) .65 s; scale 1.1 → 1 → 1.16 1.6 s.
// `filter` precedes `transform` in CSS, so the blur sits on the image inside the scale group (σ scales with it).
function Photo({ width, height, image, scale, opacity, fx }: { width: number; height: number; image: SkImageType | null; scale: SharedValue<number>; opacity: SharedValue<number>; fx: SharedValue<number> }) {
  const transform = useDerivedValue(() => [{ scale: scale.value }]);
  const blur = useDerivedValue(() => 11 * fx.value);
  const matrix = useDerivedValue(() => colorMatrix(1 - 0.4 * fx.value, 1 - 0.1 * fx.value));
  if (!image) return null;
  const r = coverRect(width, height, image.width(), image.height());
  return (
    <Group transform={transform} origin={vec(width / 2, height / 2)}>
      <SkImage image={image} x={r.x} y={r.y} width={r.width} height={r.height} fit="fill" opacity={opacity}>
        <Blur blur={blur} mode="clamp" />
        <ColorMatrix matrix={matrix} />
      </SkImage>
    </Group>
  );
}

// linear-gradient(180deg, rgba(8,8,10,.30) 0%, rgba(8,8,10,.06) 40%, rgba(8,8,10,.66) 100%), opacity .4 s.
function Veil({ width, height, opacity }: { width: number; height: number; opacity: SharedValue<number> }) {
  return (
    <Rect x={0} y={0} width={width} height={height} opacity={opacity}>
      <SkLinearGradient start={vec(0, 0)} end={vec(0, height)} colors={['rgba(8,8,10,0.30)', 'rgba(8,8,10,0.06)', 'rgba(8,8,10,0.66)']} positions={[0, 0.4, 1]} />
    </Rect>
  );
}

// The face's outline: border-radius 28px with border-bottom-left-radius 9px (Skia rrects are uniform per axis, so a path).
export function bubblePath(x: number, y: number, w: number, h: number, r = 28, rbl = 9) {
  'worklet';
  const p = Skia.Path.Make();
  p.moveTo(x + r, y);
  p.lineTo(x + w - r, y);
  p.arcToTangent(x + w, y, x + w, y + r, r);
  p.lineTo(x + w, y + h - r);
  p.arcToTangent(x + w, y + h, x + w - r, y + h, r);
  p.lineTo(x + rbl, y + h);
  p.arcToTangent(x, y + h, x, y + h - rbl, rbl);
  p.lineTo(x, y + r);
  p.arcToTangent(x, y, x + r, y, r);
  p.close();
  return p;
}

// backdrop-filter: blur(16px) saturate(1.6), clipped to the face and moving with the pop. CSS fades a backdrop-filtered element
// by its opacity; a Skia backdrop has no alpha, so the strength (σ and the saturation boost) follows the same curve instead.
function BubbleBackdrop({ v }: { v: BubbleValues }) {
  const clip = useDerivedValue(() => { const f = v.frame.value; return bubblePath(f.x, f.y, f.w, f.h); });
  const origin = useDerivedValue(() => { const f = v.frame.value; return { x: f.x + f.w / 2, y: f.y + f.h / 2 }; });
  const transform = useDerivedValue(() => [{ translateY: v.ty.value }, { scale: v.scale.value }]);
  const filter = useDerivedValue(() => {
    const s = v.pop.value * v.opacity.value;
    const sat = Skia.ImageFilter.MakeColorFilter(Skia.ColorFilter.MakeMatrix(colorMatrix(1, 1 + 0.6 * s)), null);
    return s > 0.001 ? Skia.ImageFilter.MakeBlur(16 * s, 16 * s, TileMode.Clamp, sat) : sat;
  });
  return <BackdropFilter clip={clip} origin={origin} transform={transform} filter={<ImageFilter filter={filter} />} />;
}
