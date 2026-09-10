import { act, fireEvent, render } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import type { PanGesture } from 'react-native-gesture-handler';
import { ArticleReader } from '../ArticleReader';
import { resetAppStore, useAppStore } from '../../../store/useAppStore';

const s = () => useAppStore.getState();
beforeEach(() => { resetAppStore(); jest.useFakeTimers(); s().openArticle('a2'); });
afterEach(() => jest.useRealTimers());

describe('ArticleReader', () => {
  it('renders the live article with kicker, meta, headings, hint and the next card', () => {
    const { getByText, getAllByText, getByLabelText } = render(<ArticleReader />);
    expect(getAllByText('MAINTENANCE').length).toBeGreaterThan(0);
    expect(getAllByText('Oil intervals: why the sticker and the manual disagree').length).toBeGreaterThan(0);
    expect(getByText('3 MIN READ')).toBeTruthy();
    expect(getByText('JAN 2026')).toBeTruthy();
    expect(getByText('Read the manual, not the sticker')).toBeTruthy();
    expect(getByText('SWIPE FOR THE NEXT ARTICLE')).toBeTruthy();
    expect(getByText('NEXT ARTICLE')).toBeTruthy();
    expect(getAllByText('Reading a tyre sidewall in thirty seconds').length).toBeGreaterThan(0);   // next card + peek
    expect(getByLabelText('Next article')).toBeTruthy();
    expect(getByLabelText('Previous article')).toBeTruthy();
  });
  it('mounts both neighbour peeks off-screen', () => {
    const { getByTestId } = render(<ArticleReader />);
    expect(getByTestId('article-peek-prev')).toBeTruthy();
    expect(getByTestId('article-peek-next')).toBeTruthy();
  });
  it('Next/Previous change the article, sync the hub index and show a leaver for 380 ms', () => {
    const { getByLabelText, queryByTestId } = render(<ArticleReader />);
    fireEvent.press(getByLabelText('Next article'));
    expect(s()).toMatchObject({ article: 'a3', hubIdx: 2 });
    expect(queryByTestId('article-leaver')).toBeTruthy();
    act(() => { jest.advanceTimersByTime(400); });
    expect(queryByTestId('article-leaver')).toBeNull();
    fireEvent.press(getByLabelText('Previous article'));
    expect(s()).toMatchObject({ article: 'a2', hubIdx: 1 });
    act(() => { jest.advanceTimersByTime(400); });
    fireEvent.press(getByLabelText('Previous article'));
    expect(s().article).toBe('a1');
    act(() => { jest.advanceTimersByTime(400); });
    fireEvent.press(getByLabelText('Previous article'));
    expect(s().article).toBe('a4');   // wraps
  });
  it('ignores a second change while the leaver is still animating', () => {
    const { getByLabelText } = render(<ArticleReader />);
    fireEvent.press(getByLabelText('Next article'));
    fireEvent.press(getByLabelText('Next article'));
    expect(s().article).toBe('a3');
  });
  it('the NEXT ARTICLE card advances; Close clears the article', () => {
    const { getByLabelText } = render(<ArticleReader />);
    fireEvent.press(getByLabelText('NEXT ARTICLE'));
    expect(s().article).toBe('a3');
    fireEvent.press(getByLabelText('Close'));
    expect(s()).toMatchObject({ screen: null, article: null });
  });
  // Deviation from the brief's single combined test (see task-9-report.md): react-native-gesture-handler's
  // GestureDetector does not refresh its registered native callbacks to a re-rendered component's latest
  // closures within this jest environment (confirmed by tracing onUpdate/onEnd/go — the second of two
  // fireGestureHandler calls separated by a store-driven re-render still ran against the article captured
  // at the *first* render). A single fireGestureHandler dispatch against a freshly mounted tree, before any
  // re-render, drives onUpdate/onEnd correctly, so each swipe direction gets its own fresh render.
  // Two ACTIVE frames are required per gesture: the first (BEGAN→ACTIVE transition) invokes onStart, which
  // this component does not define; onUpdate only fires on a same-state ACTIVE→ACTIVE repeat.
  it('a short swipe does not change the article; a longer one past 70 px advances to the next', () => {
    render(<ArticleReader />);
    fireGestureHandler<PanGesture>(getByGestureTestId('article-pan'), [
      { state: State.BEGAN }, { state: State.ACTIVE, translationX: 0 }, { state: State.ACTIVE, translationX: -40 }, { state: State.END, translationX: -40 },
    ]);
    expect(s().article).toBe('a2');
    fireGestureHandler<PanGesture>(getByGestureTestId('article-pan'), [
      { state: State.BEGAN }, { state: State.ACTIVE, translationX: 0 }, { state: State.ACTIVE, translationX: -120 }, { state: State.END, translationX: -120 },
    ]);
    act(() => { jest.advanceTimersByTime(0); });   // onEnd's runOnJS(goNext) is queued as a fake-timer-tracked microtask by the reanimated jest mock
    expect(s().article).toBe('a3');
  });
  it('a swipe past 70 px in the positive direction goes to the previous article', () => {
    render(<ArticleReader />);
    fireGestureHandler<PanGesture>(getByGestureTestId('article-pan'), [
      { state: State.BEGAN }, { state: State.ACTIVE, translationX: 0 }, { state: State.ACTIVE, translationX: 120 }, { state: State.END, translationX: 120 },
    ]);
    act(() => { jest.advanceTimersByTime(0); });
    expect(s().article).toBe('a1');
  });
  it('renders nothing without an article', () => {
    s().closeArticle();
    expect(render(<ArticleReader />).toJSON()).toBeNull();
  });
});
