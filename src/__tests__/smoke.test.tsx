import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

function Fader() {
  const v = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ opacity: v.value }));
  return <Animated.View testID="fader" style={style} />;
}

describe('toolchain', () => {
  it('renders plain text', () => {
    const { getByText } = render(<Text>hello</Text>);
    expect(getByText('hello')).toBeTruthy();
  });
  it('renders a reanimated view', () => {
    const { getByTestId } = render(<Fader />);
    expect(getByTestId('fader')).toBeTruthy();
  });
});
