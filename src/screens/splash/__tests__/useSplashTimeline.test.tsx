import { act, fireEvent, render } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { useMarqueeDrive } from '../__mocks__/useMarqueeDrive';
import { useBubbleValues } from '../Bubble';
import { useSplashTimeline } from '../useSplashTimeline';

function Host() {
  const bubble = useBubbleValues();
  const { phase, runId, run } = useSplashTimeline(bubble);
  return (
    <>
      <Text testID="phase">{phase}</Text>
      <Text testID="run">{String(runId)}</Text>
      <Pressable testID="replay" onPress={run} />
    </>
  );
}
// The brief typed `g` as `(id: string) => { props: { children: string } }`, but @types/react-test-renderer
// declares `ReactTestInstance.props` as an index signature (`{ [propName: string]: any }`), which TS strict
// mode does not accept as satisfying an explicit required `children` property (TS2345/TS2741). Typed against
// the real query return type instead; behaviour is unchanged.
const phaseOf = (g: (id: string) => ReactTestInstance) => g('phase').props.children as string;

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('walks run → photo → bubble → fade → auth on the source schedule', () => {
  const { getByTestId } = render(<Host />);
  expect(phaseOf(getByTestId)).toBe('run');
  expect(getByTestId('run').props.children).toBe('1');
  act(() => { jest.advanceTimersByTime(2999); });
  expect(phaseOf(getByTestId)).toBe('run');
  act(() => { jest.advanceTimersByTime(1); });
  expect(phaseOf(getByTestId)).toBe('photo');
  act(() => { jest.advanceTimersByTime(500); });
  expect(phaseOf(getByTestId)).toBe('bubble');
  act(() => { jest.advanceTimersByTime(3049); });
  expect(phaseOf(getByTestId)).toBe('bubble');
  act(() => { jest.advanceTimersByTime(1); });
  expect(phaseOf(getByTestId)).toBe('fade');
  act(() => { jest.advanceTimersByTime(550); });
  expect(phaseOf(getByTestId)).toBe('auth');
});

it('REPLAY restarts the schedule and bumps runId', () => {
  const { getByTestId } = render(<Host />);
  act(() => { jest.advanceTimersByTime(7100); });
  expect(phaseOf(getByTestId)).toBe('auth');
  fireEvent.press(getByTestId('replay'));
  expect(phaseOf(getByTestId)).toBe('run');
  expect(getByTestId('run').props.children).toBe('2');
  act(() => { jest.advanceTimersByTime(3000); });
  expect(phaseOf(getByTestId)).toBe('photo');
});

it('the marquee drive mock exposes static values', () => {
  function Drive() { const v = useMarqueeDrive(1); return <Text testID="scale">{String(v.scale.value)}</Text>; }
  const { getByTestId } = render(<Drive />);
  expect(getByTestId('scale').props.children).toBe('1');
});
