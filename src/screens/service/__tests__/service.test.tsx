import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ReasonSheet } from '../ReasonSheet';
import { ServiceScreen } from '../ServiceScreen';
import { resetAppStore, useAppStore } from '../../../store/useAppStore';

const s = () => useAppStore.getState();
beforeEach(() => { resetAppStore(); jest.clearAllMocks(); });

describe('ServiceScreen (form)', () => {
  it('renders the title, the caution reason card, the centre and every picker', () => {
    const { getByText, getByLabelText } = render(<ServiceScreen />);
    expect(getByText('Schedule Service')).toBeTruthy();
    expect(getByText('REF: NHTSA-24V-137')).toBeTruthy();
    expect(getByText('Rear camera image failure')).toBeTruthy();
    expect(getByText('TAP FOR RECALL DETAILS')).toBeTruthy();
    expect(getByText('SELECTED CENTER')).toBeTruthy();
    expect(getByText('Prime Center')).toBeTruthy();
    expect(getByText('SERVICE METHOD')).toBeTruthy();
    expect(getByLabelText('Drop-off').props.accessibilityState).toEqual({ selected: true });
    expect(getByLabelText('TUE 13').props.accessibilityState).toEqual({ selected: true });
    expect(getByLabelText('09:30 AM').props.accessibilityState).toEqual({ selected: true, disabled: false });
    expect(getByLabelText('08:00 AM').props.accessibilityState).toEqual({ selected: false, disabled: true });
    expect(getByLabelText('Confirm Appointment')).toBeTruthy();
  });
  it('the reason card opens the reason sheet; Change toasts', () => {
    const { getByTestId, getByLabelText } = render(<ServiceScreen />);
    fireEvent.press(getByTestId('reason-card'));
    expect(s().sheet).toBe('reason');
    fireEvent.press(getByLabelText('Change'));
    expect(s().toast).toBe('Dealer map is not wired up here');
  });
  it('pickers update the store; the disabled slot does not', () => {
    const { getByLabelText } = render(<ServiceScreen />);
    fireEvent.press(getByLabelText('Concierge'));
    fireEvent.press(getByLabelText('THU 15'));
    fireEvent.press(getByLabelText('02:30 PM'));
    fireEvent.press(getByLabelText('08:00 AM'));
    expect(s()).toMatchObject({ svcMethod: 'concierge', svcDate: '15', svcTime: '02:30 PM' });
  });
  it('Confirm Appointment books it, toasts and shows the confirmation', () => {
    const { getByLabelText, getByText } = render(<ServiceScreen />);
    fireEvent.press(getByLabelText('Confirm Appointment'));
    expect(s()).toMatchObject({ svcDone: true, scheduled: true, toast: 'Service booked · Tuesday, Oct 13 at 09:30 AM' });
    expect(getByText('Confirmed')).toBeTruthy();
    expect(getByText('Your service request is scheduled.')).toBeTruthy();
    expect(getByText('Tuesday, Oct 13 at 09:30 AM')).toBeTruthy();
    expect(getByText('Drop-off')).toBeTruthy();
    expect(getByText('1200 Technical Blvd')).toBeTruthy();
    expect(getByText('STATUS TRACKER')).toBeTruthy();
    expect(getByText('Appointment confirmed')).toBeTruthy();
    fireEvent.press(getByLabelText('Return to Garage'));
    expect(s()).toMatchObject({ tab: 'garage', svcDone: false });
    expect(router.navigate).toHaveBeenCalledWith('/(tabs)/garage');
  });
  it('shows the routine card when no vehicle has a recall', () => {
    useAppStore.setState({ vehicles: s().vehicles.map((v) => ({ ...v, recall: null })) });
    const { getByText, getByTestId } = render(<ServiceScreen />);
    expect(getByText('REF: NHTSA-24V001')).toBeTruthy();
    expect(getByText('System Diagnostic & Update')).toBeTruthy();
    expect(getByText('ROUTINE MAINTENANCE VISIT')).toBeTruthy();
    fireEvent.press(getByTestId('reason-card'));
    expect(s().sheet).toBeNull();
  });
});

describe('ReasonSheet', () => {
  it('renders the recall, rows and why; Continue booking closes; Full recall opens the detail', () => {
    s().openSheet('reason');
    const { getByText, getByLabelText } = render(<ReasonSheet />);
    expect(getByText('ACTIVE SAFETY RECALL')).toBeTruthy();
    expect(getByText('NHTSA 24V-137')).toBeTruthy();
    expect(getByText('Model S Plaid · 2024 Tesla · 42,000 mi')).toBeTruthy();
    expect(getByText('Prime Center — 4.2 mi')).toBeTruthy();
    expect(getByText(/rear camera image while the vehicle is in reverse/)).toBeTruthy();
    fireEvent.press(getByLabelText('Continue booking'));
    expect(s().sheet).toBeNull();
    s().openSheet('reason');
    fireEvent.press(getByLabelText('Full recall'));
    expect(s()).toMatchObject({ sheet: null, tab: 'recalls', rFilter: 'open' });
    expect(router.navigate).toHaveBeenCalledWith({ pathname: '/(tabs)/recalls/[id]', params: { id: 'v1' } });
  });
  it('renders nothing without an open recall', () => {
    useAppStore.setState({ vehicles: s().vehicles.map((v) => ({ ...v, recall: null })) });
    expect(render(<ReasonSheet />).toJSON()).toBeNull();
  });
});
