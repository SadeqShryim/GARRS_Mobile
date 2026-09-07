import { render } from '@testing-library/react-native';
import { DotPattern } from '../DotPattern';

it('renders the dot pattern without crashing', () => {
  const { getByTestId } = render(<DotPattern />);
  expect(getByTestId('dot-pattern')).toBeTruthy();
});
