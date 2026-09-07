import { fireEvent, render } from '@testing-library/react-native';
import { RecallSheet } from '../RecallSheet';
import { resetAppStore, useAppStore } from '../../store/useAppStore';

beforeEach(() => { resetAppStore(); useAppStore.getState().openSheet('recall'); });

describe('RecallSheet', () => {
  it('shows the recall title, code line and four rows', () => {
    const { getByText } = render(<RecallSheet onDetails={jest.fn()} />);
    expect(getByText('Rear camera image failure')).toBeTruthy();
    expect(getByText('NHTSA 24V-137 · MODEL S PLAID')).toBeTruthy();
    expect(getByText('Tesla Service — 6.2 mi')).toBeTruthy();
    expect(getByText('45 minutes')).toBeTruthy();
  });
  it('Schedule Repair schedules, closes and toasts; label flips to Scheduled', () => {
    const { getByLabelText, rerender, queryByLabelText } = render(<RecallSheet onDetails={jest.fn()} />);
    fireEvent.press(getByLabelText('Schedule Repair'));
    expect(useAppStore.getState()).toMatchObject({ scheduled: true, sheet: null, toast: 'Service booked · Thu 10:30 AM' });
    useAppStore.getState().openSheet('recall');
    rerender(<RecallSheet onDetails={jest.fn()} />);
    expect(queryByLabelText('Schedule Repair')).toBeNull();
    expect(getByLabelText('Scheduled')).toBeTruthy();
  });
  it('Details closes, switches to recalls, toasts and calls back', () => {
    const onDetails = jest.fn();
    const { getByLabelText } = render(<RecallSheet onDetails={onDetails} />);
    fireEvent.press(getByLabelText('Details'));
    expect(useAppStore.getState()).toMatchObject({ sheet: null, tab: 'recalls', toast: 'NHTSA 24V-137 · opening recall detail' });
    expect(onDetails).toHaveBeenCalled();
  });
});
