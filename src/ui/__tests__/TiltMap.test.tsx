import { act, render, waitFor } from '@testing-library/react-native';
import { DeviceMotion } from 'expo-sensors';
import { TiltMap } from '../TiltMap';

type Listener = (m: { rotation: { alpha: number; beta: number; gamma: number; timestamp: number } }) => void;
const mocked = DeviceMotion as unknown as { isAvailableAsync: jest.Mock; requestPermissionsAsync: jest.Mock; addListener: jest.Mock; setUpdateInterval: jest.Mock };

afterEach(() => { mocked.isAvailableAsync.mockResolvedValue(false); jest.clearAllMocks(); });

describe('TiltMap', () => {
  it('renders the centre copy and LIVE when no sensor is available', async () => {
    const { getByText, getByTestId } = render(<TiltMap />);
    expect(getByText('Prime Center')).toBeTruthy();
    expect(getByText('1200 Technical Blvd')).toBeTruthy();
    expect(getByText('37.7749° N, 122.4194° W')).toBeTruthy();
    expect(getByText('4.2 mi')).toBeTruthy();
    expect(getByText('LIVE')).toBeTruthy();
    expect(getByTestId('icon-map-pin-line')).toBeTruthy();
    await waitFor(() => expect(mocked.isAvailableAsync).toHaveBeenCalled());
    expect(mocked.addListener).not.toHaveBeenCalled();
  });
  it('subscribes at 60 ms when available and flips to LIVE TILT on the first changed reading', async () => {
    mocked.isAvailableAsync.mockResolvedValue(true);
    let listener: Listener | undefined;
    mocked.addListener.mockImplementation((l: Listener) => { listener = l; return { remove: jest.fn() }; });
    const { getByText, queryByText } = render(<TiltMap />);
    await waitFor(() => expect(listener).toBeDefined());
    expect(mocked.setUpdateInterval).toHaveBeenCalledWith(60);
    expect(queryByText('LIVE TILT')).toBeNull();
    act(() => { listener!({ rotation: { alpha: 0, beta: Math.PI / 2, gamma: 0, timestamp: 0 } }); });   // beta 90° → tiltX −8
    expect(getByText('LIVE TILT')).toBeTruthy();
  });
});
