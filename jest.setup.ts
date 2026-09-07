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
