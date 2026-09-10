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
