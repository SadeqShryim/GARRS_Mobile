import { act, render } from '@testing-library/react-native';
import { countAt, HealthGauge } from '../HealthGauge';

describe('countAt', () => {
  it('eases out cubically over 1400ms', () => {
    expect(countAt(65, 0)).toBe(0);
    expect(countAt(65, 700)).toBe(57);   // 65 * (1 - 0.5^3) = 56.875
    expect(countAt(65, 1400)).toBe(65);
    expect(countAt(65, 9999)).toBe(65);
  });
});

describe('HealthGauge', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  it('counts up to the health value', () => {
    const { getByTestId, getByText } = render(<HealthGauge health={65} gaugeColor="#0F638F" word="Fair" />);
    expect(getByText('Fair')).toBeTruthy();
    act(() => { jest.advanceTimersByTime(1500); });
    expect(getByTestId('gauge-count').props.children).toBe(65);
  });
});
