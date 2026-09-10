# Task 1 brief — Slice 2 (Splash)

Extracted verbatim from `docs/superpowers/plans/2026-09-09-slice2-splash.md`. The spec `docs/superpowers/specs/2026-09-09-slice2-splash-design.md` is the binding authority; the source of truth for every measurement is `design_handoff_recall_hub/design/Splash.dc.html` (measured DOM in `docs/reference/splash-geometry.json`).

## Rules for this task
- Work in `C:\GarrsMobile`. **Do not run git. Do not install packages. Do not download anything.**
- Transcribe the code in this brief exactly. Deviate only when something does not compile or pass, keep the deviation minimal, and state exactly what you changed and why in the report.
- Copy strings come from `src/fixtures/splash.ts` (`COPY`); never retype a string in a component.
- Only create/modify the files listed under **Files**. Other tasks may be editing other files at the same time; if the full-tree gate fails inside a file that is not yours, say so in the report and do not touch it.
- Gate: run your own suites first (`npm test -- <pattern>`), then the full `npm test && npm run typecheck` before reporting.
- Environment: Windows 11 x64, Node 24, npm 11, Expo SDK 57, RN 0.86, Reanimated 4.5, jest-expo 57, TypeScript 6 strict; `tsconfig` types = jest + node; use `StyleSheet.absoluteFill` (there is no `absoluteFillObject`). Skia and Instrument Serif are already installed.
- Report: write `.superpowers/sdd/2026-09-09-slice2-splash/task-1-report.md` with: **Status** (DONE / DONE_WITH_CONCERNS / BLOCKED), files created/modified, the test and typecheck output summary (numbers), deviations from the brief, deferred steps, concerns.

---

### Task 1: Skia jest mock, Instrument Serif, splash tokens

**Files:**
- Modify: `jest.setup.ts` (append), `src/theme/tokens.ts` (replace three objects), `src/ui/Txt.tsx` (add `Serif`), `app/_layout.tsx` (load the font)
- Create: `src/__tests__/skia-mock.test.tsx`, `src/ui/__tests__/Serif.test.tsx`

**Interfaces:**
- Produces: a jest environment where `@shopify/react-native-skia` renders as `View`s (default `testID` = `skia-<ComponentName>`), `useImage`/`useFont` return `null`, and `Skia.Paint/ImageFilter/ColorFilter/Path/XYWHRect/RRectXY` return inert objects; `Serif` text component; `color.tileA/tileB/tilePhoto/markInk/authBlueInk/authError/warning`; `font.serif400`; `ease.css/inOut/bubble`. Every later task relies on these names.

- [ ] **Step 1: Write the failing tests**

`src/ui/__tests__/Serif.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';
import { Serif } from '../Txt';

it('Serif uses Instrument Serif for every weight and disables font scaling', () => {
  const { getByText } = render(<Serif size={52} lh={52} ls={-1} weight={600} color="#FFFFFF">One last step</Serif>);
  const el = getByText('One last step');
  expect(el.props.allowFontScaling).toBe(false);
  expect(el.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ fontFamily: 'InstrumentSerif_400Regular', fontSize: 52, lineHeight: 52, letterSpacing: -1, color: '#FFFFFF' })]));
});
```

`src/__tests__/skia-mock.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';
import { Canvas, Group, Image as SkImage, Skia, TileMode, useFont, useImage } from '@shopify/react-native-skia';

function Probe() {
  const img = useImage(1);
  const font = useFont(1, 40);
  return (
    <Canvas testID="canvas" style={{ width: 10, height: 10 }}>
      <Group>
        <SkImage image={img} x={0} y={0} width={1} height={1} fit="cover" />
      </Group>
      {font ? null : null}
    </Canvas>
  );
}

it('renders Skia components through the jest mock and exposes inert factories', () => {
  const { getByTestId } = render(<Probe />);
  expect(getByTestId('canvas')).toBeTruthy();
  expect(getByTestId('skia-Group')).toBeTruthy();
  expect(Skia.RRectXY(Skia.XYWHRect(0, 0, 1, 1), 2, 2)).toEqual({ rect: { x: 0, y: 0, width: 1, height: 1 }, rx: 2, ry: 2 });
  expect(TileMode.Decal).toBe(3);
  const p = Skia.Paint();
  p.setAlphaf(0.5);
  expect(Skia.ImageFilter.MakeBlur(1, 1, TileMode.Clamp, null)).toEqual({});
  const path = Skia.Path.Make();
  path.moveTo(1, 2);
  expect(path.moveTo).toHaveBeenCalledWith(1, 2);
});
```

- [ ] **Step 2: Run** `npm test -- Serif skia-mock` → FAIL (no `Serif`; Skia not mocked / native module missing).

- [ ] **Step 3: Append the Skia mock to `jest.setup.ts`**

