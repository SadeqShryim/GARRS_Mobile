# Task 7: Derivations — Report

## What was done

Implemented pure derivation functions for vehicle metrics and status information by creating two files:

1. **`src/lib/__tests__/derive.test.ts`** — Complete test suite with 13 test cases covering:
   - Fleet line summaries and vehicle counters
   - VIN validation, masking, and decoding
   - Comprehensive stats generation for vehicles with and without recalls

2. **`src/lib/derive.ts`** — Implementation with:
   - `isOpenRecall(v, scheduled)` — checks if a vehicle has an open recall
   - `recallCount(vs, scheduled)` — counts open recalls in a fleet
   - `fleetLine(vs, scheduled)` — generates fleet summary string
   - `counter(idx, n)` — zero-padded index counter
   - `vinOk(raw)` — validates VIN length (11+ chars)
   - `maskVin(raw)` — masks VIN to last 6 characters
   - `decodeVin(raw)` — decodes VIN or returns fallback
   - `statsFor(v, scheduled)` — comprehensive vehicle stats with tiles and service rows

## Results

### RED → GREEN

- **Step 1**: Created failing test file → Jest cannot find module error ✓
- **Step 2**: `npm test -- derive` → RED (module not found)
- **Step 3**: Transcribed implementation from brief exactly
- **Step 4**: `npm test -- derive` → **GREEN** (13/13 tests pass)

### Full validation

```
npm test
================
PASS src/lib/__tests__/rail.test.ts
PASS src/assets/__tests__/assets.test.ts
PASS src/lib/__tests__/derive.test.ts
PASS src/lib/__tests__/gradient.test.ts
PASS src/__tests__/smoke.test.tsx
PASS src/fixtures/__tests__/fixtures.test.ts

Test Suites: 6 passed, 6 total
Tests:       70 passed, 70 total
```

```
npm run typecheck
================
tsc --noEmit
(No output = no errors)
```

## Files created

- `C:\GARRS_Mobile\src\lib\derive.ts` — 61 lines
- `C:\GARRS_Mobile\src\lib\__tests__\derive.test.ts` — 58 lines

## Implementation details

The `statsFor` function synthesizes a `Stats` object containing:
- **Header fields**: name, metaUpper (formatted metadata with VIN), word (health descriptor)
- **Recall info**: hasRecall, recallCode, recallTitle, clearTitle, clearMeta
- **Visual indicators**: gaugeColor (health-based), summary (open recall vs. all clear)
- **Tiles**: Array of 4 service status cards (odometer, oil, tire, battery)
- **Service rows**: Array of 3 service items with percentage progress and tone color

Colors and thresholds are data-driven from vehicle health and service intervals:
- Health >= 90 → Excellent (#01a08c), >= 80 → Good (#01a08c), >= 65 → Fair (#0F638F), < 65 → Needs work (#D0021B)
- Service tone: red (#D0021B) if due <= bad threshold, orange (#c98a1f) if <= warn, green (#01a08c) otherwise

All numeric formatting uses `toLocaleString('en-US')` for thousands separators.

## Checkpoint

✓ All tests pass  
✓ TypeScript clean  
✓ No git operations (per rules)
