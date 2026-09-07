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
