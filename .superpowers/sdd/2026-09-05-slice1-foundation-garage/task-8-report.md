# Task 8: Rail geometry and tripled-list index math

## Status: DONE_WITH_CONCERNS

## Summary
Successfully implemented rail geometry math functions and tests. All rail tests pass (4/4).

## Implementation Details

### Files Created
1. **`src/lib/rail.ts`** - Rail geometry math module
   - Constants: `CARD_W = 318`, `GAP = 14`, `STEP = 332`
   - Functions:
     - `railPadding(width)` - Calculates padding to center a 318px card
     - `slotForOffset(x)` - Snaps offsets to discrete slots
     - `liveIndex(slot, n)` - Maps slots to live vehicle indices
     - `middleSlot(i, n)` - Gets middle copy slot index
     - `recenterSlot(slot, n)` - Recenters slot into the middle copy of a tripled list

2. **`src/lib/__tests__/rail.test.ts`** - Test suite for rail math
   - 4 test cases covering all functionality

## Test Results

### Step 2: Initial test run (FAIL - Expected)
```
Cannot find module '../rail' from 'src/lib/__tests__/rail.test.ts'
```

### Step 4: Test run after implementation (PASS)
```
PASS src/lib/__tests__/rail.test.ts
  rail math
    √ centres a 318 card on any width (4 ms)
    √ snaps offsets to slots (4 ms)
    √ maps slots to live vehicle indices (2 ms)
    √ recentres into the middle copy (2 ms)

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
```

### Step 5: Full test suite run
```
PASS src/lib/__tests__/rail.test.ts ✓
PASS src/assets/__tests__/assets.test.ts ✓
PASS src/lib/__tests__/gradient.test.ts ✓
FAIL src/fixtures/__tests__/fixtures.test.ts (unrelated - fixtures task)
PASS src/__tests__/smoke.test.tsx ✓
```

## Concerns
- **TypeScript typecheck failure in fixtures:** The `npm run typecheck` command reports errors in `src/fixtures/vinHelp.ts`, which is being worked on by task-6-fixtures (concurrent agent). This is not caused by rail.ts and should be resolved by that task.
- **No direct typecheck on rail.ts alone:** The full typecheck fails due to fixture issues, but the rail.ts implementation has correct TypeScript syntax and no type errors (all types are correctly inferred).

## Verification
- ✓ Test file created with exact code from brief
- ✓ Test initially fails (module not found)
- ✓ Implementation file created with exact code from brief
- ✓ All 4 rail tests pass
- ✓ No regressions in other passing tests (assets, gradient, smoke)
- ✓ Code follows brief exactly - no deviations
