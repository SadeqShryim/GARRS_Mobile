# Task 2 brief — Slice 2 (Splash)

Extracted verbatim from `docs/superpowers/plans/2026-09-09-slice2-splash.md`. The spec `docs/superpowers/specs/2026-09-09-slice2-splash-design.md` is the binding authority; the source of truth for every measurement is `design_handoff_recall_hub/design/Splash.dc.html` (measured DOM in `docs/reference/splash-geometry.json`).

## Rules for this task
- Work in `C:\GarrsMobile`. **Do not run git. Do not install packages. Do not download anything.**
- Transcribe the code in this brief exactly. Deviate only when something does not compile or pass, keep the deviation minimal, and state exactly what you changed and why in the report.
- Copy strings come from `src/fixtures/splash.ts` (`COPY`); never retype a string in a component.
- Only create/modify the files listed under **Files**. Other tasks may be editing other files at the same time; if the full-tree gate fails inside a file that is not yours, say so in the report and do not touch it.
- Gate: run your own suites first (`npm test -- <pattern>`), then the full `npm test && npm run typecheck` before reporting.
- Environment: Windows 11 x64, Node 24, npm 11, Expo SDK 57, RN 0.86, Reanimated 4.5, jest-expo 57, TypeScript 6 strict; `tsconfig` types = jest + node; use `StyleSheet.absoluteFill` (there is no `absoluteFillObject`). Skia and Instrument Serif are already installed.
- Report: write `.superpowers/sdd/2026-09-09-slice2-splash/task-2-report.md` with: **Status** (DONE / DONE_WITH_CONCERNS / BLOCKED), files created/modified, the test and typecheck output summary (numbers), deviations from the brief, deferred steps, concerns.

---

### Task 2: Bake the auth blobs; verify the copied photo assets

**Files:**
- Modify: `scripts/bake-assets.mjs` (append)
- Create: `src/assets/images/blob-1.png … blob-4.png` (generated), `src/assets/__tests__/splash-assets.test.ts`
- Already present (copied verbatim by the controller, do not modify): `src/assets/images/tile-1.jpg … tile-5.jpg`, `src/assets/images/crash-hero.jpg`

**Interfaces:**
- Produces: `blob-N.png` = the design's blob `N` (box `w × h`) rendered with a 180 px bleed on every side, i.e. `(w + 360) × (h + 360)` RGBA at 1×. `Blobs.tsx` (Task 7) draws each at `(left − 180, top − 180)`.

- [ ] **Step 1: Write the failing test** `src/assets/__tests__/splash-assets.test.ts`

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const IMG = resolve(__dirname, '..', 'images');
function png(file: string) {
  const b = readFileSync(resolve(IMG, file));
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colorType: b[25] };
}

describe('splash assets', () => {
  it.each([
    ['blob-1.png', 780, 660],
    ['blob-2.png', 700, 660],
    ['blob-3.png', 660, 640],
    ['blob-4.png', 660, 600],
  ])('%s is baked at box + 2×180 bleed (%i×%i RGBA)', (f, w, h) => {
    expect(png(f)).toEqual({ w, h, colorType: 6 });
  });
  it.each(['tile-1.jpg', 'tile-2.jpg', 'tile-3.jpg', 'tile-4.jpg', 'tile-5.jpg', 'crash-hero.jpg'])('%s is the design JPEG, copied verbatim', (f) => {
    const b = readFileSync(resolve(IMG, f));
    expect(b[0]).toBe(0xff);
    expect(b[1]).toBe(0xd8);
    expect(b.length).toBeGreaterThan(10000);
  });
});
```

- [ ] **Step 2: Run** `npm test -- splash-assets` → FAIL (no blob PNGs).

- [ ] **Step 3: Append the blob bake to `scripts/bake-assets.mjs`** (after the existing glow-blob block, reusing its `blur`, `PNG`, `OUT`, `writeFileSync`)

```js
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
```

- [ ] **Step 4: Bake** — `npm run bake-assets` (re-bakes the Slice 1 assets too; takes ~30 s). Expected: four `blob-N.png` lines with the sizes in the test.

- [ ] **Step 5: Look at one** — Read `src/assets/images/blob-1.png`: a soft warm-orange oval fading to transparent, no hard edge, nothing clipped at the borders.

- [ ] **Step 6: Run** `npm test -- assets && npm run typecheck` → PASS (the Slice 1 `assets.test.ts` must still pass — the re-bake is deterministic).

- [ ] **Step 7: Checkpoint** — "chore: bake the auth blobs; ship the splash JPEGs"

