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

// Slice 4 (VIN scanner): expo-camera, expo-image-manipulator and react-native-webview render as inert Views; the mocks expose
// hooks so a test can flip the camera permission, read the last injected script, or post a message into the OCR page.
jest.mock('expo-camera', () => {
  const React = require('react') as typeof import('react');
  const { View } = require('react-native') as typeof import('react-native');
  const state = { permission: { granted: true, status: 'granted', canAskAgain: true, expires: 'never' } };
  const request = jest.fn(async () => state.permission);
  const takePictureAsync = jest.fn(async () => ({ uri: 'file:///photo.jpg', width: 4000, height: 3000 }));
  const CameraView = React.forwardRef<Record<string, unknown>, { children?: React.ReactNode; testID?: string; onCameraReady?: () => void }>((p, ref) => {
    React.useImperativeHandle(ref, () => ({ takePictureAsync }));
    React.useEffect(() => { p.onCameraReady?.(); }, [p]);
    return React.createElement(View, { testID: p.testID ?? 'camera-view' }, p.children);
  });
  CameraView.displayName = 'CameraView';
  return {
    __esModule: true,
    CameraView,
    useCameraPermissions: () => [state.permission, request, request],
    __cameraMock: { state, request, takePictureAsync },
  };
});

jest.mock('expo-image-manipulator', () => {
  const saved = { uri: 'file:///crop.jpg', width: 1400, height: 266, base64: 'QUJD' };
  type Rec = { crop?: unknown; resize?: unknown; save?: unknown };
  type Ctx = { crop: (r: unknown) => Ctx; resize: (r: unknown) => Ctx; renderAsync: () => Promise<{ saveAsync: (o: unknown) => Promise<typeof saved> }> };
  const calls: Rec[] = [];
  const manipulate = jest.fn((_uri: string): Ctx => {
    const rec: Rec = {};
    calls.push(rec);
    const ctx: Ctx = {
      crop: jest.fn((r: unknown) => { rec.crop = r; return ctx; }),
      resize: jest.fn((r: unknown) => { rec.resize = r; return ctx; }),
      renderAsync: jest.fn(async () => ({ saveAsync: jest.fn(async (o: unknown) => { rec.save = o; return saved; }) })),
    };
    return ctx;
  });
  return { __esModule: true, ImageManipulator: { manipulate }, SaveFormat: { JPEG: 'jpeg', PNG: 'png' }, __manipulatorMock: { calls, saved } };
});

jest.mock('react-native-webview', () => {
  const React = require('react') as typeof import('react');
  const { View } = require('react-native') as typeof import('react-native');
  const hooks: { onMessage: ((e: { nativeEvent: { data: string } }) => void) | null; injected: string[] } = { onMessage: null, injected: [] };
  const WebView = React.forwardRef<Record<string, unknown>, { onMessage?: (e: { nativeEvent: { data: string } }) => void; testID?: string; onLoadEnd?: () => void }>((p, ref) => {
    hooks.onMessage = p.onMessage ?? null;
    React.useImperativeHandle(ref, () => ({ injectJavaScript: (js: string) => { hooks.injected.push(js); } }));
    React.useEffect(() => { p.onLoadEnd?.(); }, [p]);
    return React.createElement(View, { testID: p.testID ?? 'ocr-webview' });
  });
  WebView.displayName = 'WebView';
  return { __esModule: true, WebView, default: WebView, __webviewMock: { hooks, post: (m: unknown) => hooks.onMessage?.({ nativeEvent: { data: JSON.stringify(m) } }) } };
});

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
