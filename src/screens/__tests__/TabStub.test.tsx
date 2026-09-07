import { render } from '@testing-library/react-native';
import { TabStub } from '../TabStub';

it('renders the design stub for an unported tab', () => {
  const { getByText, getByTestId } = render(<TabStub tab="recalls" />);
  expect(getByText('Recalls')).toBeTruthy();
  expect(getByText('NOT IN THIS PROTOTYPE YET')).toBeTruthy();
  expect(getByTestId('icon-error-warning-line')).toBeTruthy();
});
