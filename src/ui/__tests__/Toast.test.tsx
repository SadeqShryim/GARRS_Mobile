import { render } from '@testing-library/react-native';
import { resetAppStore, useAppStore } from '../../store/useAppStore';
import { Toast } from '../Toast';

beforeEach(resetAppStore);

it('renders nothing until flashed, then the message with the check icon', () => {
  const { queryByTestId, getByText, getByTestId, rerender } = render(<Toast />);
  expect(queryByTestId('toast')).toBeNull();
  useAppStore.getState().flash('Service booked · Thu 10:30 AM');
  rerender(<Toast />);
  expect(getByText('Service booked · Thu 10:30 AM')).toBeTruthy();
  expect(getByTestId('icon-checkbox-circle-line')).toBeTruthy();
});
