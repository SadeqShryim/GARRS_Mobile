# Task 11 report — Concierge chat screen

**Status:** DONE

## Files created

- `src/screens/profile/ChatScreen.tsx`
- `src/screens/profile/__tests__/ChatScreen.test.tsx`

## Gate

- `npm test -- ChatScreen`: **4/4 passed** (`ChatScreen` suite), after the deviation below.
- Full `npm test`: **243/248 passed, 5 failed**, across **41/44 suites passed, 3 failed**. `ChatScreen.test.tsx` is among the passing suites. All 5 failures are in other implementers' files, not mine:
  - `src/screens/hub/__tests__/hub.test.tsx` (3 failures — text-glyph lookups and an auto-advance timer count)
  - `src/screens/hub/__tests__/ArticleReader.test.tsx` (1 failure — swipe-gesture article index)
  - `src/screens/profile/__tests__/profile.test.tsx` (1 failure — duplicate "All Clear" text; this is the concurrent implementer's `ProfileScreen.tsx`/`MembershipScreen.tsx`/`PlanCard.tsx` work, not `ChatScreen.tsx`)
  - Per the task rules, these were left untouched.
- `npm run typecheck`: **2 errors**, both pre-existing/other-implementer files, neither touching mine:
  - `src/screens/recalls/RecallsScreen.tsx:86` — `router.navigate` pathname literal `/(tabs)/recalls/[id]` not in the route union
  - `src/screens/service/ReasonSheet.tsx:48` — same pathname literal issue
  - Left untouched per the task rules.

## Deviations

- **`ChatScreen.tsx`, `reveal()` callback:** the brief's code scheduled every `revealPlan` step — including the first one, whose `at` is `0` (the "them: typing now" first frame) — via `setTimeout(fn, step.at)`. Under Jest fake timers, a `setTimeout(fn, 0)` never fires until timers are explicitly advanced, so immediately after `render(<ChatScreen />)` the screen still showed the pre-reveal state (typing false, "Online · replies in minutes") instead of "Typing…" — failing both the brief's first test (`opens typing, reveals the script...`) and its "Replay restarts the script" test (same assertion right after `reveal()` runs) with `Unable to find an element with text: Typing…`.
  - Fix: in the `for (const step of revealPlan(CHAT_SCRIPT))` loop, when `step.at === 0` apply `setShown`/`setTyping` synchronously instead of going through `setTimeout`; all other steps are still scheduled with `setTimeout(fn, step.at)` exactly as written. This matches the `lib/chat.ts` comment ("them: typing now → shown after 1200 → 900 before the next") — the first frame is meant to be immediate, not a same-tick zero-delay timer.
  - No other lines changed; the rest of `ChatScreen.tsx` and all of `ChatScreen.test.tsx` are verbatim from the brief.

## Deferred steps

None — both files listed under **Files** are complete and gated.

## Concerns

- None for this task's own files. The full-tree gate failures listed above (hub, ArticleReader, profile) belong to concurrently-edited files outside this task's scope and are reported here only as required by the brief's rules, not addressed.
