import { fireEvent, render, renderHook } from '@testing-library/react-native';
import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { __setSegments, router } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BAR, GlassTabBar, barBottom, discXFor, useTabBarClearance } from '../GlassTabBar';
import { resetAppStore, useAppStore } from '../../store/useAppStore';

beforeEach(() => {
  resetAppStore();
  __setSegments(['(tabs)', 'garage']);
  (router.navigate as jest.Mock).mockClear();
  (isLiquidGlassAvailable as jest.Mock).mockReturnValue(false);
  (isGlassEffectAPIAvailable as jest.Mock).mockReturnValue(false);
});

describe('GlassTabBar', () => {
  it('centres the metal disc on the item', () => {
    expect(discXFor(100, 82.8)).toBeCloseTo(100 + (82.8 - BAR.disc) / 2);
  });
  it('renders five tabs and marks the router\'s tab selected', () => {
    __setSegments(['(tabs)', 'profile']);
    const { getByLabelText, getByTestId } = render(<GlassTabBar />);
    expect(getByLabelText('PROFILE').props.accessibilityState).toEqual({ selected: true });
    expect(getByLabelText('GARAGE').props.accessibilityState).toEqual({ selected: false });
    expect(getByTestId('disc')).toBeTruthy();
  });
  it('tapping a tab switches the store tab, closes what is open, and routes there', () => {
    useAppStore.getState().openSheet('add');
    const { getByLabelText } = render(<GlassTabBar />);
    fireEvent.press(getByLabelText('RECALLS'));
    expect(useAppStore.getState().tab).toBe('recalls');
    expect(useAppStore.getState().sheet).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith('/(tabs)/recalls');
  });
  it('tapping garage from a stats screen routes to the garage index (the stack pops)', () => {
    __setSegments(['(tabs)', 'garage', '[id]']);
    const { getByLabelText } = render(<GlassTabBar />);
    fireEvent.press(getByLabelText('GARAGE'));
    expect(router.navigate).toHaveBeenCalledWith('/(tabs)/garage');
  });
  it('is absent outside the tab group', () => {
    __setSegments(['+not-found']);
    expect(render(<GlassTabBar />).queryByTestId('tab-bar')).toBeNull();
  });
  it('renders real Liquid Glass only where iOS 26 offers it, the blur capsule elsewhere', () => {
    const { getByTestId, queryByTestId, rerender } = render(<GlassTabBar />);
    expect(getByTestId('glass-fallback')).toBeTruthy();
    expect(queryByTestId('glass')).toBeNull();
    (isLiquidGlassAvailable as jest.Mock).mockReturnValue(true);
    (isGlassEffectAPIAvailable as jest.Mock).mockReturnValue(true);
    rerender(<GlassTabBar />);
    if (Platform.OS === 'ios') {
      expect(getByTestId('glass')).toBeTruthy();
      expect(queryByTestId('glass-fallback')).toBeNull();
    } else {
      expect(getByTestId('glass-fallback')).toBeTruthy();
    }
  });
  it('sits on the base of the phone unless an opaque three-button nav bar is there', () => {
    expect(barBottom(0)).toBe(0);      // no inset
    expect(barBottom(24)).toBe(0);     // Android gesture nav
    expect(barBottom(34)).toBe(0);     // iPhone home indicator
    expect(barBottom(48)).toBe(48);    // Android three-button nav
  });
  it('leaves room under tab content for the floating bar', () => {
    const { result } = renderHook(() => ({ clearance: useTabBarClearance(), bottom: useSafeAreaInsets().bottom }));
    expect(result.current.clearance).toBe(barBottom(result.current.bottom) + BAR.height + 14);
  });
});
