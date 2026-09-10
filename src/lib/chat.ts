import type { ChatMessage } from '../fixtures/types';

// One entry per state change of revealChat(): `at` ms after the reveal starts, `shown` messages visible, `typing` indicator on.
// them: typing now → shown after 1200 → 900 before the next; me: shown after 320 → 500 before the next.
export type RevealStep = { at: number; shown: number; typing: boolean };
export function revealPlan(script: ChatMessage[]): RevealStep[] {
  const steps: RevealStep[] = [];
  let t = 0;
  script.forEach((m, i) => {
    if (m.from === 'them') {
      steps.push({ at: t, shown: i, typing: true });
      t += 1200;
      steps.push({ at: t, shown: i + 1, typing: false });
      t += 900;
    } else {
      t += 320;
      steps.push({ at: t, shown: i + 1, typing: false });
      t += 500;
    }
  });
  return steps;
}
export const SEND_REPLY_DELAY = 1400;
