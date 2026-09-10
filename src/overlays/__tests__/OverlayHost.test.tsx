import { act, render } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { OverlayHost } from '../OverlayHost';
import { resetAppStore, useAppStore } from '../../store/useAppStore';

jest.mock('../../screens/splash/useMarqueeDrive');

type Handler = () => boolean | null | undefined;
const handlers: Handler[] = [];
const pressBack = () => handlers[handlers.length - 1]();
const s = () => useAppStore.getState();

beforeEach(() => {
  handlers.length = 0;
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => { handlers.push(handler as Handler); return { remove: jest.fn() }; });
  resetAppStore();
  useAppStore.setState({ splash: false });
  jest.useFakeTimers();
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

describe('OverlayHost mounts', () => {
  it('the light sheet while hubLight is set', () => {
    s().openLight('l1');
    const { getByTestId } = render(<OverlayHost />);
    expect(getByTestId('sheet-light')).toBeTruthy();
  });
  it('the reason sheet, membership, chat and article by state', () => {
    s().openSheet('reason');
    const { getByTestId, rerender } = render(<OverlayHost />);
    expect(getByTestId('sheet-reason')).toBeTruthy();
    act(() => { s().closeSheet(); s().openScreen('membership'); });
    rerender(<OverlayHost />);
    expect(getByTestId('screen-membership')).toBeTruthy();
    act(() => { s().openScreen('chat'); });
    rerender(<OverlayHost />);
    expect(getByTestId('screen-chat')).toBeTruthy();
    act(() => { s().closeScreen(); s().openArticle('a1'); });
    rerender(<OverlayHost />);
    expect(getByTestId('article-reader')).toBeTruthy();
  });
  it('the real Splash while splash is true', () => {
    useAppStore.setState({ splash: true });
    const { getByTestId, getByText } = render(<OverlayHost />);
    expect(getByTestId('stage')).toBeTruthy();
    expect(getByText('REPLAY')).toBeTruthy();
  });
});

describe('OverlayHost hardware back', () => {
  it('closes the add sheet instead of leaving the app', () => {
    s().openSheet('add');
    render(<OverlayHost />);
    expect(pressBack()).toBe(true);
    expect(s().sheet).toBeNull();
  });
  it('closes VIN help first, then the sheet beneath it', () => {
    s().openSheet('add'); s().openVinHelp();
    const { rerender } = render(<OverlayHost />);
    expect(pressBack()).toBe(true);
    expect(s().screen).toBeNull();
    expect(s().sheet).toBe('add');
    rerender(<OverlayHost />);
    expect(pressBack()).toBe(true);
    expect(s().sheet).toBeNull();
  });
  it('closes the article (clearing it), the chat, the membership screen, the light sheet and the reason sheet', () => {
    s().openArticle('a2');
    const { rerender } = render(<OverlayHost />);
    expect(pressBack()).toBe(true);
    expect(s()).toMatchObject({ screen: null, article: null });
    act(() => { s().openScreen('chat'); }); rerender(<OverlayHost />);
    expect(pressBack()).toBe(true); expect(s().screen).toBeNull();
    act(() => { s().openScreen('membership'); }); rerender(<OverlayHost />);
    expect(pressBack()).toBe(true); expect(s().screen).toBeNull();
    act(() => { s().openLight('l3'); }); rerender(<OverlayHost />);
    expect(pressBack()).toBe(true); expect(s().hubLight).toBeNull();
    act(() => { s().openSheet('reason'); }); rerender(<OverlayHost />);
    expect(pressBack()).toBe(true); expect(s().sheet).toBeNull();
  });
  it('lets the system handle back when nothing is open', () => {
    render(<OverlayHost />);
    expect(pressBack()).toBe(false);
  });
});
