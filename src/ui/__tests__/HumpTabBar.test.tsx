import { fireEvent, render } from '@testing-library/react-native';
import { HumpTabBar, humpXFor } from '../HumpTabBar';
import { resetAppStore, useAppStore } from '../../store/useAppStore';

beforeEach(resetAppStore);

function props(index = 0) {
  const names = ['garage', 'recalls', 'service', 'hub', 'profile'];
  return {
    state: { index, routes: names.map((name, i) => ({ key: `${name}-${i}`, name })) },
    navigation: { navigate: jest.fn(), emit: jest.fn() },
    descriptors: {},
    insets: { top: 0, bottom: 24, left: 0, right: 0 },
  } as unknown as Parameters<typeof HumpTabBar>[0];
}

describe('HumpTabBar', () => {
  it('centres the 61px hump on the item', () => {
    expect(humpXFor(100, 82.8)).toBeCloseTo(110.9);
  });
  it('renders five tabs and marks the active one selected', () => {
    const { getByLabelText } = render(<HumpTabBar {...props(0)} />);
    expect(getByLabelText('GARAGE').props.accessibilityState).toEqual({ selected: true });
    expect(getByLabelText('PROFILE').props.accessibilityState).toEqual({ selected: false });
  });
  it('tapping a tab switches the store tab and navigates', () => {
    const p = props(0);
    useAppStore.getState().openSheet('add');
    const { getByLabelText } = render(<HumpTabBar {...p} />);
    fireEvent.press(getByLabelText('RECALLS'));
    expect(useAppStore.getState().tab).toBe('recalls');
    expect(useAppStore.getState().sheet).toBeNull();
    expect(p.navigation.navigate).toHaveBeenCalledWith('recalls', undefined);
  });
  it('tapping garage returns the garage stack to its root', () => {
    const p = props(1);
    const { getByLabelText } = render(<HumpTabBar {...p} />);
    fireEvent.press(getByLabelText('GARAGE'));
    expect(p.navigation.navigate).toHaveBeenCalledWith('garage', { screen: 'index' });
  });
});
