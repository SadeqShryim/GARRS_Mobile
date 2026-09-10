import { act, fireEvent, render } from '@testing-library/react-native';
import { ChatScreen } from '../ChatScreen';
import { resetAppStore, useAppStore } from '../../../store/useAppStore';

const s = () => useAppStore.getState();
beforeEach(() => { resetAppStore(); s().openScreen('chat'); jest.useFakeTimers(); });
afterEach(() => jest.useRealTimers());

describe('ChatScreen', () => {
  it('opens typing, reveals the script on the plan timers, then reads Online', () => {
    const { getByText, queryByTestId, getAllByTestId, queryByText } = render(<ChatScreen />);
    expect(getByText('Aegis Concierge')).toBeTruthy();
    expect(getByText('Typing…')).toBeTruthy();
    expect(queryByTestId('chat-typing')).toBeTruthy();
    act(() => { jest.advanceTimersByTime(1200); });
    expect(getByText(/Good afternoon, Alexander/)).toBeTruthy();
    expect(queryByTestId('chat-typing')).toBeNull();
    expect(getByText('Online · replies in minutes')).toBeTruthy();
    act(() => { jest.advanceTimersByTime(1220); });
    expect(getByText('Yes please. What does the repair actually involve?')).toBeTruthy();
    act(() => { jest.advanceTimersByTime(10000); });
    expect(getAllByTestId('bubble-them')).toHaveLength(4);
    expect(getAllByTestId('bubble-me')).toHaveLength(3);
    expect(getByText(/Booked\. You'll get a confirmation/)).toBeTruthy();
    expect(queryByText('Typing…')).toBeNull();
  });
  it('Replay restarts the script', () => {
    const { getByLabelText, queryByText, getByText } = render(<ChatScreen />);
    act(() => { jest.advanceTimersByTime(3000); });
    expect(getByText('Yes please. What does the repair actually involve?')).toBeTruthy();
    fireEvent.press(getByLabelText('Replay'));
    expect(queryByText('Yes please. What does the repair actually involve?')).toBeNull();
    expect(getByText('Typing…')).toBeTruthy();
  });
  it('sending a message appends it, shows typing, then the canned reply after 1.4 s', () => {
    const { getByTestId, getByLabelText, getByText, queryByTestId } = render(<ChatScreen />);
    act(() => { jest.advanceTimersByTime(11000); });
    fireEvent.changeText(getByTestId('chat-input'), '  Can you send the driver details now? ');
    fireEvent.press(getByLabelText('Send'));
    expect(getByText('Can you send the driver details now?')).toBeTruthy();
    expect(getByTestId('chat-input').props.value).toBe('');
    expect(queryByTestId('chat-typing')).toBeTruthy();
    act(() => { jest.advanceTimersByTime(1400); });
    expect(getByText(/Noted\. A specialist will pick this up/)).toBeTruthy();
    expect(queryByTestId('chat-typing')).toBeNull();
  });
  it('ignores an empty send; Enter submits; Close closes the screen', () => {
    const { getByTestId, getByLabelText, queryByText } = render(<ChatScreen />);
    act(() => { jest.advanceTimersByTime(11000); });
    fireEvent.press(getByLabelText('Send'));
    expect(queryByText('Noted. A specialist', { exact: false })).toBeNull();
    fireEvent.changeText(getByTestId('chat-input'), 'Thanks');
    fireEvent(getByTestId('chat-input'), 'submitEditing');
    expect(queryByText('Thanks')).toBeTruthy();
    fireEvent.press(getByLabelText('Close'));
    expect(s().screen).toBeNull();
  });
});
