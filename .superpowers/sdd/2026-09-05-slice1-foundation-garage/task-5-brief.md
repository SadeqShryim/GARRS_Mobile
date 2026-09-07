### Task 5: Theme tokens and the CSS-angle gradient helper

**Files:**
- Create: `src/theme/tokens.ts`, `src/lib/gradient.ts`
- Test: `src/lib/__tests__/gradient.test.ts`

**Interfaces:**
- Produces: `color`, `font`, `ease`, `dur`, `blur`, `layout` constants and `bez(e)`; `cssAngleToPoints(deg, w, h): { start: {x,y}, end: {x,y} }` for `expo-linear-gradient`.

- [ ] **Step 1: Write the failing gradient test**

```ts
import { cssAngleToPoints } from '../gradient';

const close = (a: number, b: number) => Math.abs(a - b) < 1e-6;

describe('cssAngleToPoints', () => {
  it('180deg is top to bottom', () => {
    const { start, end } = cssAngleToPoints(180, 100, 50);
    expect(close(start.x, 0.5) && close(start.y, 0) && close(end.x, 0.5) && close(end.y, 1)).toBe(true);
  });
  it('90deg is left to right', () => {
    const { start, end } = cssAngleToPoints(90, 100, 50);
    expect(close(start.x, 0) && close(start.y, 0.5) && close(end.x, 1) && close(end.y, 0.5)).toBe(true);
  });
  it('160deg on a 132x44 box extends past the box like CSS does', () => {
    const { start, end } = cssAngleToPoints(160, 132, 44);
    expect(start.y).toBeLessThan(0);
    expect(end.y).toBeGreaterThan(1);
    expect(end.x).toBeGreaterThan(start.x);
  });
});
```

- [ ] **Step 2: Run it** — `npm test -- gradient` → FAIL (module not found).

- [ ] **Step 3: Write `src/lib/gradient.ts`**

```ts
// CSS linear-gradient angle → expo-linear-gradient start/end points.
// The gradient line runs through the centre at angle θ (0 = to top, clockwise)
// and its length is |w·sinθ| + |h·cosθ| per the CSS spec.
export function cssAngleToPoints(deg: number, w: number, h: number) {
  const t = (deg * Math.PI) / 180;
  const dx = Math.sin(t);
  const dy = -Math.cos(t);
  const len = Math.abs(w * dx) + Math.abs(h * dy);
  const cx = w / 2;
  const cy = h / 2;
  return {
    start: { x: (cx - (dx * len) / 2) / w, y: (cy - (dy * len) / 2) / h },
    end: { x: (cx + (dx * len) / 2) / w, y: (cy + (dy * len) / 2) / h },
  };
}
```

- [ ] **Step 4: Write `src/theme/tokens.ts`**

```ts
import { Easing } from 'react-native-reanimated';

export const color = {
  blue: '#0CB8E9', blueDeep: '#0F638F', blueInk: '#0B4E73',
  red: '#D0021B', amber: '#c98a1f', amberBright: '#ffb741', teal: '#01a08c',
  ink: '#17161A', ink2: '#3a3941', ink3: '#57565e', ink4: '#63626a', ink5: '#6b6a72', ink7: '#9a99a2',
  bar: '#17181A', surface: '#FFFFFF', sunken: '#F2F1EE', sunken2: '#EDECE8', input: '#F7F6F4',
  disabled: '#E7E6E3', disabledInk: '#9a99a2', handle: '#dcdbd8', shellDark: '#232228', splash: '#08080A',
  textOnDark: '#F4F3F5',
  hair: 'rgba(0,0,0,0.09)', hair08: 'rgba(0,0,0,0.08)', hair07: 'rgba(0,0,0,0.07)', hair13: 'rgba(0,0,0,0.13)',
  hair14: 'rgba(0,0,0,0.14)', tint02: 'rgba(0,0,0,0.02)', tint05: 'rgba(0,0,0,0.05)',
  scrim: 'rgba(23,22,26,0.28)',
} as const;

export const font = {
  sans300: 'Geist_300Light', sans400: 'Geist_400Regular', sans500: 'Geist_500Medium', sans600: 'Geist_600SemiBold',
  mono400: 'GeistMono_400Regular', mono500: 'GeistMono_500Medium',
} as const;

export const ease = {
  standard: [0.2, 0.8, 0.2, 1], hump: [0.2, 0.9, 0.2, 1], sheet: [0.2, 0.85, 0.2, 1],
  gauge: [0.43, 0.13, 0.23, 0.96], press: [0.4, 0, 0.2, 1], cssEaseOut: [0, 0, 0.58, 1],
} as const;
export const bez = (e: readonly [number, number, number, number]) => Easing.bezier(e[0], e[1], e[2], e[3]);

export const dur = {
  press: 150, fade: 200, dim: 250, sheet: 280, color: 300, screen: 340, health: 500, hump: 550, bar: 800,
  gauge: 1400, toast: 2200, metalIdle: 7000, metalPressed: 2333, blob: 5000, ripple: 600,
} as const;

export const blur = { face: 40, scrim: 8 } as const;   // tuned in Task 22

export const layout = { card: 318, railGap: 14, humpW: 61, humpH: 13.7, bezelBaked: 768, blobBaked: 210, blobBleed: 48 } as const;
```

- [ ] **Step 5: Run** `npm test -- gradient && npm run typecheck` → PASS, no type errors.

- [ ] **Step 6: Checkpoint** — "feat: design tokens and css-angle gradient helper"

---

