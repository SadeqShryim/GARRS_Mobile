jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));

import type React from 'react';

require('react-native-reanimated').setUpTests();

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true, loadAsync: jest.fn() }));

jest.mock('@expo/vector-icons', () => {
  const React = require('react') as typeof import('react');
  const { Text } = require('react-native') as typeof import('react-native');
  return {
    createIconSet: () => (props: { name: string; size?: number; color?: string; style?: React.ComponentProps<typeof Text>['style'] }) =>
      React.createElement(Text, { testID: `icon-${props.name}`, style: props.style }, props.name),
  };
});

jest.mock('expo-blur', () => {
  const React = require('react') as typeof import('react');
  const { View } = require('react-native') as typeof import('react-native');
  return {
    BlurView: (p: Record<string, unknown>) => React.createElement(View, p),
    BlurTargetView: React.forwardRef<React.ComponentRef<typeof View>, Record<string, unknown>>((p, ref) =>
      React.createElement(View, { ...p, ref })
    ),
  };
});

jest.mock('@react-native-masked-view/masked-view', () => {
  const React = require('react') as typeof import('react');
  const { View } = require('react-native') as typeof import('react-native');
  return {
    __esModule: true,
    default: ({ children, ...rest }: { children: React.ReactNode } & React.ComponentProps<typeof View>) =>
      React.createElement(View, rest, children),
  };
});

jest.mock('expo-linear-gradient', () => {
  const React = require('react') as typeof import('react');
  const { View } = require('react-native') as typeof import('react-native');
  return {
    LinearGradient: (p: { children?: React.ReactNode; style?: React.ComponentProps<typeof View>['style'] }) =>
      React.createElement(View, { style: p.style }, p.children),
  };
});

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
    for (const m of ['moveTo', 'lineTo', 'arcToTangent', 'close', 'addRRect', 'build', 'detach']) p[m] = jest.fn(() => p);
    return p;
  };
  const XYWHRect = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });
  const RRectXY = (rect: unknown, rx: number, ry: number) => ({ rect, rx, ry });
  const Skia = {
    Paint: () => ({ setImageFilter: jest.fn(), setAlphaf: jest.fn(), setColor: jest.fn() }),
    ImageFilter: { MakeBlur: inert, MakeColorFilter: inert },
    ColorFilter: { MakeMatrix: inert },
    Path: { Make: path },
    PathBuilder: { Make: path },
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

// Slice 3: gesture-handler's official jest setup (article swipe), expo-sensors (tilt map), expo-router hooks used by screens.
require('react-native-gesture-handler/jestSetup');

jest.mock('expo-sensors', () => ({
  DeviceMotion: {
    setUpdateInterval: jest.fn(),
    isAvailableAsync: jest.fn(async () => false),
    requestPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted' })),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

jest.mock('expo-router', () => {
  const React = require('react') as typeof import('react');
  const router = { navigate: jest.fn(), push: jest.fn(), back: jest.fn(), replace: jest.fn() };
  return {
    __esModule: true,
    router,
    useRouter: () => router,
    useIsFocused: () => true,
    useFocusEffect: (cb: () => void | (() => void)) => { React.useEffect(cb, []); },
    useLocalSearchParams: () => ({}),
    Stack: () => null,
    Tabs: () => null,
    Slot: () => null,
  };
});
