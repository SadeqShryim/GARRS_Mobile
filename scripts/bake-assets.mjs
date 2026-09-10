import { mkdirSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const OUT = 'src/assets/images';
mkdirSync(OUT, { recursive: true });

const SCALE = 2;              // output device px per logical px
const BEZEL = 768;            // logical px; MetalButton scales this to width * 2.4
const BLOB = 210;             // logical px; GlowCard scales to the card's blob size
const BLEED = 48;             // logical px of room for the blur to spill
const RAMPS = {
  default: ['#6F8EA3', '#D6EAF6', '#243642', '#A8C6D8', '#101B24', '#E8F6FF', '#3E5B6B', '#8FB2C6'],
  blue: ['#1B6E96', '#8ACEFF', '#E8F6FF', '#B8E2FF', '#0E5378', '#F4FBFF', '#4E9DC4', '#A7DAFF'],
  mix: ['#8A8A8A', '#EDEDED', '#2B2B2B', '#8ACEFF', '#141414', '#E8F6FF', '#3E5B6B', '#A6A6A6'],
};

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const lerp = (a, b, t) => a + (b - a) * t;

// conic-gradient(from 0deg, ...ramp, ramp[0]) — 0deg at 12 o'clock, clockwise.
function conic(ramp, size) {
  const stops = [...ramp, ramp[0]].map(hex);
  const segs = stops.length - 1;
  const png = new PNG({ width: size, height: size });
  const c = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let a = Math.atan2(x + 0.5 - c, -(y + 0.5 - c));     // clockwise from up
      if (a < 0) a += Math.PI * 2;
      const t = (a / (Math.PI * 2)) * segs;
      const i = Math.min(segs - 1, Math.floor(t));
      const f = t - i;
      const o = (y * size + x) * 4;
      for (let k = 0; k < 3; k++) png.data[o + k] = Math.round(lerp(stops[i][k], stops[i + 1][k], f));
      png.data[o + 3] = 255;
    }
  }
  return png;
}

// A circle of diameter d centred in a (d + 2*bleed) canvas, filled left→right with the three-stop gradient, anti-aliased edge.
function blobDisc(d, bleed) {
  const size = d + 2 * bleed;
  const png = new PNG({ width: size, height: size });
  const stops = ['#ec4899', '#ef4444', '#eab308'].map(hex);
  const r = d / 2;
  const cx = bleed + r;
  const cy = bleed + r;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const cover = Math.max(0, Math.min(1, r - dist + 0.5));
      const u = Math.max(0, Math.min(1, (x + 0.5 - bleed) / d));   // 90deg gradient across the circle's box
      const seg = u < 0.5 ? 0 : 1;
      const f = (u - seg * 0.5) / 0.5;
      const o = (y * size + x) * 4;
      for (let k = 0; k < 3; k++) png.data[o + k] = Math.round(lerp(stops[seg][k], stops[seg + 1][k], f));
      png.data[o + 3] = Math.round(cover * 255);
    }
  }
  return png;
}

