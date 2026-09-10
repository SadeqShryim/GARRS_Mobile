import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { RecallDetailScreen } from '../RecallDetailScreen';
import { RecallsScreen } from '../RecallsScreen';
import { resetAppStore, useAppStore } from '../../../store/useAppStore';

const s = () => useAppStore.getState();
beforeEach(() => { resetAppStore(); jest.clearAllMocks(); });

describe('RecallsScreen', () => {
  it('renders the title, headline, hero, filters and the open recall card', () => {
    const { getByText, getByLabelText } = render(<RecallsScreen />);
    expect(getByText('Recalls')).toBeTruthy();
    expect(getByText('1 OPEN RECALL · 3 VEHICLES MONITORED')).toBeTruthy();
    expect(getByText('1 needs action')).toBeTruthy();
    expect(getByText('A free remedy is available. Booking it clears the flag on your vehicle health score.')).toBeTruthy();
    expect(getByText('1 OPEN')).toBeTruthy();
    expect(getByText('3 RESOLVED')).toBeTruthy();
    expect(getByLabelText('OPEN').props.accessibilityState).toEqual({ selected: true });
    expect(getByText('ACTION REQUIRED')).toBeTruthy();
    expect(getByText('NHTSA 24V-137')).toBeTruthy();
    expect(getByText('Model S Plaid · Reported 12 Feb 2026')).toBeTruthy();
    expect(getByLabelText('Schedule Repair')).toBeTruthy();
    expect(getByLabelText('Add Vehicle')).toBeTruthy();
  });
  it('tapping the card expands its rows; tapping again collapses', () => {
    const { getByTestId, queryByTestId, getByText } = render(<RecallsScreen />);
    expect(queryByTestId('recall-rows-v1')).toBeNull();
    fireEvent.press(getByTestId('recall-v1'));
    expect(getByTestId('recall-rows-v1')).toBeTruthy();
    expect(getByText('Tesla Service — 6.2 mi')).toBeTruthy();
    fireEvent.press(getByTestId('recall-v1'));
    expect(queryByTestId('recall-rows-v1')).toBeNull();
  });
  it('filters: scheduled is empty at first; resolved lists the three history rows', () => {
    const { getByLabelText, getByText, queryByText } = render(<RecallsScreen />);
    fireEvent.press(getByLabelText('SCHEDULED'));
    expect(getByText('Nothing scheduled right now.')).toBeTruthy();
    fireEvent.press(getByLabelText('RESOLVED'));
    expect(getByText('Front seat belt anchor torque')).toBeTruthy();
    expect(getByText('Civic Type R · Repaired 27 Jun 2023')).toBeTruthy();
    expect(queryByText('Rear camera image failure')).toBeNull();
  });
  it('Schedule Repair books it, toasts and switches to the scheduled filter', () => {
    const { getByLabelText, getByText } = render(<RecallsScreen />);
    fireEvent.press(getByLabelText('Schedule Repair'));
    expect(s()).toMatchObject({ scheduled: true, rFilter: 'scheduled', toast: 'Service booked · Thu 10:30 AM' });
    expect(getByText('1 in the shop')).toBeTruthy();
    expect(getByText('REPAIR SCHEDULED')).toBeTruthy();
    expect(getByText('Model S Plaid · Booked Thu 10:30 AM')).toBeTruthy();
    expect(getByText('NOTHING OPEN · 3 VEHICLES MONITORED')).toBeTruthy();
  });
  it('See details navigates to the detail route', () => {
    const { getByLabelText } = render(<RecallsScreen />);
    fireEvent.press(getByLabelText('See details'));
    expect(router.navigate).toHaveBeenCalledWith({ pathname: '/(tabs)/recalls/[id]', params: { id: 'v1' } });
  });
  it('Add Vehicle opens the add sheet', () => {
    const { getByLabelText } = render(<RecallsScreen />);
    fireEvent.press(getByLabelText('Add Vehicle'));
    expect(s().sheet).toBe('add');
  });
});

describe('RecallDetailScreen', () => {
  it('renders the open recall with facts, remedy steps, note and the Schedule Repair CTA', () => {
    const onBack = jest.fn();
    const { getByText, getByLabelText } = render(<RecallDetailScreen id="v1" onBack={onBack} />);
    expect(getByText('NHTSA 24V-137')).toBeTruthy();
    expect(getByText('ACTION REQUIRED')).toBeTruthy();
    expect(getByText('Rear camera image failure')).toBeTruthy();
    expect(getByText('Model S Plaid · Reported 12 Feb 2026')).toBeTruthy();
    expect(getByText('UNITS AFFECTED')).toBeTruthy();
    expect(getByText('125,227')).toBeTruthy();
    expect(getByText('WHY THIS MATTERS')).toBeTruthy();
    expect(getByText('THE REMEDY')).toBeTruthy();
    expect(getByText('Display self-test')).toBeTruthy();
    expect(getByText('Until the update is applied, check behind the vehicle before reversing rather than relying on the screen.')).toBeTruthy();
    fireEvent.press(getByLabelText('Schedule Repair'));
    expect(s()).toMatchObject({ scheduled: true, rFilter: 'scheduled' });
    fireEvent.press(getByLabelText('Back'));
    expect(onBack).toHaveBeenCalled();
  });
  it('shows the scheduled and complete footers, and the phone toast', () => {
    s().schedule();
    const { getByText, getByLabelText, rerender } = render(<RecallDetailScreen id="v1" onBack={jest.fn()} />);
    expect(getByText('REPAIR SCHEDULED')).toBeTruthy();
    expect(getByText('Scheduled Thu 10:30 AM')).toBeTruthy();
    fireEvent.press(getByLabelText('Call the service centre'));
    expect(s().toast).toBe('Calling the service centre is not wired up here');
    rerender(<RecallDetailScreen id="h2" onBack={jest.fn()} />);
    expect(getByText('RESOLVED')).toBeTruthy();
    expect(getByText('Repair complete')).toBeTruthy();
    expect(getByText('Taycan 4S · Repaired 02 Nov 2024')).toBeTruthy();
  });
  it('renders nothing for an unknown id', () => {
    const { toJSON } = render(<RecallDetailScreen id="nope" onBack={jest.fn()} />);
    expect(toJSON()).toBeNull();
  });
});