```ts
// Slice 2: @shopify/react-native-skia — components render as Views (testID `skia-<Name>` unless given), hooks return null,
// Skia.* factories return inert objects so derived values can run in JS. Nothing here draws.
jest.mock('@shopify/react-native-skia', () => {
  const React = require('react') as typeof import('react');
  const { View } = require('react-native') as typeof import('react-native');
  const node = (name: string) => {
    const C = ({ children, testID }: { children?: React.ReactNode; testID?: string }) => React.createElement(View, { testID: testID ?? `skia-${name}` }, children);
    C.displayName = name;
    return C;
  };
  const inert = () => ({});
  const path = () => {
    const p: Record<string, jest.Mock> = {};
    for (const m of ['moveTo', 'lineTo', 'arcToTangent', 'close', 'addRRect']) p[m] = jest.fn(() => p);
    return p;
  };
  const XYWHRect = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });
  const RRectXY = (rect: unknown, rx: number, ry: number) => ({ rect, rx, ry });
  const Skia = {
    Paint: () => ({ setImageFilter: jest.fn(), setAlphaf: jest.fn(), setColor: jest.fn() }),
    ImageFilter: { MakeBlur: inert, MakeColorFilter: inert },
    ColorFilter: { MakeMatrix: inert },
    Path: { Make: path },
    XYWHRect,
    RRectXY,
    Point: (x: number, y: number) => ({ x, y }),
  };
  const named: Record<string, unknown> = {
    __esModule: true,
    Skia,
    TileMode: { Clamp: 0, Repeat: 1, Mirror: 2, Decal: 3 },
    useImage: () => null,
    useFont: () => null,
    useTypeface: () => null,
    useCanvasRef: () => ({ current: null }),
    vec: (x = 0, y = 0) => ({ x, y }),
    rect: XYWHRect,
    rrect: RRectXY,
  };
  return new Proxy(named, { get: (t, key) => (key in t ? t[key as string] : typeof key === 'string' ? node(key) : undefined) });
});
```

- [ ] **Step 4: Replace the `color`, `font` and `ease` objects in `src/theme/tokens.ts`** (keep `bez`, `dur`, `blur`, `layout` as they are)

```ts
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
  // Slice 2 — Splash.dc.html
  tileA: '#111116', tileB: '#0C0C10', tilePhoto: '#0E0E12', markInk: '#08222E', authBlueInk: '#04222C', authError: '#FF8A94', warning: '#E8A317',
} as const;

export const font = {
  sans300: 'Geist_300Light', sans400: 'Geist_400Regular', sans500: 'Geist_500Medium', sans600: 'Geist_600SemiBold',
  mono400: 'GeistMono_400Regular', mono500: 'GeistMono_500Medium',
  serif400: 'InstrumentSerif_400Regular',
} as const;

export const ease = {
  standard: [0.2, 0.8, 0.2, 1], hump: [0.2, 0.9, 0.2, 1], sheet: [0.2, 0.85, 0.2, 1],
  gauge: [0.43, 0.13, 0.23, 0.96], press: [0.4, 0, 0.2, 1], cssEaseOut: [0, 0, 0.58, 1],
  // Slice 2 — CSS `ease`, `ease-in-out`, and the bubble pop's cubic-bezier(.2,.9,.25,1)
  css: [0.25, 0.1, 0.25, 1], inOut: [0.42, 0, 0.58, 1], bubble: [0.2, 0.9, 0.25, 1],
} as const;
```

- [ ] **Step 5: Add `Serif` to `src/ui/Txt.tsx`** (whole file)

```tsx
import { Text, type TextProps } from 'react-native';
import { color as C, font } from '../theme/tokens';

export type TxtProps = TextProps & { size: number; lh?: number; ls?: number; color?: string; weight?: 300 | 400 | 500 | 600; center?: boolean };
type Faces = Record<300 | 400 | 500 | 600, string>;
const SANS: Faces = { 300: font.sans300, 400: font.sans400, 500: font.sans500, 600: font.sans600 };
const MONO: Faces = { 300: font.mono400, 400: font.mono400, 500: font.mono500, 600: font.mono500 };
const SERIF: Faces = { 300: font.serif400, 400: font.serif400, 500: font.serif400, 600: font.serif400 };

function make(faces: Faces) {
  return function Txt({ size, lh, ls, color = C.ink, weight = 400, center, style, ...rest }: TxtProps) {
    return (
      <Text
        allowFontScaling={false}
        {...rest}
        style={[{ fontFamily: faces[weight], fontSize: size, lineHeight: lh, letterSpacing: ls, color, includeFontPadding: false, textAlign: center ? 'center' : undefined }, style]}
      />
    );
  };
}
export const Sans = make(SANS);
export const Mono = make(MONO);
export const Serif = make(SERIF);
```

- [ ] **Step 6: Load Instrument Serif in `app/_layout.tsx`**

Add the import `import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';` and add `InstrumentSerif_400Regular,` to the `useFonts({ … })` object (after `GeistMono_500Medium`). Nothing else changes.

- [ ] **Step 7: Run** `npm test && npm run typecheck` → all PASS (the two new suites plus the Slice 1 suites).

- [ ] **Step 8: Checkpoint** — "chore: skia jest mock, Instrument Serif, splash tokens"

