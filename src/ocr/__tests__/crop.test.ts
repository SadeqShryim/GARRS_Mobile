import { cropRectFor, guideRect, orientationOf } from '../crop';

// Shared fixture: the S24-ish 412x915 preview used throughout the spec (§8).
const preview = { w: 412, h: 915 };

describe('guideRect', () => {
  it('412x915 preview -> x 16, y 348, w 380, h 72 (spec §8 worked example)', () => {
    // w = 412 - 32 = 380; h = round(380 * 0.19) = round(72.2) = 72
    // y = round(0.42 * 915 - 72 / 2) = round(384.3 - 36) = round(348.3) = 348
    const rect = guideRect(preview);
    expect(rect).toEqual({ x: 16, y: 348, w: 380, h: 72 });
    // Rounding note (per brief): height rounds first, then the centre-derived y rounds once more —
    // stated tolerance is +/-1 on y; this preview lands exactly on 348 with that scheme.
    expect(Math.abs(rect.y - 348)).toBeLessThanOrEqual(1);
  });

  it('scales the guide with a narrower preview, keeping the 16pt gutter and 42% centre', () => {
    const rect = guideRect({ w: 320, h: 700 });
    expect(rect.x).toBe(16);
    expect(rect.w).toBe(320 - 32); // 288
    expect(rect.h).toBe(Math.round(288 * 0.19)); // 55
    expect(rect.y).toBe(Math.round(0.42 * 700 - rect.h / 2));
  });
});

describe('orientationOf', () => {
  it('reads exif.Orientation when present', () => {
    expect(orientationOf({ Orientation: 6 })).toBe(6);
    expect(orientationOf({ Orientation: 8 })).toBe(8);
    expect(orientationOf({ Orientation: 3 })).toBe(3);
  });

  it('defaults to 1 (upright) when the tag, the exif object, or exif itself is missing', () => {
    expect(orientationOf({})).toBe(1);
    expect(orientationOf(null)).toBe(1);
    expect(orientationOf(undefined)).toBe(1);
  });
});

