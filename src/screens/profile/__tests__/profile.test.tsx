import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { MembershipScreen } from '../MembershipScreen';
import { ProfileScreen } from '../ProfileScreen';
import { resetAppStore, useAppStore } from '../../../store/useAppStore';

const s = () => useAppStore.getState();
beforeEach(() => { resetAppStore(); jest.clearAllMocks(); });

describe('ProfileScreen', () => {
  it('renders the header, membership line, account details, toggles, garage, concierge, activity and danger zone', () => {
    const { getByText, getAllByText, getAllByRole, getByRole } = render(<ProfileScreen />);
    expect(getByText('AV')).toBeTruthy();
    expect(getByText('Alexander Vance')).toBeTruthy();
    expect(getByText('Premium Member since 2022')).toBeTruthy();
    expect(getByText('AEGIS PRO ACTIVE')).toBeTruthy();
    expect(getByText('Pro · $29/month')).toBeTruthy();
    expect(getByText('alexander.vance@example.com')).toBeTruthy();
    expect(getByText('+1 (555) 019-8234')).toBeTruthy();
    expect(getAllByRole('switch')).toHaveLength(3);
    expect(getByRole('switch', { name: 'Biometric Login' }).props.accessibilityState).toEqual({ checked: false });
    expect(getByText('VIN: F12345XXXXXX')).toBeTruthy();
    expect(getByText('1 Active Recall')).toBeTruthy();
    expect(getAllByText('All Clear').length).toBeGreaterThan(0);
    expect(getByText('Concierge Support')).toBeTruthy();
    expect(getByText('System scan completed.')).toBeTruthy();
    expect(getByText('YESTERDAY, 14:15 PM')).toBeTruthy();
    expect(getByText('Danger Zone')).toBeTruthy();
  });
  it('toggles flip preferences', () => {
    const { getByRole } = render(<ProfileScreen />);
    fireEvent.press(getByRole('switch', { name: 'Biometric Login' }));
    expect(s().pfBio).toBe(true);
    fireEvent.press(getByRole('switch', { name: 'Push Notifications' }));
    expect(s().pfPush).toBe(false);
  });
  it('rows open the membership screen, the add sheet, the chat, stats, and the two toasts', () => {
    const { getByLabelText } = render(<ProfileScreen />);
    fireEvent.press(getByLabelText('Membership'));
    expect(s().screen).toBe('membership');
    fireEvent.press(getByLabelText('+ ADD VEHICLE'));
    expect(s().sheet).toBe('add');
    fireEvent.press(getByLabelText('Start Chat'));
    expect(s().screen).toBe('chat');
    fireEvent.press(getByLabelText('Taycan 4S'));
    expect(s().tab).toBe('garage');
    expect(router.navigate).toHaveBeenCalledWith({ pathname: '/(tabs)/garage/[id]', params: { id: '2' } });
    fireEvent.press(getByLabelText('Edit Profile'));
    expect(s().toast).toBe('Profile editing stays local in this prototype');
    fireEvent.press(getByLabelText('Delete Account'));
    expect(s().toast).toBe('No account data is stored by this build');
  });
  it('the garage rows go clear once scheduled', () => {
    s().schedule();
    const { getAllByText, queryByText } = render(<ProfileScreen />);
    expect(getAllByText('All Clear')).toHaveLength(3);
    expect(queryByText('1 Active Recall')).toBeNull();
  });
});

describe('MembershipScreen', () => {
  it('renders the three plans with Plus recommended and Pro current', () => {
    const { getByText, getByLabelText, getByTestId } = render(<MembershipScreen />);
    expect(getByText('MEMBERSHIP')).toBeTruthy();
    expect(getByText('Select your protection level')).toBeTruthy();
    expect(getByText('Standard')).toBeTruthy();
    expect(getByText('$9')).toBeTruthy();
    expect(getByText('Recommend')).toBeTruthy();
    expect(getByLabelText('Upgrade to Plus')).toBeTruthy();
    expect(getByLabelText('Switch to Standard')).toBeTruthy();
    expect(getByLabelText('Current plan').props.accessibilityState).toEqual({ disabled: true });
    expect(getByText('Real-time alerts')).toBeTruthy();
    expect(getByText('Billed monthly. Cancel any time from this screen.')).toBeTruthy();
    expect(getByTestId('plan-plus')).toBeTruthy();
  });
  it('selecting Plus makes it current and toasts; Pro becomes selectable', () => {
    const { getByLabelText, getAllByLabelText } = render(<MembershipScreen />);
    fireEvent.press(getByLabelText('Upgrade to Plus'));
    expect(s()).toMatchObject({ plan: 'plus', toast: 'Plus membership active' });
    expect(getByLabelText('Upgrade to Pro')).toBeTruthy();
    expect(getAllByLabelText('Current plan').length).toBeGreaterThan(0);
  });
  it('Close closes the screen', () => {
    const { getByLabelText } = render(<MembershipScreen />);
    fireEvent.press(getByLabelText('Close'));
    expect(s().screen).toBeNull();
  });
});
