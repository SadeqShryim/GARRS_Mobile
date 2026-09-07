# Task 21 Report: Splash stub

## Summary
Implemented a tap-to-continue splash stub screen that serves as a placeholder for the real splash screen (Slice 6). The component displays the Recall Hub mark with a rotating metal gradient, copy text, and calls an `onDone` callback when tapped anywhere.

## Implementation

### Files Created
1. `src/screens/SplashStub.tsx` — The splash stub component
2. `src/screens/__tests__/SplashStub.test.tsx` — Test suite

### Code Matching
Both files match the brief exactly:
- SplashStub.tsx: 35 lines, all imports, constants, animations, and JSX match verbatim
- SplashStub.test.tsx: 12 lines, exact test with assertions for "RECALL HUB", "TAP ANYWHERE TO CONTINUE", and onDone callback

## TDD Evidence

### Step 1-2: RED (Test Fails)
```
Command: npm test -- SplashStub
Output: Cannot find module '../SplashStub' from 'src/screens/__tests__/SplashStub.test.tsx'
Test Suites: 1 failed, 1 total
```

### Step 3: Write Component
Created SplashStub.tsx with full implementation including:
- useSharedValue + useAnimatedStyle for metal gradient rotation
- LinearGradient background on the tile
- Mono text components for "RECALL HUB" and "TAP ANYWHERE TO CONTINUE"
- Pressable wrapper with accessibilityLabel="Continue"
- Safe area insets for bottom text positioning

### Step 5: GREEN (All Tests Pass)
```
Command: npm test -- SplashStub
Result: ✓ shows the mark and calls onDone on tap (205 ms)
Test Suites: 1 passed, 1 total
Tests: 1 passed, 1 total
```

### Full Test Suite
```
Command: npm test
Result:
  Test Suites: 21 passed, 21 total
  Tests: 109 passed, 109 total
  SplashStub.test.tsx: PASS
  (All other concurrent task tests also passing)
```

### Typecheck
```
Command: npm run typecheck
Result: No errors (clean output)
```

## Deviations from Brief

### Intentional (Per Instructions)
- **Skipped Step 4 (Mount in OverlayHost.tsx)** — As instructed in task context: "Do NOT edit OverlayHost.tsx. Skip the brief's Step 4 entirely." Controller will mount all overlay screens together in fixed z-order. Test renders component directly.
- **Skipped Step 6 (Emulator verification)** — Per context: "No emulator is available this session; list as deferred."
- **Skipped Step 7 (Git commit)** — Per context: "GIT IS ON HOLD by the user: do NOT run git init/add/commit."

### None Found
All code in SplashStub.tsx and test matches the brief exactly, byte-for-byte. Text strings verified for Unicode precision:
- "RECALL HUB" (no special characters)
- "TAP ANYWHERE TO CONTINUE" (no special characters)
- All color values, sizes, durations match tokens

## Self-Review

✓ Component exports correctly from src/screens/SplashStub.tsx  
✓ Test import path is correct (../SplashStub)  
✓ All required imports present (LinearGradient, Animated, Icon, Mono, tokens)  
✓ Component prop contract matches brief: `{ onDone: () => void }`  
✓ Metal gradient rotation uses dur.metalIdle (7000ms) and Easing.linear  
✓ Accessibility label "Continue" is discoverable by test via getByLabelText  
✓ Text assertions use exact case: "RECALL HUB" and "TAP ANYWHERE TO CONTINUE"  
✓ Color values match tokens: color.splash (#08080A)  
✓ Safe area insets correctly applied to bottom positioning  
✓ StyleSheet.absoluteFill used (not absoluteFillObject, per environment notes)  
✓ No extra features; implementation is minimal and focused  
✓ Only two files touched (component + test); OverlayHost left untouched  

## Deferred Steps

1. **Step 6: Emulator verification** — Cannot verify on-device appearance and frame rate (no emulator available this session). Verification deferred to controller's manual testing.

## Concerns

None. All tests pass, typecheck clean, code matches brief exactly. Component is ready for integration when controller mounts it in OverlayHost alongside other concurrent overlay screens.
