import { fireEvent, render } from '@testing-library/react-native';
import { MetalButton } from '../MetalButton';

describe('MetalButton', () => {
  it('renders the label and icon and fires onPress', () => {
    const onPress = jest.fn();
    const { getByText, getByTestId, getByLabelText } = render(<MetalButton label="Add Vehicle" icon="sparkling-2-line" onPress={onPress} />);
    expect(getByText('Add Vehicle')).toBeTruthy();
    expect(getByTestId('icon-sparkling-2-line')).toBeTruthy();
    fireEvent.press(getByLabelText('Add Vehicle'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  it('uses the blue ink on the blue tint and grey ink otherwise', () => {
    const blue = render(<MetalButton tint="blue" label="A" icon="calendar-2-line" />);
    expect(blue.getByText('A').props.style).toEqual(expect.arrayContaining([expect.objectContaining({ color: '#EAF7FF' })]));
    const mix = render(<MetalButton tint="mix" label="B" icon="calendar-2-line" />);
    expect(mix.getByText('B').props.style).toEqual(expect.arrayContaining([expect.objectContaining({ color: '#8A8F94' })]));
  });
});
