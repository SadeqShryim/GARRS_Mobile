import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Sheet } from '../Sheet';

it('shows title, sub, action, children and closes on scrim tap', () => {
  const onClose = jest.fn();
  const { getByText, getByLabelText } = render(
    <Sheet title="Add a vehicle" sub="ENTER VIN · 17 CHARACTERS" action={<Text>act</Text>} onClose={onClose}><Text>body</Text></Sheet>,
  );
  expect(getByText('Add a vehicle')).toBeTruthy();
  expect(getByText('ENTER VIN · 17 CHARACTERS')).toBeTruthy();
  expect(getByText('act')).toBeTruthy();
  expect(getByText('body')).toBeTruthy();
  fireEvent.press(getByLabelText('Close sheet'));
  expect(onClose).toHaveBeenCalled();
});
