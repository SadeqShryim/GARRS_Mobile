import { fireEvent, render } from '@testing-library/react-native';
import { SplashStub } from '../SplashStub';

it('shows the mark and calls onDone on tap', () => {
  const onDone = jest.fn();
  const { getByText, getByLabelText } = render(<SplashStub onDone={onDone} />);
  expect(getByText('RECALL HUB')).toBeTruthy();
  expect(getByText('TAP ANYWHERE TO CONTINUE')).toBeTruthy();
  fireEvent.press(getByLabelText('Continue'));
  expect(onDone).toHaveBeenCalledTimes(1);
});
