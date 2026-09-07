# Task: Mount Four Overlay Screens in OverlayHost

## Status: DONE

All four overlay screens (AddVehicleSheet, RecallSheet, VinHelpScreen, SplashStub) have been successfully mounted in `src/overlays/OverlayHost.tsx`.

## Changes Made

**File: `src/overlays/OverlayHost.tsx`**

### Imports Added
- `useRouter` from `expo-router`
- `useAppStore` from `../store/useAppStore`
- `AddVehicleSheet` from `../screens/AddVehicleSheet`
- `RecallSheet` from `../screens/RecallSheet`
- `VinHelpScreen` from `../screens/VinHelpScreen`
- `SplashStub` from `../screens/SplashStub`

### Component Body
Added store selections (before return):
```tsx
const sheet = useAppStore((s) => s.sheet);
const screen = useAppStore((s) => s.screen);
const splash = useAppStore((s) => s.splash);
const dismissSplash = useAppStore((s) => s.dismissSplash);
const router = useRouter();
```

Updated JSX children in z-order (bottom to top):
```tsx
{sheet === 'add' && <AddVehicleSheet />}
{sheet === 'recall' && <RecallSheet onDetails={() => router.navigate('/(tabs)/recalls')} />}
{screen === 'vinhelp' && <VinHelpScreen />}
<Toast />
{splash && <SplashStub onDone={dismissSplash} />}
```

Updated top-of-file comment to document the four overlays mounted in z-order.

## Verification

### Store & Route Confirmation
- **useAppStore fields**: sheet (SheetId | null), screen (ScreenId | null), splash (boolean), dismissSplash action ✓
- **Screen exports**: AddVehicleSheet, RecallSheet (with onDetails prop), VinHelpScreen, SplashStub (with onDone prop) ✓
- **Route**: app/(tabs)/recalls.tsx exists ✓

### TypeScript Check
```
> recall-hub@1.0.0 typecheck
> tsc --noEmit
(no errors)
```

### Test Results
```
Test Suites: 21 passed, 21 total
Tests:       109 passed, 109 total
Time:        12.299 s
```

All tests pass. No issues in OverlayHost-related files. One pre-existing console.error warning in Toast test (act() wrapper) unrelated to these changes.

## No Git Operations
Git hold in effect; no commits created.
