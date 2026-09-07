### Task 4: Bake effect assets and build the Remixicon glyph map

**Files:**
- Create: `scripts/bake-assets.mjs`, `scripts/build-remix-glyphmap.mjs`
- Create (generated): `src/assets/images/{metal-blue,metal-mix,metal-default,glow-blob}.png`, `src/assets/remixicon.glyphmap.json`, `src/assets/fonts/remixicon.ttf`
- Test: `src/assets/__tests__/assets.test.ts`

**Interfaces:**
- Produces: `metal-*.png` — 1536 × 1536 RGBA: the 8-stop conic ramp (`from 0deg`, clockwise from 12 o'clock, ending on the first colour) with a Gaussian blur of σ = 1.5 logical px baked in, rendered at 768 logical px × 2. `glow-blob.png` — 612 × 612 RGBA: a 210 px circle filled with `linear-gradient(90deg,#ec4899,#ef4444,#eab308)`, blurred σ = 16 logical px, with a 48 px bleed on every side, × 2. Constants consumers use: bezel logical 768, blob baked 210, bleed 48 (`layout.*` in tokens). `remixicon.glyphmap.json` — `{ [name]: codePoint }` keyed WITHOUT the `ri-` prefix. Rasterised in pure Node with `pngjs` — no browser. CSS `filter: blur(r)` is a Gaussian with standard deviation `r`, so σ below equals the CSS radius.

- [ ] **Step 1: Write `scripts/build-remix-glyphmap.mjs`**

```js
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';

const src = JSON.parse(readFileSync('node_modules/remixicon/fonts/remixicon.glyph.json', 'utf8'));
const map = {};
for (const [name, v] of Object.entries(src)) {
  const m = /&#x([0-9A-Fa-f]+);/.exec(v.unicode);
  if (m) map[name] = parseInt(m[1], 16);
}
mkdirSync('src/assets/fonts', { recursive: true });
writeFileSync('src/assets/remixicon.glyphmap.json', JSON.stringify(map));
copyFileSync('node_modules/remixicon/fonts/remixicon.ttf', 'src/assets/fonts/remixicon.ttf');
console.log(`wrote ${Object.keys(map).length} glyphs`);
```

- [ ] **Step 2: Write `scripts/bake-assets.mjs`**

```js
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
```

Note the bezel is opaque and gets clipped to a 2 px rim at runtime, so treating its outer edge as transparent during the blur only darkens the outermost 1–2 device pixels, which never show.

- [ ] **Step 3: Write the test** `src/assets/__tests__/assets.test.ts`

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import glyphs from '../remixicon.glyphmap.json';

const USED_ICONS = [
  'menu-2-line', 'notification-3-line', 'sparkling-2-line', 'more-fill', 'close-circle-fill', 'checkbox-circle-fill',
  'shield-check-line', 'arrow-right-up-line', 'error-warning-line', 'arrow-right-s-line', 'arrow-left-line',
  'alarm-warning-fill', 'calendar-2-line', 'shield-check-fill', 'pulse-line', 'dashboard-3-line', 'oil-line',
  'loader-2-line', 'battery-charge-line', 'information-line', 'file-list-3-line', 'camera-line', 'close-line',
  'window-line', 'car-line', 'file-text-line', 'settings-3-line', 'keyboard-line', 'checkbox-circle-line',
  'inbox-fill', 'inbox-line', 'error-warning-fill', 'tools-fill', 'tools-line', 'book-2-fill', 'book-2-line',
  'user-fill', 'user-line', 'restart-line',
];

function png(file: string) {
  const b = readFileSync(resolve(__dirname, '..', 'images', file));
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colorType: b[25] };
}

describe('remixicon glyph map', () => {
  it('maps names without the ri- prefix to code points', () => {
    expect(typeof (glyphs as Record<string, number>)['menu-2-line']).toBe('number');
    expect((glyphs as Record<string, number>)['ri-menu-2-line']).toBeUndefined();
  });
  it.each(USED_ICONS)('has %s', (name) => {
    expect((glyphs as Record<string, number>)[name]).toBeGreaterThan(0);
  });
});

describe('baked assets', () => {
  it.each(['metal-blue.png', 'metal-mix.png', 'metal-default.png'])('%s is 1536x1536 RGBA', (f) => {
    expect(png(f)).toEqual({ w: 1536, h: 1536, colorType: 6 });
  });
  it('glow-blob.png is 612x612 RGBA', () => {
    expect(png('glow-blob.png')).toEqual({ w: 612, h: 612, colorType: 6 });
  });
});
```

- [ ] **Step 4: Run the test to see it fail**

Run: `npm test -- src/assets`
Expected: FAIL — cannot find `../remixicon.glyphmap.json`.

- [ ] **Step 5: Generate everything**

Run: `npm run build-glyphmap && npm run bake-assets`
Expected: "wrote 3020 glyphs", then four lines ending in `1536x1536` ×3 and `612x612`. Baking takes a few seconds.

- [ ] **Step 6: Run the test to see it pass, then look at the PNGs**

Run: `npm test -- src/assets` → all pass. Open `src/assets/images/metal-blue.png` and `glow-blob.png` with the Read tool: the bezel is a chrome colour wheel starting with deep blue at 12 o'clock sweeping clockwise through light blue, near-white, blue, deep blue, white, mid-blue, light blue and back; the blob is a soft pink→red→amber disc fading to transparent well inside the canvas edge.

- [ ] **Step 7: Checkpoint** — "feat: bake metal bezels and glow blob in pure node; build remixicon glyph map"

---

