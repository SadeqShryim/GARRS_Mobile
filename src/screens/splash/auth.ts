// design/Splash.dc.html — the logic class's next() / back() / renderVals() for the auth steps, as pure functions.
export type Step = 'email' | 'pw' | 'confirm';
export type AuthState = { step: Step; email: string; pw: string; cf: string; eye: boolean; err: boolean };
export type AuthAction =
  | { type: 'email'; value: string }
  | { type: 'pw'; value: string }
  | { type: 'cf'; value: string }
  | { type: 'toggleEye' }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'reset' };
export type AuthStep = { state: AuthState; done: boolean };

export const initialAuth = (): AuthState => ({ step: 'email', email: '', pw: '', cf: '', eye: false, err: false });
export const emailOk = (email: string) => /\S+@\S+\.\S+/.test(email);

// design: next()
export function next(s: AuthState): AuthStep {
  if (s.step === 'email') return { state: emailOk(s.email) ? { ...s, step: 'pw' } : s, done: false };
  if (s.step === 'pw') return { state: s.pw.length >= 6 ? { ...s, step: 'confirm', err: false } : s, done: false };
  if (s.cf.length < 6) return { state: s, done: false };
  return s.cf === s.pw ? { state: s, done: true } : { state: { ...s, err: true }, done: false };
}

// design: back()
export function back(s: AuthState): AuthState {
  if (s.step === 'confirm') return { ...s, step: 'pw', cf: '', err: false };
  if (s.step === 'pw') return { ...s, step: 'email' };
  return s;
}

export function reduce(s: AuthState, a: AuthAction): AuthState {
  switch (a.type) {
    case 'email': return { ...s, email: a.value };
    case 'pw': return { ...s, pw: a.value };
    case 'cf': return { ...s, cf: a.value, err: false };
    case 'toggleEye': return { ...s, eye: !s.eye };
    case 'next': return next(s).state;
    case 'back': return back(s);
    case 'reset': return initialAuth();
  }
}

// design: emailArrow / pwArrow / cfArrow
export const emailArrow = (s: AuthState) => s.step === 'email' && emailOk(s.email);
export const pwArrow = (s: AuthState) => s.pw.length >= 6;
export const cfArrow = (s: AuthState) => s.cf.length >= 6;