// Separable Gaussian blur on premultiplied RGBA; edges are treated as transparent (like CSS filter on an element).
function blur(png, sigma) {
  const { width: w, height: h, data } = png;
  const rad = Math.ceil(sigma * 3);
  const k = [];
  let sum = 0;
  for (let i = -rad; i <= rad; i++) { const v = Math.exp(-(i * i) / (2 * sigma * sigma)); k.push(v); sum += v; }
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  const pre = new Float32Array(w * h * 4);
  for (let p = 0; p < w * h; p++) {
    const a = data[p * 4 + 3] / 255;
    pre[p * 4] = data[p * 4] * a; pre[p * 4 + 1] = data[p * 4 + 1] * a; pre[p * 4 + 2] = data[p * 4 + 2] * a; pre[p * 4 + 3] = a;
  }
  const tmp = new Float32Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let i = -rad; i <= rad; i++) {
      const xx = x + i; if (xx < 0 || xx >= w) continue;
      const s = (y * w + xx) * 4, kv = k[i + rad];
      r += pre[s] * kv; g += pre[s + 1] * kv; b += pre[s + 2] * kv; a += pre[s + 3] * kv;
    }
    const d = (y * w + x) * 4; tmp[d] = r; tmp[d + 1] = g; tmp[d + 2] = b; tmp[d + 3] = a;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let i = -rad; i <= rad; i++) {
      const yy = y + i; if (yy < 0 || yy >= h) continue;
      const s = (yy * w + x) * 4, kv = k[i + rad];
      r += tmp[s] * kv; g += tmp[s + 1] * kv; b += tmp[s + 2] * kv; a += tmp[s + 3] * kv;
    }
    const d = (y * w + x) * 4;
    data[d] = a > 0 ? Math.round(r / a) : 0; data[d + 1] = a > 0 ? Math.round(g / a) : 0; data[d + 2] = a > 0 ? Math.round(b / a) : 0;
    data[d + 3] = Math.round(Math.min(1, a) * 255);
  }
}

for (const [tint, ramp] of Object.entries(RAMPS)) {
  const png = conic(ramp, BEZEL * SCALE);
  blur(png, 1.5 * SCALE);
  writeFileSync(`${OUT}/metal-${tint}.png`, PNG.sync.write(png));
  console.log(`metal-${tint}.png ${png.width}x${png.height}`);
}
const disc = blobDisc(BLOB * SCALE, BLEED * SCALE);
blur(disc, 16 * SCALE);
writeFileSync(`${OUT}/glow-blob.png`, PNG.sync.write(disc));
console.log(`glow-blob.png ${disc.width}x${disc.height}`);

// --- Slice 2: auth blobs (Splash.dc.html, the blobOp layer) ---
// Each blob is a w×h box filled with radial-gradient(circle, rgba(c,a0) 0%, rgba(c,0) 70%) — `circle` = farthest-corner
// radius — clipped to an ellipse (border-radius: 50%), then filter: blur(sigma). Baked at 1× with a 180 px bleed (≥ 3σ).
const BLOB_BLEED = 180;
const AUTH_BLOBS = [
  { name: 'blob-1', w: 420, h: 300, sigma: 58, rgb: [201, 138, 58], a0: 0.85 },
  { name: 'blob-2', w: 340, h: 300, sigma: 54, rgb: [109, 74, 224], a0: 0.8 },
  { name: 'blob-3', w: 300, h: 280, sigma: 60, rgb: [142, 27, 42], a0: 0.8 },
  { name: 'blob-4', w: 300, h: 240, sigma: 56, rgb: [27, 110, 150], a0: 0.75 },
];
function authBlob({ w, h, rgb, a0 }) {
  const W = w + 2 * BLOB_BLEED;
  const H = h + 2 * BLOB_BLEED;
  const png = new PNG({ width: W, height: H });
  const cx = W / 2, cy = H / 2, rx = w / 2, ry = h / 2;
  const R = Math.hypot(rx, ry) * 0.7;                      // the gradient reaches 0 at 70% of the farthest-corner radius
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const e = Math.hypot(dx / rx, dy / ry);               // 1 on the ellipse edge
      const cover = Math.max(0, Math.min(1, (1 - e) * Math.min(rx, ry) + 0.5));   // ~1 px anti-aliased ellipse edge
      const d = Math.hypot(dx, dy);
      const a = d < R ? a0 * (1 - d / R) : 0;
      const o = (y * W + x) * 4;
      png.data[o] = rgb[0]; png.data[o + 1] = rgb[1]; png.data[o + 2] = rgb[2];
      png.data[o + 3] = Math.round(a * cover * 255);
    }
  }
  return png;
}
for (const b of AUTH_BLOBS) {
  const png = authBlob(b);
  blur(png, b.sigma);
  writeFileSync(`${OUT}/${b.name}.png`, PNG.sync.write(png));
  console.log(`${b.name}.png ${png.width}x${png.height}`);
}
