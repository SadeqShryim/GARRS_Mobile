# Task 4 brief — Slice 2 (Splash)

Extracted verbatim from `docs/superpowers/plans/2026-09-09-slice2-splash.md`. The spec `docs/superpowers/specs/2026-09-09-slice2-splash-design.md` is the binding authority; the source of truth for every measurement is `design_handoff_recall_hub/design/Splash.dc.html` (measured DOM in `docs/reference/splash-geometry.json`).

## Rules for this task
- Work in `C:\GarrsMobile`. **Do not run git. Do not install packages. Do not download anything.**
- Transcribe the code in this brief exactly. Deviate only when something does not compile or pass, keep the deviation minimal, and state exactly what you changed and why in the report.
- Copy strings come from `src/fixtures/splash.ts` (`COPY`); never retype a string in a component.
- Only create/modify the files listed under **Files**. Other tasks may be editing other files at the same time; if the full-tree gate fails inside a file that is not yours, say so in the report and do not touch it.
- Gate: run your own suites first (`npm test -- <pattern>`), then the full `npm test && npm run typecheck` before reporting.
- Environment: Windows 11 x64, Node 24, npm 11, Expo SDK 57, RN 0.86, Reanimated 4.5, jest-expo 57, TypeScript 6 strict; `tsconfig` types = jest + node; use `StyleSheet.absoluteFill` (there is no `absoluteFillObject`). Skia and Instrument Serif are already installed.
- Report: write `.superpowers/sdd/2026-09-09-slice2-splash/task-4-report.md` with: **Status** (DONE / DONE_WITH_CONCERNS / BLOCKED), files created/modified, the test and typecheck output summary (numbers), deviations from the brief, deferred steps, concerns.

---

### Task 4: Auth step logic

**Files:**
- Create: `src/screens/splash/auth.ts`, `src/screens/splash/__tests__/auth.test.ts`

**Interfaces:**
- Produces: `AuthState`, `AuthAction`, `initialAuth()`, `emailOk`, `next(s) → { state, done }`, `back(s)`, `reduce(s, a)`, `emailArrow/pwArrow/cfArrow(s)`. `AuthPanel` (Task 6) is a thin view over these.

- [ ] **Step 1: Write the failing test** `src/screens/splash/__tests__/auth.test.ts`

```ts
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
```

- [ ] **Step 2: Run** `npm test -- auth` → FAIL.

- [ ] **Step 3: Write `src/screens/splash/auth.ts`**

```ts
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
```

- [ ] **Step 4: Run** `npm test -- auth && npm run typecheck` → PASS.

- [ ] **Step 5: Checkpoint** — "feat: splash auth step logic"

