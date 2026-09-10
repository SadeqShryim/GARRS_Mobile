// Splash.dc.html — the marquee: a 240vmax-wide wrap, top/left 50%, translate(-50%,-50%) rotate(-25deg) scale(1 + .16p²),
// six flex rows (gap 14) of 14 tiles (gap 14), rows translated by rowOffset(); filter: blur(σ) on the wrap.
// CSS applies `filter` before `transform`, so the blur layer is the INNER group: σ then scales with the zoom, as in the source.
import { BlurMask, Group, ImageShader, RoundedRect, Skia, Text as SkText, TileMode, type SkFont, type SkImage } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import glyphMap from '../../assets/remixicon.glyphmap.json';
import { MQ, rowOffset, rowTiles, wrapHeight, wrapWidth, type Tile } from './timeline';
import type { MarqueeValues } from './useMarqueeDrive';

export type MarqueeProps = { width: number; height: number; images: (SkImage | null)[]; font: SkFont | null; v: MarqueeValues; stageOp: SharedValue<number> };

export function Marquee({ width, height, images, font, v, stageOp }: MarqueeProps) {
  const x0 = -wrapWidth(width, height) / 2;
  const y0 = -wrapHeight() / 2;
  const outer = useDerivedValue(() => [
    { translateX: width / 2 }, { translateY: height / 2 }, { rotate: (MQ.rotateDeg * Math.PI) / 180 }, { scale: v.scale.value },
  ]);
  // The wrap's `filter: blur(σ)` (none below .25 px) and the stage's opacity (.3 s) live on the layer paint.
  const layer = useDerivedValue(() => {
    const p = Skia.Paint();
    const s = v.sigma.value;
    if (s > 0) p.setImageFilter(Skia.ImageFilter.MakeBlur(s, s, TileMode.Decal, null));
    p.setAlphaf(stageOp.value);
    return p;
  });
  const rows = useMemo(() => Array.from({ length: MQ.rows }, (_, r) => rowTiles(r)), []);
  return (
    <Group transform={outer}>
      <Group layer={layer}>
        {rows.map((tiles, i) => <Row key={i} i={i} tiles={tiles} x0={x0} y={y0 + i * MQ.rowStep} dist={v.dist} images={images} font={font} />)}
      </Group>
    </Group>
  );
}

function Row({ i, tiles, x0, y, dist, images, font }: { i: number; tiles: Tile[]; x0: number; y: number; dist: SharedValue<number>; images: (SkImage | null)[]; font: SkFont | null }) {
  const transform = useDerivedValue(() => [{ translateX: rowOffset(dist.value, i) }]);
  return (
    <Group transform={transform}>
      {tiles.map((tile, j) => <TileNode key={j} tile={tile} x={x0 + j * MQ.step} y={y} images={images} font={font} />)}
    </Group>
  );
}

// 168×112 r12, box-shadow 0 18px 40px rgba(0,0,0,.55) (σ 20); photo tiles background-size: cover; telltale tiles a 40 px glyph.
function TileNode({ tile, x, y, images, font }: { tile: Tile; x: number; y: number; images: (SkImage | null)[]; font: SkFont | null }) {
  const { tileW: w, tileH: h, radius: r } = MQ;
  const image = tile.photo !== undefined ? images[tile.photo] : null;
  const glyph = useMemo(() => (tile.glyph && font ? glyphPlacement(font, tile.glyph) : null), [font, tile.glyph]);
  return (
    <>
      <RoundedRect x={x} y={y + MQ.shadow.dy} width={w} height={h} r={r} color="black" opacity={MQ.shadow.alpha}>
        <BlurMask blur={MQ.shadow.sigma} style="normal" />
      </RoundedRect>
      <RoundedRect x={x} y={y} width={w} height={h} r={r} color={tile.base} />
      {image && (
        <RoundedRect x={x} y={y} width={w} height={h} r={r}>
          <ImageShader image={image} fit="cover" rect={{ x, y, width: w, height: h }} tx="decal" ty="decal" />
        </RoundedRect>
      )}
      {glyph && font && <SkText font={font} text={glyph.text} x={x + glyph.dx} y={y + glyph.dy} color={tile.tone} />}
    </>
  );
}

// The source centres the <i> glyph with flexbox: x by the glyph's advance, baseline so the (ascent + descent) line box is centred.
export function glyphPlacement(font: Pick<SkFont, 'getGlyphIDs' | 'getGlyphWidths' | 'getMetrics'>, name: string) {
  const cp = (glyphMap as Record<string, number>)[name];
  const text = String.fromCodePoint(cp);
  const ids = font.getGlyphIDs(text);
  const adv = font.getGlyphWidths(ids)[0] ?? MQ.glyphSize;
  const m = font.getMetrics();
  return { text, dx: (MQ.tileW - adv) / 2, dy: MQ.tileH / 2 - (m.ascent + m.descent) / 2 };
}
