import { fireEvent, render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { Blobs } from '../Blobs';
import { Bubble, useBubbleValues, type BubbleValues } from '../Bubble';
import { Mark } from '../Mark';

function One({ children }: { children: (op: SharedValue<number>) => ReactElement }) {
  const op = useSharedValue(1);
  return children(op);
}

it('Mark shows the shield tile and RECALL HUB', () => {
  const { getByText, getByTestId } = render(<One>{(op) => <Mark opacity={op} />}</One>);
  expect(getByText('RECALL HUB')).toBeTruthy();
  expect(getByTestId('icon-shield-check-fill')).toBeTruthy();
});

it('Blobs draws four blobs under the scrim', () => {
  const { getByTestId } = render(<One>{(op) => <Blobs opacity={op} />}</One>);
  for (const i of [1, 2, 3, 4]) expect(getByTestId(`blob-${i}`)).toBeTruthy();
  expect(getByTestId('blob-scrim')).toBeTruthy();
});

describe('Bubble', () => {
  let captured: BubbleValues | null = null;
  function Host() {
    const v = useBubbleValues();
    captured = v;
    return <Bubble v={v} />;
  }
  it('shows the copy and reports its frame for the Skia backdrop', () => {
    const { getByText, getByTestId } = render(<Host />);
    expect(getByText(/Did you f\*cking[ \u00A0]check\?/)).toBeTruthy();
    fireEvent(getByTestId('bubble-face'), 'layout', { nativeEvent: { layout: { x: 35, y: 425, width: 360, height: 82 } } });
    expect(captured!.frame.value).toEqual({ x: 35, y: 425, w: 360, h: 82 });
  });
});
