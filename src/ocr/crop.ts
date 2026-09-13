// src/ocr/crop.ts
// Spec §8 — pure geometry for the VIN scanner's capture guide and the crop-rect mapping from preview
// space to photo-pixel space. No React, no I/O; every input/output is device-independent numbers.

export type Rect = { x: number; y: number; w: number; h: number };
export type Size = { w: number; h: number };

// §8: guide width is the preview width minus a 16pt gutter on each side; height keeps a ~5.3:1 line
// aspect (a 17-char VIN reads as a wide, short band — width * 0.19). The guide is horizontally centred
// (x = 16) and its centre sits at 42% of the preview height (a touch above true centre, clear of a thumb
// gripping the phone to tap Capture). Rounding: height rounds first (Math.round(w * 0.19)), then y is
// the rounded centre minus half of that already-rounded height — e.g. guideRect({ w: 412, h: 915 }) =>
// { x: 16, y: 348, w: 380, h: 72 } exactly (0.42 * 915 - 72 / 2 = 384.3 - 36 = 348.3 -> 348).
export function guideRect(preview: Size): Rect {
  const w = preview.w - 32;
  const h = Math.round(w * 0.19);
  const x = 16;
  const y = Math.round(0.42 * preview.h - h / 2);
  return { x, y, w, h };
}

// EXIF `Orientation`: 1 upright (also the default when the tag is missing), 6 = stored pixels rotated
// 90° clockwise relative to upright, 8 = 90° counter-clockwise, 3 = 180°. iOS 57.0.3+ leaves this in
// EXIF instead of baking the rotation into the pixels (§8); Android bakes it, so `exif` is absent/1 there.
export function orientationOf(exif?: { Orientation?: number } | null): number {
  return exif?.Orientation ?? 1;
}

// §8: the camera preview shows the photo "cover"-fitted (scaled up to fill the preview, centred, overflow
// clipped past the edges) — the same fit as CSS `object-fit: cover`. `up` is the *upright* size the photo
// actually looks like on screen: equal to `photo` for orientation 1/3, swapped for 6/8 (the stored pixel
// grid is rotated a quarter turn relative to upright, so its width/height are swapped from upright's).
//
// Derivation (cover-fit, worked in upright-photo space):
//   s     = max(preview.w / up.w, preview.h / up.h)      -- the scale that makes the photo cover the preview
//   offX  = (preview.w - up.w * s) / 2                    -- left/top edge of the (scaled) upright photo
//   offY  = (preview.h - up.h * s) / 2                       in preview coords; negative where it overflows
//
//   The guide rect is in preview coords; pad it by `pad` * guide.h on every side first (default 0.06,
//   spec §8, so descenders and the frame edge survive the crop), then invert the cover-fit to land in
//   upright-photo coords:
//   ux = (gx - offX) / s,  uy = (gy - offY) / s,  uw = gw / s,  uh = gh / s
//
// Finally undo the orientation to land in the *stored*-pixel space `photo` actually holds — one 90°
// rotation matrix per EXIF value (1 is the identity, left as ux/uy/uw/uh unchanged):
//   6: x' = up.h - (uy + uh),  y' = ux,               w'/h' swapped  (stored = upright rotated 90° CW)
//   8: x' = uy,                y' = up.w - (ux + uw),  w'/h' swapped  (stored = upright rotated 90° CCW)
//   3: x' = up.w - (ux + uw),  y' = up.h - (uy + uh),  w'/h' unchanged (stored = upright rotated 180°)
export function cropRectFor(guide: Rect, preview: Size, photo: Size, opts?: { pad?: number; orientation?: number }): Rect {
  const orientation = opts?.orientation ?? 1;
  const pad = opts?.pad ?? 0.06;
  const swapped = orientation === 6 || orientation === 8;
  const up: Size = swapped ? { w: photo.h, h: photo.w } : photo;

  const padPx = pad * guide.h;
  const gx = guide.x - padPx;
  const gy = guide.y - padPx;
  const gw = guide.w + 2 * padPx;
  const gh = guide.h + 2 * padPx;

  const s = Math.max(preview.w / up.w, preview.h / up.h);
  const offX = (preview.w - up.w * s) / 2;
  const offY = (preview.h - up.h * s) / 2;

  const ux = (gx - offX) / s;
  const uy = (gy - offY) / s;
  const uw = gw / s;
  const uh = gh / s;

  let x: number, y: number, w: number, h: number;
  if (orientation === 6) {
    x = up.h - (uy + uh);
    y = ux;
    w = uh;
    h = uw;
  } else if (orientation === 8) {
    x = uy;
    y = up.w - (ux + uw);
    w = uh;
    h = uw;
  } else if (orientation === 3) {
    x = up.w - (ux + uw);
    y = up.h - (uy + uh);
    w = uw;
    h = uh;
  } else {
    x = ux;
    y = uy;
    w = uw;
    h = uh;
  }

  return clampToPhoto(x, y, w, h, photo);
}

// Clamp the float rect into `photo`'s bounds first (so the visible region can only shrink, never spill
// past an edge), then round each field — and re-clamp width/height against the already-rounded origin,
// so the returned rect is always fully inside the (integer-sized) photo even after rounding.
function clampToPhoto(x: number, y: number, w: number, h: number, photo: Size): Rect {
  const x0 = Math.max(0, Math.min(x, photo.w));
  const y0 = Math.max(0, Math.min(y, photo.h));
  const x1 = Math.max(x0, Math.min(x + w, photo.w));
  const y1 = Math.max(y0, Math.min(y + h, photo.h));
  const rx = Math.round(x0);
  const ry = Math.round(y0);
  const rw = Math.max(0, Math.min(Math.round(x1 - x0), photo.w - rx));
  const rh = Math.max(0, Math.min(Math.round(y1 - y0), photo.h - ry));
  return { x: rx, y: ry, w: rw, h: rh };
}