describe('cropRectFor', () => {
  const guide = guideRect(preview); // { x: 16, y: 348, w: 380, h: 72 }

  it('landscape 4000x3000 photo, no orientation (upright) — worked derivation, §8', () => {
    // s = max(412/4000, 915/3000) = max(0.103, 0.305) = 0.305 (height is the binding dimension)
    const s = Math.max(412 / 4000, 915 / 3000);
    expect(s).toBeCloseTo(0.305, 10);
    // offX = (412 - 4000*0.305)/2 = (412 - 1220)/2 = -404; offY = (915 - 3000*0.305)/2 = 0
    const offX = (412 - 4000 * s) / 2;
    const offY = (915 - 3000 * s) / 2;
    expect(offX).toBeCloseTo(-404, 10);
    expect(offY).toBeCloseTo(0, 10);
    // pad = 0.06 * guide.h = 0.06 * 72 = 4.32, applied on every side
    const padPx = 0.06 * guide.h;
    expect(padPx).toBeCloseTo(4.32, 10);
    const gx = guide.x - padPx; // 11.68
    const gy = guide.y - padPx; // 343.68
    const gw = guide.w + 2 * padPx; // 388.64
    const gh = guide.h + 2 * padPx; // 80.64
    // Map preview -> upright-photo space (orientation 1, so this is also stored-photo space)
    const ux = (gx - offX) / s; // (11.68 + 404) / 0.305 = 1362.885...
    const uy = (gy - offY) / s; // 343.68 / 0.305 = 1126.819...
    const uw = gw / s; // 388.64 / 0.305 = 1274.229...
    const uh = gh / s; // 80.64 / 0.305 = 264.393...
    expect(ux).toBeCloseTo(1362.8852459, 5);
    expect(uy).toBeCloseTo(1126.8196721, 5);
    expect(uw).toBeCloseTo(1274.2295082, 5);
    expect(uh).toBeCloseTo(264.3934426, 5);
    // Rounded (clamp is a no-op here: [1363, 2637] x [1127, 1391] is well inside 4000x3000)
    const expected = { x: Math.round(ux), y: Math.round(uy), w: Math.round(uw), h: Math.round(uh) };
    expect(expected).toEqual({ x: 1363, y: 1127, w: 1274, h: 264 });

    const rect = cropRectFor(guide, preview, { w: 4000, h: 3000 });
    expect(rect).toEqual(expected);

    // Invariants (spec §8 / brief)
    expect(Number.isInteger(rect.x)).toBe(true);
    expect(Number.isInteger(rect.y)).toBe(true);
    expect(Number.isInteger(rect.w)).toBe(true);
    expect(Number.isInteger(rect.h)).toBe(true);
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.w).toBeLessThanOrEqual(4000);
    expect(rect.y + rect.h).toBeLessThanOrEqual(3000);
    // pad in *preview* pixels is ~4px/side (0.06 * 72 = 4.32); in this photo's space that is
    // 4.32/0.305 =~ 14.2px/side, so the padded width sits a bit above the unpadded 380/0.305 =~ 1245.9
    expect(rect.w).toBeGreaterThan(380 / s);
    expect(rect.w).toBeLessThan(380 / s + 40);
  });

  it('portrait 3000x4000 photo, no orientation — cover is bound by width', () => {
    // s = max(412/3000, 915/4000) = max(0.1373, 0.22875) = 0.22875
    const s = Math.max(412 / 3000, 915 / 4000);
    expect(s).toBeCloseTo(0.22875, 10);
    const offX = (412 - 3000 * s) / 2; // (412 - 686.25)/2 = -137.125
    const offY = (915 - 4000 * s) / 2; // 0
    expect(offX).toBeCloseTo(-137.125, 10);
    expect(offY).toBeCloseTo(0, 10);
    const padPx = 0.06 * guide.h;
    const ux = (guide.x - padPx - offX) / s;
    const uy = (guide.y - padPx - offY) / s;
    const uw = (guide.w + 2 * padPx) / s;
    const uh = (guide.h + 2 * padPx) / s;
    const expected = { x: Math.round(ux), y: Math.round(uy), w: Math.round(uw), h: Math.round(uh) };
    expect(expected).toEqual({ x: 651, y: 1502, w: 1699, h: 353 });

    const rect = cropRectFor(guide, preview, { w: 3000, h: 4000 });
    expect(rect).toEqual(expected);
    expect(rect.x + rect.w).toBeLessThanOrEqual(3000);
    expect(rect.y + rect.h).toBeLessThanOrEqual(4000);
  });

  it('orientation 6 (stored pixels rotated 90 CW): a 4000x3000 stored photo is upright 3000x4000', () => {
    // up = { w: photo.h, h: photo.w } = { w: 3000, h: 4000 } -- same upright size as the portrait case
    // above, so ux/uy/uw/uh are identical to that case: { 650.51..., 1502.42..., 1698.97..., 352.52... }
    const up = { w: 3000, h: 4000 };
    const s = Math.max(preview.w / up.w, preview.h / up.h);
    const offX = (preview.w - up.w * s) / 2;
    const offY = (preview.h - up.h * s) / 2;
    const padPx = 0.06 * guide.h;
    const ux = (guide.x - padPx - offX) / s;
    const uy = (guide.y - padPx - offY) / s;
    const uw = (guide.w + 2 * padPx) / s;
    const uh = (guide.h + 2 * padPx) / s;
    // Undo orientation 6: x' = up.h - (uy + uh), y' = ux, w'/h' swapped
    const x = up.h - (uy + uh);
    const y = ux;
    const w = uh;
    const h = uw;
    const expected = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
    expect(expected).toEqual({ x: 2145, y: 651, w: 353, h: 1699 });

    const rect = cropRectFor(guide, preview, { w: 4000, h: 3000 }, { orientation: 6 });
    expect(rect).toEqual(expected);
    // inside the *stored* 4000x3000 photo
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.w).toBeLessThanOrEqual(4000);
    expect(rect.y + rect.h).toBeLessThanOrEqual(3000);
  });

  it('orientation 8 (stored pixels rotated 90 CCW): a 4000x3000 stored photo is upright 3000x4000', () => {
    const up = { w: 3000, h: 4000 };
    const s = Math.max(preview.w / up.w, preview.h / up.h);
    const offX = (preview.w - up.w * s) / 2;
    const offY = (preview.h - up.h * s) / 2;
    const padPx = 0.06 * guide.h;
    const ux = (guide.x - padPx - offX) / s;
    const uy = (guide.y - padPx - offY) / s;
    const uw = (guide.w + 2 * padPx) / s;
    const uh = (guide.h + 2 * padPx) / s;
    // Undo orientation 8: x' = uy, y' = up.w - (ux + uw), w'/h' swapped
    const x = uy;
    const y = up.w - (ux + uw);
    const w = uh;
    const h = uw;
    const expected = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
    expect(expected).toEqual({ x: 1502, y: 651, w: 353, h: 1699 });

    const rect = cropRectFor(guide, preview, { w: 4000, h: 3000 }, { orientation: 8 });
    expect(rect).toEqual(expected);
    expect(rect.x + rect.w).toBeLessThanOrEqual(4000);
    expect(rect.y + rect.h).toBeLessThanOrEqual(3000);
  });

  it('orientation 3 (180 degrees): mirrors the landscape case across the photo centre', () => {
    // up = photo (no swap); x' = up.w - (ux+uw), y' = up.h - (uy+uh), size unchanged
    const up = { w: 4000, h: 3000 };
    const s = Math.max(preview.w / up.w, preview.h / up.h);
    const offX = (preview.w - up.w * s) / 2;
    const offY = (preview.h - up.h * s) / 2;
    const padPx = 0.06 * guide.h;
    const ux = (guide.x - padPx - offX) / s;
    const uy = (guide.y - padPx - offY) / s;
    const uw = (guide.w + 2 * padPx) / s;
    const uh = (guide.h + 2 * padPx) / s;
    const x = up.w - (ux + uw);
    const y = up.h - (uy + uh);
    const expected = { x: Math.round(x), y: Math.round(y), w: Math.round(uw), h: Math.round(uh) };
    expect(expected).toEqual({ x: 1363, y: 1609, w: 1274, h: 264 });

    const rect = cropRectFor(guide, preview, { w: 4000, h: 3000 }, { orientation: 3 });
    expect(rect).toEqual(expected);
    expect(rect.x + rect.w).toBeLessThanOrEqual(4000);
    expect(rect.y + rect.h).toBeLessThanOrEqual(3000);
  });

  it('clamps to the photo when the guide (padded) would otherwise spill past an edge', () => {
    // A guide flush against the top-left, and a photo barely bigger than the preview's guide band —
    // pushes uy negative before clamping (uy =~ -0.25) and the resulting rect must still land at y=0.
    const edgeGuide = { x: 2, y: 2, w: 380, h: 72 };
    const photo = { w: 420, h: 100 };
    const rect = cropRectFor(edgeGuide, preview, photo);
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.w).toBeLessThanOrEqual(photo.w);
    expect(rect.y + rect.h).toBeLessThanOrEqual(photo.h);
    expect(rect).toEqual({ x: 187, y: 0, w: 42, h: 9 });
  });

  it('accepts a custom pad fraction', () => {
    const noPad = cropRectFor(guide, preview, { w: 4000, h: 3000 }, { pad: 0 });
    const padded = cropRectFor(guide, preview, { w: 4000, h: 3000 });
    expect(noPad.w).toBeLessThan(padded.w);
    expect(noPad.h).toBeLessThan(padded.h);
  });
});
