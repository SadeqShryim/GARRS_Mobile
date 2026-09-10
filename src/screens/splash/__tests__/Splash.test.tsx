jest.mock('../useMarqueeDrive');

import { act, fireEvent, render } from '@testing-library/react-native';
import { Splash } from '../Splash';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('runs the source timeline: mark → bubble at 3.5 s → auth at 7.1 s; REPLAY restarts it', () => {
  const onDone = jest.fn();
  const { getByText, queryByText, getByTestId } = render(<Splash onDone={onDone} />);
  expect(getByTestId('stage')).toBeTruthy();
  expect(getByText('RECALL HUB')).toBeTruthy();
  expect(getByText('REPLAY')).toBeTruthy();
  expect(queryByText(/Did you f\*cking[ \u00A0]check\?/)).toBeNull();
  expect(getByTestId('auth').props.pointerEvents).toBe('none');
  act(() => { jest.advanceTimersByTime(3500); });
  expect(getByText(/Did you f\*cking[ \u00A0]check\?/)).toBeTruthy();
  expect(getByTestId('skia-BackdropFilter')).toBeTruthy();
  act(() => { jest.advanceTimersByTime(3600); });
  expect(queryByText(/Did you f\*cking[ \u00A0]check\?/)).toBeNull();
  expect(getByTestId('auth').props.pointerEvents).toBe('auto');
  fireEvent.press(getByText('Google'));
  expect(onDone).toHaveBeenCalledTimes(1);
  fireEvent.press(getByText('REPLAY'));
  expect(getByTestId('auth').props.pointerEvents).toBe('none');
  act(() => { jest.advanceTimersByTime(3500); });
  expect(getByText(/Did you f\*cking[ \u00A0]check\?/)).toBeTruthy();
});
