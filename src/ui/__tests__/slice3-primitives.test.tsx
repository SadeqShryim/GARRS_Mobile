import { fireEvent, render } from '@testing-library/react-native';
import { createRef } from 'react';
import { FlatList, Text } from 'react-native';
import { InfiniteRail, type InfiniteRailHandle } from '../InfiniteRail';
import { Sheet, SheetShell } from '../Sheet';
import { ShineBorder } from '../ShineBorder';
import { StatusChip } from '../StatusChip';
import { Toggle } from '../Toggle';

describe('StatusChip', () => {
  it('renders icon and label', () => {
    const { getByText, getByTestId } = render(<StatusChip bg="#D0021B" fg="#fff" icon="alarm-warning-fill" label="ACTION REQUIRED" />);
    expect(getByText('ACTION REQUIRED')).toBeTruthy();
    expect(getByTestId('icon-alarm-warning-fill')).toBeTruthy();
  });
});

describe('Toggle', () => {
  it('is a switch that reports its state and presses', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<Toggle on label="Push Notifications" onPress={onPress} />);
    const sw = getByRole('switch');
    expect(sw.props.accessibilityState).toEqual({ checked: true });
    fireEvent.press(sw);
    expect(onPress).toHaveBeenCalled();
  });
});

describe('ShineBorder', () => {
  it('mounts the rotating ramp once it has a size', () => {
    const { getByTestId, queryByTestId, getByText } = render(<ShineBorder ramp="plus" radius={16} testID="sb"><Text>card</Text></ShineBorder>);
    expect(getByText('card')).toBeTruthy();
    expect(queryByTestId('shine')).toBeNull();
    fireEvent(getByTestId('sb'), 'layout', { nativeEvent: { layout: { width: 390, height: 300 } } });
    expect(getByTestId('shine').props.style).toEqual(expect.arrayContaining([expect.objectContaining({ width: 493, height: 493 })]));
  });
});

describe('SheetShell / Sheet', () => {
  it('SheetShell closes on scrim tap and renders children', () => {
    const onClose = jest.fn();
    const { getByLabelText, getByText } = render(<SheetShell onClose={onClose} handleMargin={6} gap={14}><Text>body</Text></SheetShell>);
    expect(getByText('body')).toBeTruthy();
    fireEvent.press(getByLabelText('Close sheet'));
    expect(onClose).toHaveBeenCalled();
  });
  it('Sheet still renders title, sub and action', () => {
    const { getByText } = render(<Sheet title="Add a vehicle" sub="ENTER VIN" onClose={jest.fn()} action={<Text>act</Text>}><Text>body</Text></Sheet>);
    expect(getByText('Add a vehicle')).toBeTruthy();
    expect(getByText('ENTER VIN')).toBeTruthy();
    expect(getByText('act')).toBeTruthy();
  });
});

describe('InfiniteRail', () => {
  const items = ['a', 'b', 'c'];
  it('renders the list tripled with the active flag on the middle copy', () => {
    const { getAllByText } = render(
      <InfiniteRail count={3} index={1} onIndexChange={jest.fn()} keyFor={(i) => items[i]} renderItem={(i, active) => <Text>{items[i] + (active ? '*' : '')}</Text>} />,
    );
    expect(getAllByText('b*')).toHaveLength(3);
    expect(getAllByText('a')).toHaveLength(3);
  });
  it('scrollTo targets the middle copy; advance moves one slot and recentres on a timer', () => {
    jest.useFakeTimers();
    const spy = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation(() => {});
    const ref = createRef<InfiniteRailHandle>();
    render(<InfiniteRail ref={ref} count={3} index={2} onIndexChange={jest.fn()} keyFor={(i) => items[i]} renderItem={(i) => <Text>{items[i]}</Text>} />);
    ref.current!.scrollTo(0, true);
    expect(spy).toHaveBeenLastCalledWith({ offset: 3 * 332, animated: true });
    ref.current!.advance();               // slot 3 → 4 (still in the middle copy)
    expect(spy).toHaveBeenLastCalledWith({ offset: 4 * 332, animated: true });
    ref.current!.advance();               // 4 → 5
    ref.current!.advance();               // 5 → 6 = first slot of the last copy → recentred to 3 after the timer
    expect(spy).toHaveBeenLastCalledWith({ offset: 6 * 332, animated: true });
    jest.advanceTimersByTime(500);
    expect(spy).toHaveBeenLastCalledWith({ offset: 3 * 332, animated: false });
    spy.mockRestore();
    jest.useRealTimers();
  });
  it('reports the live index from scroll offsets and recentres after momentum', () => {
    const onIndexChange = jest.fn();
    const spy = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation(() => {});
    const { getByTestId } = render(<InfiniteRail testID="r" count={3} index={0} onIndexChange={onIndexChange} keyFor={(i) => items[i]} renderItem={(i) => <Text>{items[i]}</Text>} />);
    fireEvent.scroll(getByTestId('r'), { nativeEvent: { contentOffset: { x: 4 * 332 }, layoutMeasurement: { width: 390, height: 700 }, contentSize: { width: 3000, height: 700 } } });
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    fireEvent(getByTestId('r'), 'momentumScrollEnd', { nativeEvent: { contentOffset: { x: 7 * 332 } } });
    expect(spy).toHaveBeenLastCalledWith({ offset: 4 * 332, animated: false });
    spy.mockRestore();
  });
});
