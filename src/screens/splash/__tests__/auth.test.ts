import { back, cfArrow, emailArrow, emailOk, initialAuth, next, pwArrow, reduce, type AuthState } from '../auth';

const at = (patch: Partial<AuthState>): AuthState => ({ ...initialAuth(), ...patch });

describe('emailOk', () => {
  it('is the source regex /\\S+@\\S+\\.\\S+/', () => {
    expect(emailOk('sam@recallhub.app')).toBe(true);
    expect(emailOk('sam@recallhub')).toBe(false);
    expect(emailOk('a@b.c')).toBe(true);
    expect(emailOk('')).toBe(false);
  });
});

describe('next', () => {
  it('leaves the email step only with a valid address', () => {
    expect(next(at({ email: 'nope' })).state.step).toBe('email');
    expect(next(at({ email: 'sam@recallhub.app' })).state.step).toBe('pw');
  });
  it('needs 6 characters to reach confirm and clears err on the way', () => {
    expect(next(at({ step: 'pw', pw: 'hunt', err: true })).state).toEqual(at({ step: 'pw', pw: 'hunt', err: true }));
    expect(next(at({ step: 'pw', pw: 'hunter22', err: true })).state).toEqual(at({ step: 'confirm', pw: 'hunter22', err: false }));
  });
  it('finishes only when the confirmation matches, otherwise flags err', () => {
    expect(next(at({ step: 'confirm', pw: 'hunter22', cf: 'hunt' }))).toEqual({ state: at({ step: 'confirm', pw: 'hunter22', cf: 'hunt' }), done: false });
    expect(next(at({ step: 'confirm', pw: 'hunter22', cf: 'hunter2x' }))).toEqual({ state: at({ step: 'confirm', pw: 'hunter22', cf: 'hunter2x', err: true }), done: false });
    expect(next(at({ step: 'confirm', pw: 'hunter22', cf: 'hunter22' })).done).toBe(true);
  });
});

describe('back', () => {
  it('drops the confirmation and the error, then the password step, then stops', () => {
    expect(back(at({ step: 'confirm', pw: 'hunter22', cf: 'x', err: true }))).toEqual(at({ step: 'pw', pw: 'hunter22' }));
    expect(back(at({ step: 'pw', pw: 'hunter22' }))).toEqual(at({ step: 'email', pw: 'hunter22' }));
    expect(back(at({}))).toEqual(at({}));
  });
});

describe('reduce', () => {
  it('edits fields; typing a confirmation clears err; eye toggles; reset restores the initial state', () => {
    let s = reduce(initialAuth(), { type: 'email', value: 'sam@recallhub.app' });
    s = reduce(s, { type: 'next' });
    s = reduce(s, { type: 'pw', value: 'hunter22' });
    s = reduce(s, { type: 'next' });
    s = reduce(s, { type: 'cf', value: 'hunter2x' });
    s = reduce(s, { type: 'next' });
    expect(s.err).toBe(true);
    s = reduce(s, { type: 'cf', value: 'hunter2' });
    expect(s.err).toBe(false);
    expect(reduce(s, { type: 'toggleEye' }).eye).toBe(true);
    expect(reduce(s, { type: 'back' }).step).toBe('pw');
    expect(reduce(s, { type: 'reset' })).toEqual(initialAuth());
  });
});

describe('arrows', () => {
  it('follow the source visibility rules', () => {
    expect(emailArrow(at({ email: 'sam@recallhub.app' }))).toBe(true);
    expect(emailArrow(at({ step: 'pw', email: 'sam@recallhub.app' }))).toBe(false);
    expect(pwArrow(at({ step: 'pw', pw: 'hunte' }))).toBe(false);
    expect(pwArrow(at({ step: 'pw', pw: 'hunter' }))).toBe(true);
    expect(cfArrow(at({ step: 'confirm', cf: 'hunter22' }))).toBe(true);
    expect(cfArrow(at({ step: 'confirm', cf: 'hunt' }))).toBe(false);
  });
});
