import { act, fireEvent, render } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { BackHandler } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { AuthPanel } from '../AuthPanel';

function Host({ onDone, active = true, runId = 0 }: { onDone: () => void; active?: boolean; runId?: number }) {
  const opacity = useSharedValue(1);
  return <AuthPanel opacity={opacity} active={active} runId={runId} onDone={onDone} />;
}
const setup = (props: Partial<ComponentProps<typeof Host>> = {}) => {
  const onDone = jest.fn();
  return { onDone, ...render(<Host onDone={onDone} {...props} />) };
};

describe('AuthPanel', () => {
  it('shows the email step and gates its arrow on a valid address', () => {
    const { getByText, queryByLabelText, getByTestId, getByLabelText, queryByText } = setup();
    expect(getByText('Get started\nwith Recall Hub')).toBeTruthy();
    expect(getByText('Continue with')).toBeTruthy();
    expect(getByText('OR')).toBeTruthy();
    expect(queryByText('Go back')).toBeNull();
    expect(queryByLabelText('Continue')).toBeNull();
    fireEvent.changeText(getByTestId('email'), 'sam@recallhub');
    expect(queryByLabelText('Continue')).toBeNull();
    fireEvent.changeText(getByTestId('email'), 'sam@recallhub.app');
    fireEvent.press(getByLabelText('Continue'));
    expect(getByText('Create your password')).toBeTruthy();
    expect(getByText('At least 6 characters. sam@recallhub.app')).toBeTruthy();
    expect(getByTestId('email')).toBeTruthy();   // the email field stays on the password step
    expect(getByText('Go back')).toBeTruthy();
  });

  it('walks password → confirm, flags a mismatch, finishes on a match', () => {
    const { getByTestId, getByLabelText, queryByLabelText, getByText, queryByText, onDone } = setup();
    fireEvent.changeText(getByTestId('email'), 'sam@recallhub.app');
    fireEvent(getByTestId('email'), 'submitEditing');
    fireEvent.changeText(getByTestId('password'), 'hunt');
    expect(queryByLabelText('Continue')).toBeNull();
    fireEvent.changeText(getByTestId('password'), 'hunter22');
    fireEvent.press(getByLabelText('Continue'));
    expect(getByText('One last step')).toBeTruthy();
    expect(getByText('Confirm your password to continue')).toBeTruthy();
    fireEvent.changeText(getByTestId('confirm'), 'hunter2x');
    fireEvent.press(getByLabelText('Finish'));
    expect(getByText('Passwords do not match.')).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.changeText(getByTestId('confirm'), 'hunter22');
    expect(queryByText('Passwords do not match.')).toBeNull();
    fireEvent.press(getByLabelText('Finish'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('goes back a step, clearing the confirmation', () => {
    const { getByTestId, getByText, queryByTestId } = setup();
    fireEvent.changeText(getByTestId('email'), 'sam@recallhub.app');
    fireEvent(getByTestId('email'), 'submitEditing');
    fireEvent.changeText(getByTestId('password'), 'hunter22');
    fireEvent(getByTestId('password'), 'submitEditing');
    fireEvent.changeText(getByTestId('confirm'), 'hun');
    fireEvent.press(getByText('Go back'));
    expect(getByText('Create your password')).toBeTruthy();
    expect(queryByTestId('confirm')).toBeNull();
    fireEvent.press(getByText('Go back'));
    expect(getByText('Get started\nwith Recall Hub')).toBeTruthy();
  });

  it('toggles the eye on the password field', () => {
    const { getByTestId, getByLabelText } = setup();
    fireEvent.changeText(getByTestId('email'), 'sam@recallhub.app');
    fireEvent(getByTestId('email'), 'submitEditing');
    expect(getByTestId('password').props.secureTextEntry).toBe(true);
    expect(getByTestId('icon-eye-line')).toBeTruthy();
    fireEvent.press(getByLabelText('Show password'));
    expect(getByTestId('password').props.secureTextEntry).toBe(false);
    expect(getByTestId('icon-eye-off-line')).toBeTruthy();
  });

  it('Google, Apple and Sign in all finish', () => {
    const { getByLabelText, getByText, onDone } = setup();
    fireEvent.press(getByLabelText('Google'));
    fireEvent.press(getByLabelText('Apple'));
    fireEvent.press(getByText('Sign in'));
    expect(onDone).toHaveBeenCalledTimes(3);
  });

  it('is inert until active and resets on a new run', () => {
    const { getByTestId, rerender, onDone } = setup({ active: false });
    expect(getByTestId('auth').props.pointerEvents).toBe('none');
    rerender(<Host onDone={onDone} active runId={0} />);
    expect(getByTestId('auth').props.pointerEvents).toBe('auto');
    fireEvent.changeText(getByTestId('email'), 'sam@recallhub.app');
    fireEvent(getByTestId('email'), 'submitEditing');
    rerender(<Host onDone={onDone} active runId={1} />);
    expect(getByTestId('email').props.value).toBe('');
  });

  it('hardware back steps backwards while a later step is showing', () => {
    const handlers: (() => boolean | null | undefined)[] = [];
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_e, h) => { handlers.push(h as () => boolean); return { remove: jest.fn() }; });
    const { getByTestId, getByText } = setup();
    expect(handlers).toHaveLength(0);
    fireEvent.changeText(getByTestId('email'), 'sam@recallhub.app');
    fireEvent(getByTestId('email'), 'submitEditing');
    expect(handlers.length).toBeGreaterThan(0);
    let backResult: boolean | null | undefined;
    // React 19 defers a dispatch triggered from a plain function call (not a fireEvent-driven React
    // event) to the next task; wrap it in act() so the resulting re-render is flushed before assertions.
    act(() => { backResult = handlers[handlers.length - 1](); });
    expect(backResult).toBe(true);
    expect(getByText('Get started\nwith Recall Hub')).toBeTruthy();
    jest.restoreAllMocks();
  });
});
