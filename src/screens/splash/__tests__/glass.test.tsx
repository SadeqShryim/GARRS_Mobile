import { fireEvent, render } from '@testing-library/react-native';
import { processColor, Text } from 'react-native';
import { GlassField } from '../GlassField';
import { GlassPill } from '../GlassPill';
import { GoogleMark } from '../GoogleMark';
import { ReplayPill } from '../ReplayPill';

describe('GlassPill', () => {
  it('shows the label with its icon and presses', () => {
    const onPress = jest.fn();
    const { getByText, getByLabelText } = render(<GlassPill label="Google" icon={<Text>G</Text>} onPress={onPress} />);
    expect(getByText('G')).toBeTruthy();
    fireEvent.press(getByLabelText('Google'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('GlassField', () => {
  const base = { leading: <Text>icon</Text>, paddingLeft: 16 as const, placeholder: 'Email', onChangeText: jest.fn(), value: '', onSubmit: jest.fn(), arrowLabel: 'Continue' as const };
  it('hides the arrow until told, submits from the arrow and from the keyboard', () => {
    const onSubmit = jest.fn();
    const { queryByLabelText, getByLabelText, getByPlaceholderText, rerender } = render(<GlassField {...base} onSubmit={onSubmit} arrow={false} />);
    expect(queryByLabelText('Continue')).toBeNull();
    fireEvent(getByPlaceholderText('Email'), 'submitEditing');
    expect(onSubmit).toHaveBeenCalledTimes(1);
    rerender(<GlassField {...base} onSubmit={onSubmit} arrow />);
    fireEvent.press(getByLabelText('Continue'));
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });
  it('is a secure, non-capitalising input when asked', () => {
    const { getByPlaceholderText } = render(<GlassField {...base} placeholder="Password" secure arrow={false} />);
    const input = getByPlaceholderText('Password');
    expect(input.props.secureTextEntry).toBe(true);
    expect(input.props.autoCapitalize).toBe('none');
    expect(input.props.placeholderTextColor).toBe('rgba(255,255,255,0.45)');
  });
  it('uses the email keyboard for the email field', () => {
    const { getByPlaceholderText } = render(<GlassField {...base} email arrow={false} />);
    expect(getByPlaceholderText('Email').props.keyboardType).toBe('email-address');
  });
});

it('GoogleMark renders the four-colour G', () => {
  const { toJSON } = render(<GoogleMark />);
  // react-native-svg runs fill colours through RN's processColor before they reach the native tree,
  // so the literal hex string never appears in toJSON() — assert on the processed payload instead.
  expect(JSON.stringify(toJSON())).toContain(String(processColor('#4285F4')));
});

it('ReplayPill shows REPLAY with the restart icon and presses', () => {
  const onPress = jest.fn();
  const { getByText, getByTestId } = render(<ReplayPill onPress={onPress} />);
  expect(getByTestId('icon-restart-line')).toBeTruthy();
  fireEvent.press(getByText('REPLAY'));
  expect(onPress).toHaveBeenCalledTimes(1);
});
