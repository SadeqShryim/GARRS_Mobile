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
