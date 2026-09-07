import { fireEvent, render } from '@testing-library/react-native';
import { VehicleStatsScreen } from '../VehicleStatsScreen';
import { resetAppStore, useAppStore } from '../../store/useAppStore';

beforeEach(() => { resetAppStore(); jest.useFakeTimers(); });
afterEach(() => jest.useRealTimers());

describe('VehicleStatsScreen', () => {
  it('shows the Model S with its active recall, tiles and maintenance', () => {
    const { getByText } = render(<VehicleStatsScreen id={1} onBack={jest.fn()} onRecallDetails={jest.fn()} />);
    expect(getByText('Model S Plaid')).toBeTruthy();
    expect(getByText('2024 TESLA · 42,000 MI · VIN ···· F12345')).toBeTruthy();
    expect(getByText('ACTIVE SAFETY RECALL')).toBeTruthy();
    expect(getByText('Rear camera image failure')).toBeTruthy();
    expect(getByText('Fair')).toBeTruthy();
    expect(getByText('NEXT OIL CHANGE')).toBeTruthy();
    expect(getByText('LAST DONE AT 37,200 MI')).toBeTruthy();
  });
  it('shows the clear row for the Taycan', () => {
    const { getByText, queryByText } = render(<VehicleStatsScreen id={2} onBack={jest.fn()} onRecallDetails={jest.fn()} />);
    expect(getByText('No open recalls')).toBeTruthy();
    expect(getByText('CHECKED AGAINST NHTSA · 12 MIN AGO')).toBeTruthy();
    expect(queryByText('ACTIVE SAFETY RECALL')).toBeNull();
  });
  it('Schedule Repair schedules and toasts; Details calls back; back calls back', () => {
    const onBack = jest.fn(); const onDetails = jest.fn();
    const { getByLabelText } = render(<VehicleStatsScreen id={1} onBack={onBack} onRecallDetails={onDetails} />);
    fireEvent.press(getByLabelText('Schedule Repair'));
    expect(useAppStore.getState().scheduled).toBe(true);
    expect(useAppStore.getState().toast).toBe('Service booked · Thu 10:30 AM');
    fireEvent.press(getByLabelText('Back'));
    expect(onBack).toHaveBeenCalled();
  });
  it('Details is reachable while the recall is open', () => {
    const onDetails = jest.fn();
    const { getByLabelText } = render(<VehicleStatsScreen id={1} onBack={jest.fn()} onRecallDetails={onDetails} />);
    fireEvent.press(getByLabelText('Details'));
    expect(onDetails).toHaveBeenCalled();
  });
});