import { render } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { OverlayHost } from '../OverlayHost';
import { resetAppStore, useAppStore } from '../../store/useAppStore';

jest.mock('expo-router', () => ({ useRouter: () => ({ navigate: jest.fn() }) }));

type Handler = () => boolean | null | undefined;
const handlers: Handler[] = [];
const pressBack = () => handlers[handlers.length - 1]();

beforeEach(() => {
  handlers.length = 0;
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => { handlers.push(handler as Handler); return { remove: jest.fn() }; });
  resetAppStore();
  useAppStore.setState({ splash: false });
});
afterEach(() => jest.restoreAllMocks());

describe('OverlayHost hardware back', () => {
  it('closes the add sheet instead of leaving the app', () => {
    useAppStore.getState().openSheet('add');
    render(<OverlayHost />);
    expect(pressBack()).toBe(true);
    expect(useAppStore.getState().sheet).toBeNull();
  });
  it('closes VIN help first, then the sheet beneath it', () => {
    useAppStore.getState().openSheet('add');
    useAppStore.getState().openVinHelp();
    const { rerender } = render(<OverlayHost />);
    expect(pressBack()).toBe(true);
    expect(useAppStore.getState().screen).toBeNull();
    expect(useAppStore.getState().sheet).toBe('add');
    rerender(<OverlayHost />);
    expect(pressBack()).toBe(true);
    expect(useAppStore.getState().sheet).toBeNull();
  });
  it('lets the system handle back when nothing is open', () => {
    render(<OverlayHost />);
    expect(pressBack()).toBe(false);
  });
});
