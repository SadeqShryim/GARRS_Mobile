import { act, fireEvent, render } from '@testing-library/react-native';
import { FlatList } from 'react-native';
import { HubScreen } from '../HubScreen';
import { LightSheet } from '../LightSheet';
import { resetAppStore, useAppStore } from '../../../store/useAppStore';

const s = () => useAppStore.getState();
beforeEach(() => { resetAppStore(); jest.clearAllMocks(); });

describe('HubScreen', () => {
  it('renders the title, headline, featured rail, counter, groups and all twenty lights', () => {
    const { getByText, getAllByText, getByLabelText, getByTestId } = render(<HubScreen />);
    expect(getByText('Hub')).toBeTruthy();
    expect(getByText('4 ARTICLES · 20 DASHBOARD LIGHTS')).toBeTruthy();
    expect(getByText('FEATURED READING')).toBeTruthy();
    expect(getByText('01 / 04')).toBeTruthy();
    expect(getAllByText('What actually happens after a recall is issued')).toHaveLength(3);   // tripled rail
    expect(getAllByText('RECALL BASICS')).toHaveLength(3);
    expect(getByLabelText('ALL').props.accessibilityState).toEqual({ selected: true });
    expect(getByText('STOP NOW')).toBeTruthy();
    expect(getByTestId('light-l1')).toBeTruthy();
    expect(getByTestId('light-l20')).toBeTruthy();
    expect(getAllByText('ABS').length).toBeGreaterThan(0);   // l8's glyph and short caption are both literally "ABS"
    expect(getByText('Oil pressure')).toBeTruthy();
    expect(getByText("Symbols vary by manufacturer. Your owner's manual is the final word for your vehicle.")).toBeTruthy();
  });
  it('group chips filter the grid', () => {
    const { getByLabelText, queryByTestId, getByTestId } = render(<HubScreen />);
    fireEvent.press(getByLabelText('STOP NOW'));
    expect(s().hubGroup).toBe('critical');
    expect(getByTestId('light-l1')).toBeTruthy();
    expect(queryByTestId('light-l8')).toBeNull();
    fireEvent.press(getByLabelText('STATUS'));
    expect(getByTestId('light-l17')).toBeTruthy();
    expect(queryByTestId('light-l1')).toBeNull();
  });
  it('tapping a light opens the light sheet; tapping a card opens the article', () => {
    const { getByTestId, getAllByTestId } = render(<HubScreen />);
    fireEvent.press(getByTestId('light-l8'));
    expect(s().hubLight).toBe('l8');
    fireEvent.press(getAllByTestId('article-a2')[0]);
    expect(s()).toMatchObject({ screen: 'article', article: 'a2' });
  });
  it('auto-advances every 5 s while nothing is open, and pauses while the light sheet is open', () => {
    jest.useFakeTimers();
    const spy = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation(() => {});
    render(<HubScreen />);
    act(() => { jest.advanceTimersByTime(5000); });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith({ offset: 5 * 332, animated: true });
    act(() => { useAppStore.getState().openLight('l1'); });
    act(() => { jest.advanceTimersByTime(5000); });
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
    jest.useRealTimers();
  });
});

describe('LightSheet', () => {
  it('renders the light with its badge, means, action and closes on Got it', () => {
    s().openLight('l1');
    const { getByText, getByLabelText } = render(<LightSheet />);
    expect(getByText('Engine oil pressure')).toBeTruthy();
    expect(getByText('STOP DRIVING')).toBeTruthy();
    expect(getByText(/Oil pressure has dropped below the safe minimum/)).toBeTruthy();
    expect(getByText('WHAT TO DO')).toBeTruthy();
    expect(getByText(/Pull over as soon as it is safe/)).toBeTruthy();
    fireEvent.press(getByLabelText('Got it'));
    expect(s().hubLight).toBeNull();
  });
  it('shows the warning and status badges, and the ABS glyph', () => {
    s().openLight('l8');
    const { getAllByText, getByText, rerender } = render(<LightSheet />);
    expect(getAllByText('ABS').length).toBeGreaterThan(0);   // the light's name and its glyph are both literally "ABS"
    expect(getByText('GET IT CHECKED')).toBeTruthy();
    act(() => s().openLight('l17'));
    rerender(<LightSheet />);
    expect(getByText('Cruise control')).toBeTruthy();
    expect(getByText('STATUS ONLY')).toBeTruthy();
  });
  it('renders nothing when no light is selected', () => {
    expect(render(<LightSheet />).toJSON()).toBeNull();
  });
});
