# Slice 3 — The rest of the app: Implementation Plan

> **For agentic workers:** subagent-driven, one fresh implementer per task, no reviewer dispatches (user ruling from Slice 1). Steps use checkbox (`- [ ]`) syntax for tracking. Dispatch from the extracted `task-N-brief.md` in `.superpowers/sdd/2026-09-10-slice3-app-tabs/`, never by pasting this file. This plan is assembled from those briefs (the briefs are the originals).

**Goal:** Port everything the design still had as a stub — the Recalls tab and recall detail, the Service tab (tilt map, reason sheet, confirmation), the Hub tab (auto-advancing article rail, 20 dashboard lights, light sheet, swipeable article reader) and the Profile tab (toggles, membership screen, concierge chat) — pixel-faithfully, in Expo Go on the S24 Ultra, with every cross-link wired.

**Architecture:** spec §4. Tabs stay expo-router `<Tabs>`; the recall detail is a stack route inside the recalls tab (swaps in place like stats); every overlay renders in `OverlayHost` in the source's z-order; store fields mirror the design's state; pure derivations live in `src/lib/*`; new primitives are `StatusChip`, `Toggle`, `ShineBorder`, `SheetShell`, `InfiniteRail` (the garage rail generalised), `TiltMap`.

**Spec:** `docs/superpowers/specs/2026-09-10-slice3-app-tabs-design.md` — binding; it cites `design_handoff_recall_hub/design/GaragePrototype.dc.html` and `docs/reference/app-*.png` / `app-geometry.json`, which win over both documents.

## Global Constraints

- **Fidelity first.** Values are the design's, in dp, unscaled. Never "improve" spacing, copy, colours, timing, or easing. Where a platform cannot match, match intent and record the gap in `docs/reference/verification.md` (Task 13).
- **Copy is verbatim** from the fixtures — never retype a string a fixture exports.
- **Target device:** Samsung S24 Ultra (Android 14+, ~412 dp, 120 Hz). Emulator proxy: AVD `s24ultraProxy`. Layout derives from `useWindowDimensions()`, never from 430 × 932.
- **Fonts / text:** every `Text` goes through `Sans` / `Mono` (`src/ui/Txt.tsx`). **Icons:** Remixicon names without `ri-`.
- **Overlays** render in `OverlayHost` as absolute siblings of the navigator. Never RN `<Modal>`.
- **Reanimated** for every CSS transition/keyframe; gesture-handler for the article swipe; `expo-sensors` for the tilt map.
- **Tests:** jest-expo + RNTL; `expo-router`, `expo-sensors` and gesture-handler are mocked globally in `jest.setup.ts` (Task 1). The gate after every task is `npm test && npm run typecheck`, re-run by the controller.
- **Git:** allowed. Implementers do **not** run git (tasks run in parallel); the controller commits after verifying each task with the checkpoint message.
- **No downloads** beyond `expo-sensors` (installed by the controller before the plan was written).

## Dependency order

- Task 1 first. Then Tasks 2 and 4 in parallel (both need only 1). Then Tasks 3 (needs 2) and 5 (needs 1, 2). Then Tasks 6, 7, 8, 9, 10, 11 in parallel (all need 3 + 4; 7 needs 5). Then Task 12 (needs 7–11). Task 13 is the controller's emulator pass; Task 14 the phone.

---
### Task 1: Fixtures, types, tokens, jest mocks, shine assets

**Files:**
- Create: `src/fixtures/articles.ts`, `src/fixtures/lights.ts`, `src/fixtures/chat.ts`, `src/fixtures/profile.ts`, `src/fixtures/service.ts`, `src/fixtures/recalls.ts`, `src/fixtures/__tests__/slice3.test.ts`
- Modify: `src/fixtures/types.ts` (append), `src/theme/tokens.ts` (append to `color`, `ease`, `dur`, `layout`), `jest.setup.ts` (append), `scripts/bake-assets.mjs` (append) → generates `src/assets/images/shine-plus.png`, `src/assets/images/shine-caution.png`

**Interfaces:**
- Produces every fixture and type in spec §5, the tokens in spec §6, the `shine-*.png` assets, and global jest mocks for `expo-sensors`, `expo-router` and gesture-handler.
- **Every string below is verbatim from the source (lines 1016–1225, 1434–1451). Do not "fix" spelling, punctuation, curly apostrophes (’) or dashes (—).** Icon names drop the `ri-` prefix.

- [ ] **Step 1: Append to `src/fixtures/types.ts`**

```ts
// Slice 3 — GaragePrototype.dc.html lines 1016–1225, 1431–1451
export type RecallState = 'open' | 'scheduled' | 'closed';
export type RecallFilter = RecallState;
export type RecallItem = { id: string; vid: number; code: string; title: string; severity: string; remedy: string; dealer: string; est: string; done: string; state: RecallState };
export type HistoryItem = Omit<RecallItem, 'state'>;
export type Reason = { why: string; facts: [string, string][]; steps: [string, string][]; note: string };
export type StateMeta = { label: string; chipBg: string; chipFg: string; icon: string; status: string };
export type ArticleBlock = { heading?: string; text: string };
export type Article = { id: string; kicker: string; icon: string; read: string; date: string; wash: [string, string]; title: string; dek: string; body: ArticleBlock[] };
export type LightGroup = 'critical' | 'warning' | 'info';
export type LightFilter = 'all' | LightGroup;
export type Light = { id: string; group: LightGroup; name: string; short: string; icon: string; tone: string; glyph?: string; means: string; action: string };
export type ChatFrom = 'them' | 'me';
export type ChatMessage = { from: ChatFrom; content: string };
export type PlanId = 'standard' | 'plus' | 'pro';
export type Plan = { id: PlanId; name: string; price: string; cta: string; recommend?: boolean; features: [string, 0 | 1][] };
export type SvcMethod = 'dropoff' | 'concierge';
export type SvcMethodDef = { key: SvcMethod; label: string; icon: string };
export type SvcDate = { day: string; date: string };
export type ActivityItem = { color: string; title: string; detail: string };
export type TrackerState = 'done' | 'active' | 'pending';
```

- [ ] **Step 2: `src/fixtures/articles.ts`** (source line 1016; `wash` = the two 135deg stops)

```ts
import type { Article } from './types';

export const ARTICLES: Article[] = [
  {
    id: 'a1', kicker: 'RECALL BASICS', icon: 'alarm-warning-line', read: '4 MIN READ', date: 'FEB 2026',
    wash: ['#2E93C4', '#0B4E73'],
    title: 'What actually happens after a recall is issued',
    dek: 'From the manufacturer filing a 573 report to the letter landing in your mailbox.',
    body: [
      { text: 'A recall starts when a manufacturer, or NHTSA, determines a vehicle or piece of equipment has a defect that creates an unreasonable safety risk, or fails to meet a federal safety standard.' },
      { heading: 'The filing', text: 'Within five working days the manufacturer files a defect and noncompliance report — the Part 573 report — naming the affected build range, the defect, and the remedy. This is the document that gives your recall its NHTSA campaign number.' },
      { heading: 'The notice', text: 'Owners of record are notified by first-class mail within 60 days. If you bought the car used, or moved, that letter may never reach you. This is the single most common reason open recalls go unrepaired.' },
      { heading: 'The remedy', text: 'The manufacturer must repair, replace, refund, or in rare cases repurchase, at no cost to you. There is no expiry on a safety recall remedy for the original defect.' },
      { heading: 'Why it stays open', text: 'A recall clears against your VIN only when a franchised dealer performs the work and files it. An independent shop doing the same repair does not close the campaign.' },
    ],
  },
  {
    id: 'a2', kicker: 'MAINTENANCE', icon: 'oil-line', read: '3 MIN READ', date: 'JAN 2026',
    wash: ['#C98A1F', '#8A5A0C'],
    title: 'Oil intervals: why the sticker and the manual disagree',
    dek: 'Quick-lube shops still write 3,000 miles. Your manufacturer usually does not.',
    body: [
      { text: 'Full synthetic oil and closed-loop engine management moved most modern service intervals to somewhere between 7,500 and 10,000 miles. The windshield sticker rarely reflects that.' },
      { heading: 'Read the manual, not the sticker', text: 'Your maintenance schedule is defined by the manufacturer and tied to warranty coverage. A shorter interval costs you money; a longer one can cost you a claim.' },
      { heading: 'Severe service is not unusual', text: 'Short trips under ten minutes, towing, extended idling, dusty roads and sustained cold all put a vehicle on the severe schedule — which is typically half the normal interval.' },
      { heading: 'Oil life monitors', text: 'Systems that estimate remaining oil life from load, temperature and revolutions are generally more accurate than a fixed mileage figure. Reset the monitor at every change or it drifts.' },
    ],
  },
  {
    id: 'a3', kicker: 'TYRES', icon: 'loader-2-line', read: '3 MIN READ', date: 'DEC 2025',
    wash: ['#3F3F46', '#18181B'],
    title: 'Reading a tyre sidewall in thirty seconds',
    dek: 'Size, load, speed rating and the four digits that tell you its age.',
    body: [
      { text: 'Every legal tyre carries its full specification moulded into the sidewall. Four things matter for day-to-day ownership.' },
      { heading: 'The size code', text: 'In 225/45R18 95Y, 225 is the section width in millimetres, 45 is the sidewall height as a percentage of that width, R is radial construction, and 18 is the wheel diameter in inches.' },
      { heading: 'Load and speed', text: '95 is the load index, roughly 690 kg per tyre. Y is the speed rating. Fitting a lower rating than the placard on your door jamb specifies is a failure point at inspection.' },
      { heading: 'The DOT date', text: 'Find the DOT code and read the last four digits: week, then year. 2224 means the 22nd week of 2024. Most manufacturers consider a tyre finished at six years regardless of tread depth.' },
      { heading: 'Pressure', text: 'The correct cold pressure is on the door jamb placard, never the tyre sidewall — the sidewall figure is a maximum, not a recommendation.' },
    ],
  },
  {
    id: 'a4', kicker: 'ELECTRIC', icon: 'battery-charge-line', read: '4 MIN READ', date: 'NOV 2025',
    wash: ['#01a08c', '#046056'],
    title: 'Battery health, degradation and what warranty covers',
    dek: 'Why the first year loses the most, and where the 70% floor comes from.',
    body: [
      { text: 'Lithium-ion packs lose capacity fastest early on, then settle into a slow linear decline. A pack that drops 3% in its first year may lose only 1 to 2% a year afterwards.' },
      { heading: 'What accelerates it', text: 'Sustained high state of charge, deep discharges, heat, and frequent DC fast charging. Keeping the pack between 20% and 80% for daily use is the single most effective habit.' },
      { heading: 'The warranty floor', text: 'Federal rules require eight years or 100,000 miles of coverage on EV traction batteries, and most manufacturers define failure as capacity falling below 70% of original.' },
      { heading: 'Reading your own number', text: 'Range estimates move with temperature and driving style. Compare usable kWh from a full charge against the original spec instead — that is the figure a warranty claim rests on.' },
    ],
  },
];
```

- [ ] **Step 3: `src/fixtures/lights.ts`** (source line 1069)

```ts
import type { Light } from './types';

export const LIGHTS: Light[] = [
  { id: 'l1', group: 'critical', name: 'Engine oil pressure', short: 'Oil pressure', icon: 'oil-fill', tone: '#D0021B',
    means: 'Oil pressure has dropped below the safe minimum. This is not a low oil level reminder — it means the oil is not circulating under enough pressure to protect the bearings.',
    action: 'Pull over as soon as it is safe and switch the engine off. Continuing to drive can destroy the engine within minutes. Check the level, then have it recovered rather than driven.' },
  { id: 'l2', group: 'critical', name: 'Coolant temperature', short: 'Overheating', icon: 'temp-hot-fill', tone: '#D0021B',
    means: 'The coolant has exceeded its normal operating temperature. Causes range from a low coolant level or failed thermostat to a dead cooling fan or water pump.',
    action: 'Stop, switch off, and let it cool for at least thirty minutes before opening anything. Never open a hot pressurised cap. Driving on risks a warped head or blown gasket.' },
  { id: 'l3', group: 'critical', name: 'Brake system', short: 'Brakes', icon: 'error-warning-fill', tone: '#D0021B', glyph: '',
    means: 'Either the parking brake is engaged, the brake fluid is low, or the hydraulic system has detected a fault. On many vehicles this light doubles for all three.',
    action: 'Confirm the parking brake is fully released. If it stays lit, test the pedal gently at low speed and have the system inspected before further driving.' },
  { id: 'l4', group: 'critical', name: 'Charging system', short: 'Battery', icon: 'battery-2-fill', tone: '#D0021B',
    means: 'The battery is no longer being charged — usually a failed alternator, a broken belt, or a bad connection. The car is running on stored charge only.',
    action: 'Switch off every load you can spare and drive straight to a shop, or stop somewhere safe. Expect the engine to cut out without warning once the battery is flat.' },
  { id: 'l5', group: 'critical', name: 'Airbag / SRS', short: 'Airbag', icon: 'alert-fill', tone: '#D0021B', glyph: '',
    means: 'The supplemental restraint system has logged a fault. The airbags or seat belt pretensioners may not deploy in a crash — or could deploy when they should not.',
    action: 'The car remains driveable but its occupant protection is compromised. Book a diagnostic scan; SRS faults are also a common recall subject worth checking.' },
  { id: 'l6', group: 'warning', name: 'Check engine', short: 'Check engine', icon: 'settings-2-fill', tone: '#C98A1F',
    means: 'The engine control unit has stored a fault code from anywhere in the powertrain or emissions system, from a loose fuel cap to a failing catalytic converter.',
    action: 'Steady light: get the code read within a week or so. Flashing: a misfire is dumping raw fuel into the exhaust — reduce speed and stop driving as soon as you can.' },
  { id: 'l7', group: 'warning', name: 'Tyre pressure (TPMS)', short: 'Tyre pressure', icon: 'alert-line', tone: '#C98A1F', glyph: '',
    means: 'At least one tyre is around 25% below its placard pressure. Cold snaps set this off routinely, but so does a slow puncture.',
    action: 'Check all four cold with a gauge and set them to the door jamb figure, not the sidewall maximum. If it returns within days, look for a leak.' },
  { id: 'l8', group: 'warning', name: 'ABS', short: 'ABS', icon: '', tone: '#C98A1F', glyph: 'ABS',
    means: 'The anti-lock braking system has faulted and switched itself off. Normal braking still works, but the wheels can lock under hard braking.',
    action: 'Leave extra following distance, especially in the wet, and avoid stamping on the pedal. Have the wheel speed sensors and module checked.' },
  { id: 'l9', group: 'warning', name: 'Traction / stability', short: 'Traction', icon: 'drizzle-line', tone: '#C98A1F',
    means: 'Flashing means the system is actively working to keep the car in line. Steady means stability control has been switched off or has failed.',
    action: 'Flashing on a slippery surface is normal — ease off. If it stays lit permanently, check whether it was turned off manually before booking a diagnosis.' },
  { id: 'l10', group: 'warning', name: 'Low fuel', short: 'Low fuel', icon: 'gas-station-fill', tone: '#C98A1F',
    means: 'The tank has fallen to its reserve, typically enough for 30 to 50 miles depending on the vehicle.',
    action: 'Refuel. Running a tank near dry pulls sediment through the pump and, in petrol cars, removes the fuel that cools it.' },
  { id: 'l11', group: 'warning', name: 'Diesel particulate filter', short: 'DPF', icon: 'cloudy-2-fill', tone: '#C98A1F',
    means: 'The particulate filter is loaded with soot and needs a regeneration cycle, which only completes at sustained speed and temperature.',
    action: 'Drive above 40 mph for twenty minutes if it is safe to do so. Repeated short trips will block the filter completely and turn a drive into a replacement.' },
  { id: 'l12', group: 'warning', name: 'Glow plug / wait to start', short: 'Glow plug', icon: 'loader-4-line', tone: '#C98A1F',
    means: 'On a diesel, the pre-heaters are warming the cylinders before start. If it comes on while driving, the glow plug system has a fault.',
    action: 'At start-up, wait for it to go out before cranking. If it appears while driving, expect hard cold starts and have the plugs tested.' },
  { id: 'l13', group: 'warning', name: 'Service due', short: 'Service', icon: 'tools-fill', tone: '#C98A1F',
    means: 'A time or distance interval in the maintenance schedule has been reached. It is a reminder, not a fault.',
    action: 'Book the service. Keeping to the schedule protects both the drivetrain and any warranty claim that depends on documented maintenance.' },
  { id: 'l14', group: 'warning', name: 'Door or boot ajar', short: 'Door ajar', icon: 'car-fill', tone: '#C98A1F',
    means: 'A door, bonnet or boot is not fully latched. Some vehicles also show which one on the cluster display.',
    action: 'Stop and close it properly. A latch that will not register may need adjusting or its switch replaced.' },
  { id: 'l15', group: 'info', name: 'Main beam', short: 'High beam', icon: 'sun-fill', tone: '#0F638F',
    means: 'The main beam headlights are on. A green or blue indicator means active; amber usually means the automatic high beam system is armed.',
    action: 'Dip them for oncoming traffic and when following another vehicle closely.' },
  { id: 'l16', group: 'info', name: 'Fog lights', short: 'Fog lights', icon: 'mist-fill', tone: '#01a08c',
    means: 'Front or rear fog lights are switched on. Rear fogs are usually shown in amber, fronts in green.',
    action: 'Use only in genuinely poor visibility. Rear fogs dazzle drivers behind you in clear conditions and are an offence in many places.' },
  { id: 'l17', group: 'info', name: 'Cruise control', short: 'Cruise', icon: 'speed-up-line', tone: '#01a08c',
    means: 'Cruise or adaptive cruise control is set and holding a speed. A greyed symbol means the system is available but not engaged.',
    action: 'Nothing required. Avoid using it on standing water, ice or a road busy enough to need constant speed changes.' },
  { id: 'l18', group: 'info', name: 'Seat belt reminder', short: 'Seat belt', icon: 'user-fill', tone: '#D0021B',
    means: 'A seated occupant has not buckled up, or a heavy object on a seat has triggered the occupancy sensor.',
    action: 'Belt up. If a bag on the passenger seat sets it off, move the bag to the footwell or boot.' },
  { id: 'l19', group: 'info', name: 'Washer fluid low', short: 'Washer fluid', icon: 'drop-line', tone: '#C98A1F',
    means: 'The screen wash reservoir has dropped to its reserve level.',
    action: 'Top up with a proper screen wash mix rather than plain water, which freezes and grows bacteria in the lines.' },
  { id: 'l20', group: 'info', name: 'Lane departure', short: 'Lane assist', icon: 'road-map-line', tone: '#0F638F',
    means: 'The lane keeping system is active. It flashes or vibrates the wheel when the car drifts across a marking without indicating.',
    action: 'Nothing required. The system needs clear markings and a clean camera — it disables itself quietly in snow or heavy rain.' },
];
```

- [ ] **Step 4: `src/fixtures/chat.ts`** (source lines 1140, 1755)

```ts
import type { ChatMessage } from './types';

export const CHAT_SCRIPT: ChatMessage[] = [
  { from: 'them', content: "Good afternoon, Alexander. I'm your Aegis concierge. I can see the open recall on your Model S Plaid — would you like me to handle it?" },
  { from: 'me', content: 'Yes please. What does the repair actually involve?' },
  { from: 'them', content: 'Firmware 2026.4.2 restores the rear camera feed on start-up. About 45 minutes at Tesla Service on Bay Street, no cost to you.' },
  { from: 'me', content: 'Can someone collect the car? I can’t take the morning off.' },
  { from: 'them', content: 'Pro membership includes concierge pick-up. I can have a driver at your address Thursday at 10:30 and returned by early afternoon.' },
  { from: 'me', content: 'That works. Book it.' },
  { from: 'them', content: "Booked. You'll get a confirmation and driver details in this thread, and the recall will clear once the dealer files the work against your VIN." },
];

export const CANNED_REPLY: ChatMessage = { from: 'them', content: 'Noted. A specialist will pick this up with your Model S Plaid record attached — expect a reply in this thread within the hour.' };

export const CHAT_COPY = {
  title: 'Aegis Concierge',
  online: 'Online · replies in minutes',
  typing: 'Typing…',
  replay: 'Replay',
  placeholder: 'Ask the concierge…',
} as const;
```

- [ ] **Step 5: `src/fixtures/profile.ts`** (source lines 1149, 1154, 1217; copy from lines 561–631, 757–796)

```ts
import type { ActivityItem, Plan } from './types';

export const USER = {
  name: 'Alexander Vance', email: 'alexander.vance@example.com', phone: '+1 (555) 019-8234',
  initials: 'AV', memberSince: 'Premium Member since 2022', plan: 'AEGIS PRO ACTIVE',
} as const;

export const ACTIVITY: ActivityItem[] = [
  { color: '#0F638F', title: 'System scan completed.', detail: 'TODAY, 08:30 AM' },
  { color: '#D0021B', title: 'Recall alert issued for Model S.', detail: 'YESTERDAY, 14:15 PM' },
  { color: '#9a99a2', title: 'Service record updated (Taycan).', detail: 'OCT 12, 2023' },
];

export const PLANS: Plan[] = [
  { id: 'standard', name: 'Standard', price: '$0', cta: 'Switch to Standard',
    features: [['1 vehicle monitored', 1], ['Monthly recall checks', 1], ['Real-time alerts', 0]] },
  { id: 'plus', name: 'Plus', price: '$9', cta: 'Upgrade to Plus', recommend: true,
    features: [['Up to 3 vehicles', 1], ['Weekly recall checks', 1], ['Real-time email alerts', 1]] },
  { id: 'pro', name: 'Pro', price: '$29', cta: 'Upgrade to Pro',
    features: [['Unlimited vehicles', 1], ['Continuous monitoring', 1], ['Push & SMS alerts', 1], ['Health analysis reports', 1]] },
];

export const PROFILE_COPY = {
  membership: 'Membership',
  account: 'Account Details',
  email: 'EMAIL', phone: 'PHONE',
  edit: 'Edit Profile',
  editToast: 'Profile editing stays local in this prototype',
  preferences: 'Preferences',
  toggles: ['Push Notifications', 'Email Alerts', 'Biometric Login'] as const,
  garage: 'My Garage',
  addVehicle: '+ ADD VEHICLE',
  activeRecall: '1 Active Recall', allClear: 'All Clear',
  concierge: 'Concierge Support',
  conciergeBody: 'Need assistance? Our Aegis specialists are available 24/7 for Pro members.',
  startChat: 'Start Chat',
  activity: 'Recent Activity',
  danger: 'Danger Zone',
  dangerBody: 'Permanently delete your account and remove all vehicle data.',
  deleteAccount: 'Delete Account',
  deleteToast: 'No account data is stored by this build',
} as const;

export const MEMBERSHIP_COPY = {
  caption: 'MEMBERSHIP',
  title: 'Select your protection level',
  sub: 'Choose the level of monitoring across your fleet. Change or cancel any time.',
  perMonth: '/month',
  recommend: 'Recommend',
  current: 'Current plan',
  billed: 'Billed monthly. Cancel any time from this screen.',
} as const;
```

- [ ] **Step 6: `src/fixtures/service.ts`** (source lines 1160–1166, 1607, 1651; copy from lines 370–531)

```ts
import type { SvcDate, SvcMethodDef, TrackerState } from './types';

export const SVC_DATES: SvcDate[] = [
  { day: 'MON', date: '12' }, { day: 'TUE', date: '13' }, { day: 'WED', date: '14' },
  { day: 'THU', date: '15' }, { day: 'FRI', date: '16' },
];
export const SVC_TIMES = ['08:00 AM', '09:30 AM', '11:00 AM', '01:00 PM', '02:30 PM', '04:00 PM'];
export const SVC_CENTER = { name: 'Prime Center', address: '1200 Technical Blvd', distance: '4.2 mi', coords: '37.7749° N, 122.4194° W' } as const;
export const SVC_METHODS: SvcMethodDef[] = [
  { key: 'dropoff', label: 'Drop-off', icon: 'car-line' },
  { key: 'concierge', label: 'Concierge', icon: 'home-4-line' },
];
export const TRACKER: { label: string; state: TrackerState }[] = [
  { label: 'Recall detected', state: 'done' },
  { label: 'Appointment confirmed', state: 'active' },
  { label: 'Repair pending', state: 'pending' },
];

export const SERVICE_COPY = {
  title: 'Schedule Service',
  sub: 'Select a time and location for your appointment.',
  routineReason: 'System Diagnostic & Update',
  routineRef: 'NHTSA-24V001',
  hintRecall: 'TAP FOR RECALL DETAILS',
  hintRoutine: 'ROUTINE MAINTENANCE VISIT',
  selectedCenter: 'SELECTED CENTER',
  change: 'Change',
  changeToast: 'Dealer map is not wired up here',
  live: 'LIVE', liveTilt: 'LIVE TILT',
  method: 'SERVICE METHOD',
  selectDate: 'SELECT DATE',
  times: 'AVAILABLE TIMES',
  confirm: 'Confirm Appointment',
  confirmed: 'Confirmed',
  scheduledSub: 'Your service request is scheduled.',
  dateTime: 'DATE & TIME', location: 'LOCATION',
  conciergePickup: 'Concierge pick-up', dropoff: 'Drop-off',
  tracker: 'STATUS TRACKER',
  returnToGarage: 'Return to Garage',
  activeRecall: 'ACTIVE SAFETY RECALL',
  continueBooking: 'Continue booking',
  fullRecall: 'Full recall',
} as const;
```

- [ ] **Step 7: `src/fixtures/recalls.ts`** (source lines 1168, 1174, 1434–1451; copy from lines 143–270)

```ts
import type { HistoryItem, Reason, RecallState, StateMeta } from './types';

export const HISTORY: HistoryItem[] = [
  { id: 'h1', vid: 1, code: 'NHTSA 23V-742', title: 'Front seat belt anchor torque', severity: 'Safety recall', remedy: 'Anchor re-torqued, free', dealer: 'Tesla Service — Fremont', est: '1 hour', done: 'Repaired 14 Mar 2025' },
  { id: 'h2', vid: 2, code: 'NHTSA 22V-118', title: 'Charge port firmware fault', severity: 'Safety recall', remedy: 'OTA software update', dealer: 'Over the air', est: '20 minutes', done: 'Repaired 02 Nov 2024' },
  { id: 'h3', vid: 3, code: 'NHTSA 21V-905', title: 'Fuel pump impeller inspection', severity: 'Safety recall', remedy: 'Pump replaced, free', dealer: 'Honda of Riverside', est: '3 hours', done: 'Repaired 27 Jun 2023' },
];

export const REASONS: Record<string, Reason> = {
  'NHTSA 24V-137': {
    why: 'The instrument display can fail to show the rear camera image while the vehicle is in reverse. Without that view the driver loses sight of anything directly behind the car, which raises the risk of a low-speed collision — and it puts the vehicle out of compliance with FMVSS 111 rear visibility requirements.',
    facts: [['SEVERITY', 'Safety recall'], ['UNITS AFFECTED', '125,227'], ['REPORTED', '12 Feb 2026'], ['COST TO YOU', 'None']],
    steps: [
      ['Software update', 'Firmware 2026.4.2 restores the camera feed on start-up. Installed over the air or at service.'],
      ['Display self-test', 'Technician confirms the rear view appears within two seconds of selecting reverse.'],
      ['Confirmation', 'Repair is filed with NHTSA against your VIN and the recall clears in this app.'],
    ],
    note: 'Until the update is applied, check behind the vehicle before reversing rather than relying on the screen.',
  },
  'NHTSA 23V-742': {
    why: 'Front seat belt anchor bolts may have left the plant below specified torque. An under-torqued anchor can loosen over time and would not restrain an occupant as designed in a crash.',
    facts: [['SEVERITY', 'Safety recall'], ['UNITS AFFECTED', '15,869'], ['REPORTED', '09 Jan 2025'], ['COST TO YOU', 'None']],
    steps: [
      ['Inspection', 'Both front anchors checked against the torque spec.'],
      ['Re-torque', 'Anchors tightened, or replaced if the threads were compromised.'],
      ['Confirmation', 'Work filed against your VIN on 14 Mar 2025.'],
    ],
    note: 'This repair is complete. Records are kept for resale and insurance purposes.',
  },
  'NHTSA 22V-118': {
    why: 'Charge port controller firmware could misread the pilot signal and keep the contactor closed after a fault, allowing the port to stay energised longer than intended during DC fast charging.',
    facts: [['SEVERITY', 'Safety recall'], ['UNITS AFFECTED', '43,000'], ['REPORTED', '18 Aug 2024'], ['COST TO YOU', 'None']],
    steps: [
      ['Over-the-air update', 'Controller firmware replaced with revision 1.4.7.'],
      ['Handshake test', 'Vehicle re-validates the charge handshake on the next session.'],
      ['Confirmation', 'Filed against your VIN on 02 Nov 2024.'],
    ],
    note: 'This repair is complete. No dealer visit was required.',
  },
  'NHTSA 21V-905': {
    why: 'Low-pressure fuel pump impellers could deform and bind, stalling the pump. An engine stall in traffic, without warning, increases crash risk.',
    facts: [['SEVERITY', 'Safety recall'], ['UNITS AFFECTED', '628,124'], ['REPORTED', '03 May 2023'], ['COST TO YOU', 'None']],
    steps: [
      ['Pump inspection', 'Impeller checked for swelling and drag.'],
      ['Replacement', 'Low-pressure pump assembly replaced with a revised part.'],
      ['Confirmation', 'Filed against your VIN on 27 Jun 2023.'],
    ],
    note: 'This repair is complete. The revised pump carries the same warranty as the original.',
  },
};

export const EMPTY_REASON: Reason = { why: '', facts: [], steps: [], note: '' };

// allRecalls(), line 1431 — the live recall's constant fields
export const LIVE_RECALL = {
  severity: 'Safety recall', remedy: 'Software update, free', dealer: 'Tesla Service — 6.2 mi', est: '45 minutes',
  doneScheduled: 'Booked Thu 10:30 AM', doneOpen: 'Reported 12 Feb 2026',
} as const;

// stateMeta(), line 1447
export const STATE_META: Record<RecallState, StateMeta> = {
  open: { label: 'OPEN', chipBg: '#D0021B', chipFg: '#ffffff', icon: 'alarm-warning-fill', status: 'ACTION REQUIRED' },
  scheduled: { label: 'SCHEDULED', chipBg: '#0F638F', chipFg: '#EAF7FF', icon: 'calendar-check-fill', status: 'REPAIR SCHEDULED' },
  closed: { label: 'RESOLVED', chipBg: 'rgba(0,0,0,0.06)', chipFg: '#3a3941', icon: 'checkbox-circle-fill', status: 'RESOLVED' },
};

export const RECALLS_COPY = {
  title: 'Recalls',
  heroOpenSub: 'A free remedy is available. Booking it clears the flag on your vehicle health score.',
  heroScheduledSub: 'Repair booked. The flag clears once the dealer files the work against your VIN.',
  heroClearSub: 'Every recall raised against your VINs has been repaired and filed.',
  heroClearTitle: 'Fleet is clear',
  emptyOpen: 'No open recalls across your fleet.',
  emptyScheduled: 'Nothing scheduled right now.',
  emptyClosed: 'No repair history yet.',
  seeDetails: 'See details',
  scheduleRepair: 'Schedule Repair',
  scheduledLabel: 'Scheduled Thu 10:30 AM',
  repairComplete: 'Repair complete',
  why: 'WHY THIS MATTERS',
  remedy: 'THE REMEDY',
  callToast: 'Calling the service centre is not wired up here',
  bookedToast: 'Service booked · Thu 10:30 AM',
} as const;
```

- [ ] **Step 8: Append to `src/theme/tokens.ts`** — add these members inside the existing `color`, `ease`, `dur` and `layout` objects (keep them `as const`):

```ts
  // Slice 3 — app tabs
  infoBg: '#E7F1F7', dangerBg: '#FBE9EB', dangerEdge: '#F0B9C0', dangerInk: '#7a5257',
  warnBadgeBg: '#FBE9CB', warnBadgeInk: '#7A5307', ink8: '#a3a2aa',
  hair10: 'rgba(0,0,0,0.10)', hair12: 'rgba(0,0,0,0.12)', hair20: 'rgba(0,0,0,0.20)', tint06: 'rgba(0,0,0,0.06)',
  chatTop: '#18181B', chatBottom: '#09090B', chatBubble: 'rgba(39,39,42,0.9)', chatField: 'rgba(39,39,42,0.5)',
  chatEdge: 'rgba(255,255,255,0.10)', chatHair: 'rgba(255,255,255,0.06)', chatDim: 'rgba(255,255,255,0.42)',
  chatMuted: 'rgba(255,255,255,0.6)', chatSendOff: 'rgba(255,255,255,0.3)', chatPlaceholder: 'rgba(255,255,255,0.45)', chatInk: '#F4F4F5',
  mapInk: 'rgba(23,22,26,0.25)', mapInk2: 'rgba(23,22,26,0.20)', mapInk3: 'rgba(23,22,26,0.10)', mapTint: 'rgba(23,22,26,0.05)',
  pinHalo: 'rgba(15,99,143,0.45)', doneRing: 'rgba(15,99,143,0.28)', doneGlow: 'rgba(15,99,143,0.14)',
```
```ts
  // Slice 3 — cubic-bezier(.22,1,.36,1) (article swipe, chat bubbles)
  swipe: [0.22, 1, 0.36, 1],
```
```ts
  // Slice 3
  swipe: 360, snap: 300, leave: 380, toggle: 220, tilt: 120, strip: 500, bubbleIn: 350, dotBob: 800, hubAuto: 5000, shine: 4000, filter: 200, map: 350, chatReply: 1400,
```
```ts
  // Slice 3
  shineBaked: 1024,
```
(`layout` currently ends with `blobBleed: 48`; add `shineBaked: 1024` after it.)

- [ ] **Step 9: Append to `jest.setup.ts`**

```ts
// Slice 3: gesture-handler's official jest setup (article swipe), expo-sensors (tilt map), expo-router hooks used by screens.
require('react-native-gesture-handler/jestSetup');

jest.mock('expo-sensors', () => ({
  DeviceMotion: {
    setUpdateInterval: jest.fn(),
    isAvailableAsync: jest.fn(async () => false),
    requestPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted' })),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

jest.mock('expo-router', () => {
  const React = require('react') as typeof import('react');
  const router = { navigate: jest.fn(), push: jest.fn(), back: jest.fn(), replace: jest.fn() };
  return {
    __esModule: true,
    router,
    useRouter: () => router,
    useIsFocused: () => true,
    useFocusEffect: (cb: () => void | (() => void)) => { React.useEffect(cb, []); },
    useLocalSearchParams: () => ({}),
    Stack: () => null,
    Tabs: () => null,
    Slot: () => null,
  };
});
```

- [ ] **Step 10: Append to `scripts/bake-assets.mjs`** (after the auth-blob loop at the end of the file)

```js
// --- Slice 3: shine borders (GaragePrototype.dc.html lines 764 and 377) ---
// conic-gradient(from 0deg, …) rotating 4 s linear behind the Plus plan card (blur 4) and the service caution card (blur 3).
// The source's last stop repeats the first; conic() appends ramp[0] itself, so the ramps below omit it.
// Baked at SHINE px square; ShineBorder scales the texture to ceil(hypot(w, h)) of the card (≈ 540 dp), so the blur is baked at ~2×.
const SHINE = 1024;
const SHINES = {
  plus: { ramp: ['#3b82f6', '#ef4444', '#2dd4bf'], blur: 4 },
  caution: { ramp: ['#D0021B', '#ffb741', '#D0021B', '#ffb741'], blur: 3 },
};
for (const [name, s] of Object.entries(SHINES)) {
  const png = conic(s.ramp, SHINE);
  blur(png, s.blur * 2);
  writeFileSync(`${OUT}/shine-${name}.png`, PNG.sync.write(png));
  console.log(`shine-${name}.png ${png.width}x${png.height}`);
}
```

Then run `npm run bake-assets` once. It regenerates every asset (identical bytes for the existing ones) and adds `shine-plus.png` and `shine-caution.png` (1024 × 1024) to `src/assets/images/`. If `git status` would show the pre-existing PNGs as modified, do not worry — the controller checks that.

- [ ] **Step 11: Write the test** `src/fixtures/__tests__/slice3.test.ts`

```ts
import glyphMap from '../../assets/remixicon.glyphmap.json';
import { ARTICLES } from '../articles';
import { CANNED_REPLY, CHAT_SCRIPT } from '../chat';
import { LIGHTS } from '../lights';
import { ACTIVITY, PLANS, USER } from '../profile';
import { HISTORY, LIVE_RECALL, REASONS, STATE_META } from '../recalls';
import { SVC_CENTER, SVC_DATES, SVC_METHODS, SVC_TIMES, TRACKER } from '../service';
import { color, dur, ease, layout } from '../../theme/tokens';

const glyphs = glyphMap as Record<string, number>;

describe('Slice 3 fixtures', () => {
  it('has four articles with washes, kickers and bodies', () => {
    expect(ARTICLES.map((a) => a.id)).toEqual(['a1', 'a2', 'a3', 'a4']);
    expect(ARTICLES[0].wash).toEqual(['#2E93C4', '#0B4E73']);
    expect(ARTICLES[1].title).toBe('Oil intervals: why the sticker and the manual disagree');
    expect(ARTICLES[2].body).toHaveLength(5);
    expect(ARTICLES[3].body[0].heading).toBeUndefined();
    expect(ARTICLES[3].body[1].heading).toBe('What accelerates it');
  });
  it('has twenty lights: 5 critical, 9 warning, 6 info; ABS is glyph-only', () => {
    expect(LIGHTS).toHaveLength(20);
    expect(LIGHTS.filter((l) => l.group === 'critical')).toHaveLength(5);
    expect(LIGHTS.filter((l) => l.group === 'warning')).toHaveLength(9);
    expect(LIGHTS.filter((l) => l.group === 'info')).toHaveLength(6);
    const abs = LIGHTS.find((l) => l.id === 'l8')!;
    expect(abs).toMatchObject({ icon: '', glyph: 'ABS', short: 'ABS', tone: '#C98A1F' });
    expect(LIGHTS.find((l) => l.id === 'l3')!.glyph).toBe('');
    expect(LIGHTS.find((l) => l.id === 'l18')!.tone).toBe('#D0021B');
  });
  it('every icon name used by the fixtures exists in the Remixicon glyph map', () => {
    const names = [
      ...ARTICLES.map((a) => a.icon), ...LIGHTS.map((l) => l.icon).filter(Boolean), ...SVC_METHODS.map((m) => m.icon),
      ...Object.values(STATE_META).map((m) => m.icon),
    ];
    for (const n of names) expect(glyphs[n]).toBeDefined();
  });
  it('keeps the chat script and canned reply verbatim', () => {
    expect(CHAT_SCRIPT).toHaveLength(7);
    expect(CHAT_SCRIPT.map((m) => m.from)).toEqual(['them', 'me', 'them', 'me', 'them', 'me', 'them']);
    expect(CHAT_SCRIPT[3].content).toBe('Can someone collect the car? I can’t take the morning off.');
    expect(CANNED_REPLY.content.startsWith('Noted. A specialist')).toBe(true);
  });
  it('profile: user, activity, three plans with Plus recommended', () => {
    expect(USER.initials).toBe('AV');
    expect(ACTIVITY).toHaveLength(3);
    expect(PLANS.map((p) => p.id)).toEqual(['standard', 'plus', 'pro']);
    expect(PLANS[1].recommend).toBe(true);
    expect(PLANS[2].features).toHaveLength(4);
    expect(PLANS[0].features[2]).toEqual(['Real-time alerts', 0]);
  });
  it('service: five dates, six times, the centre, two methods, three tracker steps', () => {
    expect(SVC_DATES.map((d) => d.date)).toEqual(['12', '13', '14', '15', '16']);
    expect(SVC_TIMES).toHaveLength(6);
    expect(SVC_CENTER.coords).toBe('37.7749° N, 122.4194° W');
    expect(SVC_METHODS[1]).toEqual({ key: 'concierge', label: 'Concierge', icon: 'home-4-line' });
    expect(TRACKER.map((t) => t.state)).toEqual(['done', 'active', 'pending']);
  });
  it('recalls: three history rows, four reasons, state meta', () => {
    expect(HISTORY.map((h) => h.vid)).toEqual([1, 2, 3]);
    expect(Object.keys(REASONS)).toEqual(['NHTSA 24V-137', 'NHTSA 23V-742', 'NHTSA 22V-118', 'NHTSA 21V-905']);
    expect(REASONS['NHTSA 24V-137'].facts[1]).toEqual(['UNITS AFFECTED', '125,227']);
    expect(REASONS['NHTSA 21V-905'].steps).toHaveLength(3);
    expect(STATE_META.scheduled).toEqual({ label: 'SCHEDULED', chipBg: '#0F638F', chipFg: '#EAF7FF', icon: 'calendar-check-fill', status: 'REPAIR SCHEDULED' });
    expect(LIVE_RECALL.dealer).toBe('Tesla Service — 6.2 mi');
  });
  it('tokens exist', () => {
    expect(color.infoBg).toBe('#E7F1F7');
    expect(color.chatBubble).toBe('rgba(39,39,42,0.9)');
    expect(ease.swipe).toEqual([0.22, 1, 0.36, 1]);
    expect(dur.hubAuto).toBe(5000);
    expect(layout.shineBaked).toBe(1024);
  });
  it('shine assets are present', () => {
    expect(require('../../assets/images/shine-plus.png')).toBeDefined();
    expect(require('../../assets/images/shine-caution.png')).toBeDefined();
  });
});
```

- [ ] **Step 12: Gate** — `npm test -- slice3`, then `npm test && npm run typecheck` (34 suites expected; the pre-existing 33 must still pass — nothing here changes behaviour). Report.

**Checkpoint commit message (controller):** `feat: Slice 3 fixtures, tokens, jest mocks, shine assets`

---

### Task 2: Pure derivations — recalls, service, hub, chat, membership

**Files:**
- Create: `src/lib/recalls.ts`, `src/lib/service.ts`, `src/lib/hub.ts`, `src/lib/chat.ts`, `src/lib/membership.ts`, `src/lib/__tests__/slice3.test.ts`

**Interfaces:** every export below is consumed by Tasks 3 and 6–11 under exactly these names.

- [ ] **Step 1: `src/lib/recalls.ts`** (`allRecalls` 1431, `vehicleName` 1443, `detailVals` 1455, `recallsVals` 1481)

```ts
import { EMPTY_REASON, HISTORY, LIVE_RECALL, RECALLS_COPY, REASONS, STATE_META } from '../fixtures/recalls';
import type { RecallFilter, RecallItem, RecallState, StateMeta, Vehicle } from '../fixtures/types';

export function allRecalls(vehicles: Vehicle[], scheduled: boolean): RecallItem[] {
  const live: RecallItem[] = vehicles.filter((v) => v.recall).map((v) => ({
    id: 'v' + v.id, vid: v.id, code: v.recall!.code, title: v.recall!.title,
    severity: LIVE_RECALL.severity, remedy: LIVE_RECALL.remedy, dealer: LIVE_RECALL.dealer, est: LIVE_RECALL.est,
    state: scheduled ? 'scheduled' : 'open',
    done: scheduled ? LIVE_RECALL.doneScheduled : LIVE_RECALL.doneOpen,
  }));
  return [...live, ...HISTORY.map((h) => ({ ...h, state: 'closed' as const }))];
}

export const vehicleName = (vehicles: Vehicle[], vid: number) => vehicles.find((v) => v.id === vid)?.name ?? 'Vehicle';

export type Counts = Record<RecallState, number>;
export const recallCounts = (items: RecallItem[]): Counts => ({
  open: items.filter((x) => x.state === 'open').length,
  scheduled: items.filter((x) => x.state === 'scheduled').length,
  closed: items.filter((x) => x.state === 'closed').length,
});

export type HeroVals = {
  glow: boolean; shell: string; faceOpacity: number; title: string; sub: string; icon: string; iconBg: string;
  strip: { grow: number; color: string }[]; legend: { color: string; text: string }[]; headline: string;
};
export function heroVals(c: Counts, vehiclesCount: number): HeroVals {
  return {
    glow: c.open > 0,
    shell: c.open ? '#232228' : '#F2F1EE',
    faceOpacity: c.open ? 0.86 : 0,
    title: c.open ? c.open + (c.open === 1 ? ' needs action' : ' need action') : c.scheduled ? c.scheduled + ' in the shop' : RECALLS_COPY.heroClearTitle,
    sub: c.open ? RECALLS_COPY.heroOpenSub : c.scheduled ? RECALLS_COPY.heroScheduledSub : RECALLS_COPY.heroClearSub,
    icon: c.open ? 'alarm-warning-fill' : c.scheduled ? 'calendar-check-fill' : 'shield-check-fill',
    iconBg: c.open ? '#D0021B' : c.scheduled ? '#0F638F' : '#01a08c',
    strip: [
      { grow: c.open, color: '#D0021B' },
      { grow: c.scheduled, color: '#0F638F' },
      { grow: c.closed, color: '#01a08c' },
    ].filter((s) => s.grow > 0),
    legend: [
      { color: '#D0021B', text: c.open + ' OPEN' },
      { color: '#0F638F', text: c.scheduled + ' SCHEDULED' },
      { color: '#01a08c', text: c.closed + ' RESOLVED' },
    ],
    headline: c.open
      ? c.open + (c.open === 1 ? ' OPEN RECALL · ' : ' OPEN RECALLS · ') + vehiclesCount + ' VEHICLES MONITORED'
      : 'NOTHING OPEN · ' + vehiclesCount + ' VEHICLES MONITORED',
  };
}

export const FILTERS: RecallFilter[] = ['open', 'scheduled', 'closed'];
export type FilterVals = { key: RecallFilter; label: string; count: number; on: boolean; bg: string; border: string; fg: string; meta: string };
export function filterVals(k: RecallFilter, c: Counts, rFilter: RecallFilter): FilterVals {
  const on = rFilter === k;
  const hot = k === 'open' && c.open > 0;
  return {
    key: k, label: STATE_META[k].label, count: c[k], on,
    bg: on ? (hot ? '#FBE9EB' : '#F2F1EE') : '#FFFFFF',
    border: on ? (hot ? '#F0B9C0' : 'rgba(0,0,0,0.14)') : 'rgba(0,0,0,0.08)',
    fg: hot ? '#D0021B' : '#17161A',
    meta: on ? '#3a3941' : '#63626a',
  };
}

export const emptyText = (f: RecallFilter) =>
  f === 'open' ? RECALLS_COPY.emptyOpen : f === 'scheduled' ? RECALLS_COPY.emptyScheduled : RECALLS_COPY.emptyClosed;

export const itemRows = (x: RecallItem): [string, string][] =>
  [['SEVERITY', x.severity], ['REMEDY', x.remedy], ['WHERE', x.dealer], ['EST. TIME', x.est]];

export type Detail = {
  id: string; code: string; title: string; state: RecallState; meta: StateMeta; vehicle: string;
  facts: { k: string; v: string }[]; why: string; steps: { n: number; title: string; body: string }[]; note: string;
};
export function detailFor(items: RecallItem[], vehicles: Vehicle[], id: string): Detail | null {
  const x = items.find((r) => r.id === id);
  if (!x) return null;
  const info = REASONS[x.code] ?? EMPTY_REASON;
  return {
    id: x.id, code: x.code, title: x.title, state: x.state, meta: STATE_META[x.state],
    vehicle: vehicleName(vehicles, x.vid) + ' · ' + x.done,
    facts: info.facts.map(([k, v]) => ({ k, v })),
    why: info.why,
    steps: info.steps.map(([title, body], i) => ({ n: i + 1, title, body })),
    note: info.note,
  };
}
```

- [ ] **Step 2: `src/lib/service.ts`** (`serviceVals` 1562, `onTiltMotion` 1798)

```ts
import { SERVICE_COPY, SVC_CENTER, TRACKER } from '../fixtures/service';
import type { SvcMethod, Vehicle } from '../fixtures/types';

export const dateLabel = (svcDate: string) => 'Tuesday, Oct ' + svcDate;   // line 1565 — verbatim, the weekday is the design's
export const bookedToast = (svcDate: string, svcTime: string) => 'Service booked · ' + dateLabel(svcDate) + ' at ' + svcTime;
export const openRecallVehicle = (vehicles: Vehicle[]): Vehicle | null => vehicles.find((v) => v.recall) ?? null;

export type ReasonVals = { ref: string; reason: string; caution: boolean; shell: string; tone: string; icon: string; hint: string };
export function reasonVals(open: Vehicle | null): ReasonVals {
  const r = open?.recall ?? null;
  return {
    ref: 'REF: ' + (r ? r.code.replace('NHTSA ', 'NHTSA-') : SERVICE_COPY.routineRef),
    reason: r ? r.title : SERVICE_COPY.routineReason,
    caution: !!r,
    shell: r ? 'transparent' : '#F2F1EE',
    tone: r ? '#D0021B' : '#0F638F',
    icon: r ? 'alarm-warning-fill' : 'settings-3-line',
    hint: r ? SERVICE_COPY.hintRecall : SERVICE_COPY.hintRoutine,
  };
}

export const reasonRows = (): [string, string][] => [
  ['SEVERITY', 'Safety recall'],
  ['REMEDY', 'Software update, free'],
  ['WHERE', SVC_CENTER.name + ' — ' + SVC_CENTER.distance],
  ['EST. TIME', '45 minutes'],
];

export type DoneDetail = { icon: string; label: string; value: string; secondary: string; line: string };
export const doneDetails = (svcDate: string, svcTime: string, svcMethod: SvcMethod): DoneDetail[] => [
  { icon: 'calendar-line', label: SERVICE_COPY.dateTime, value: dateLabel(svcDate) + ' at ' + svcTime, secondary: svcMethod === 'concierge' ? SERVICE_COPY.conciergePickup : SERVICE_COPY.dropoff, line: 'transparent' },
  { icon: 'map-pin-line', label: SERVICE_COPY.location, value: SVC_CENTER.name, secondary: SVC_CENTER.address, line: 'rgba(0,0,0,0.08)' },
];

export type TrackerVals = { label: string; rail: string; nodeBg: string; nodeBorderWidth: number; nodeBorderColor: string; dot: string; fg: string; size: number; weight: 400 | 600; track: number };
export function trackerSteps(): TrackerVals[] {
  return TRACKER.map((st, i, arr) => ({
    label: st.label,
    rail: i === arr.length - 1 ? 'transparent' : 'rgba(0,0,0,0.12)',
    nodeBg: st.state === 'pending' ? '#F2F1EE' : '#FFFFFF',
    nodeBorderWidth: st.state === 'active' ? 2 : 1,
    nodeBorderColor: st.state === 'active' ? '#0F638F' : st.state === 'done' ? '#9a99a2' : 'rgba(0,0,0,0.12)',
    dot: st.state === 'pending' ? 'transparent' : st.state === 'active' ? '#0F638F' : '#9a99a2',
    fg: st.state === 'active' ? '#0F638F' : st.state === 'pending' ? '#9a99a2' : '#3a3941',
    size: st.state === 'active' ? 20 : 15,
    weight: st.state === 'active' ? 600 : 400,
    track: st.state === 'active' ? -0.4 : 0,
  }));
}

// Tilt (line 1798): beta/gamma in DEGREES (the W3C deviceorientation convention; expo-sensors reports radians — convert at the listener).
export type Tilt = { tiltX: number; tiltY: number };
export const RAD_TO_DEG = 180 / Math.PI;
const clamp = (v: number, n: number) => Math.max(-n, Math.min(n, v));
export function tiltFor(betaDeg: number, gammaDeg: number): Tilt {
  const nx = clamp((betaDeg - 35) * 0.28, 8);
  const ny = clamp(gammaDeg * 0.28, 8);
  return { tiltX: -nx, tiltY: ny };
}
// The source compares the new nx/ny against the stored (negated) tiltX — effectively "changed by more than 0.25°"; that is the intent kept here.
export const tiltChanged = (prev: Tilt, next: Tilt) => Math.abs(next.tiltX - prev.tiltX) > 0.25 || Math.abs(next.tiltY - prev.tiltY) > 0.25;
```

- [ ] **Step 3: `src/lib/hub.ts`** (`hubVals` 1901, `goArticle` 1950, `articleVals` 2061)

```ts
import { ARTICLES } from '../fixtures/articles';
import { LIGHTS } from '../fixtures/lights';
import type { Article, LightFilter, LightGroup } from '../fixtures/types';

export const GROUPS: LightFilter[] = ['all', 'critical', 'warning', 'info'];
export const GROUP_META: Record<LightFilter, { label: string; dot: string }> = {
  all: { label: 'ALL', dot: '#17161A' },
  critical: { label: 'STOP NOW', dot: '#D0021B' },
  warning: { label: 'CAUTION', dot: '#C98A1F' },
  info: { label: 'STATUS', dot: '#01a08c' },
};
export const BADGE: Record<LightGroup, [string, string, string]> = {
  critical: ['STOP DRIVING', '#D0021B', '#FFFFFF'],
  warning: ['GET IT CHECKED', '#FBE9CB', '#7A5307'],
  info: ['STATUS ONLY', '#E7F1F7', '#0B4E73'],
};
export const HUB_COPY = {
  title: 'Hub',
  featured: 'FEATURED READING',
  lights: 'DASHBOARD LIGHTS',
  lightsSub: 'Tap any warning light to read what it means and what to do next.',
  note: "Symbols vary by manufacturer. Your owner's manual is the final word for your vehicle.",
  whatToDo: 'WHAT TO DO',
  gotIt: 'Got it',
  swipeHint: 'SWIPE FOR THE NEXT ARTICLE',
  nextArticle: 'NEXT ARTICLE',
} as const;

export const hubHeadline = () => ARTICLES.length + ' ARTICLES · ' + LIGHTS.length + ' DASHBOARD LIGHTS';
export const hubCounter = (i: number) => String(i + 1).padStart(2, '0') + ' / ' + String(ARTICLES.length).padStart(2, '0');
export const visibleLights = (g: LightFilter) => LIGHTS.filter((l) => g === 'all' || l.group === g);
export const lightById = (id: string | null) => (id ? LIGHTS.find((l) => l.id === id) ?? null : null);

export type GroupChip = { key: LightFilter; label: string; dot: string; bg: string; edge: string; fg: string; on: boolean };
export function groupChip(k: LightFilter, hubGroup: LightFilter): GroupChip {
  const on = hubGroup === k;
  return {
    key: k, label: GROUP_META[k].label, dot: GROUP_META[k].dot, on,
    bg: on ? '#F2F1EE' : '#FFFFFF',
    edge: on ? 'rgba(0,0,0,0.14)' : 'rgba(0,0,0,0.08)',
    fg: on ? '#17161A' : '#63626a',
  };
}

export const articleIndex = (id: string) => ARTICLES.findIndex((a) => a.id === id);
export const articleById = (id: string | null): Article | null => (id ? ARTICLES.find((a) => a.id === id) ?? null : null);
export function neighbour(id: string, dir: 1 | -1): Article {
  const i = Math.max(0, articleIndex(id));
  const n = ARTICLES.length;
  return ARTICLES[(i + dir + n) % n];
}
export const nextTitle = (id: string) => neighbour(id, 1).title;
```

- [ ] **Step 4: `src/lib/chat.ts`** (`revealChat` 1728, `sendChat` 1751)

```ts
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
```

- [ ] **Step 5: `src/lib/membership.ts`** (`membershipVals` 2087)

```ts
import { PLANS } from '../fixtures/profile';
import type { Plan, PlanId } from '../fixtures/types';

export const planById = (id: PlanId): Plan => PLANS.find((p) => p.id === id) ?? PLANS[0];
export const planLabel = (id: PlanId) => 'AEGIS ' + planById(id).name.toUpperCase() + ' ACTIVE';
export const planLine = (id: PlanId) => { const p = planById(id); return p.name + ' · ' + p.price + '/month'; };
export const planToast = (id: PlanId) => planById(id).name + ' membership active';
export type FeatureVals = { label: string; icon: string; color: string; text: string };
export const featureVals = ([label, ok]: [string, 0 | 1]): FeatureVals => ({
  label, icon: ok ? 'check-line' : 'close-line', color: ok ? '#17161A' : '#a3a2aa', text: ok ? '#6b6a72' : '#a3a2aa',
});
```

- [ ] **Step 6: Tests** `src/lib/__tests__/slice3.test.ts`

```ts
import { CHAT_SCRIPT } from '../../fixtures/chat';
import { SEED_VEHICLES } from '../../fixtures/vehicles';
import { revealPlan, SEND_REPLY_DELAY } from '../chat';
import { BADGE, groupChip, hubCounter, hubHeadline, lightById, neighbour, nextTitle, visibleLights } from '../hub';
import { featureVals, planLabel, planLine, planToast } from '../membership';
import { allRecalls, detailFor, emptyText, filterVals, heroVals, itemRows, recallCounts, vehicleName } from '../recalls';
import { bookedToast, dateLabel, doneDetails, openRecallVehicle, reasonRows, reasonVals, tiltChanged, tiltFor, trackerSteps } from '../service';

const V = SEED_VEHICLES;

describe('recalls', () => {
  it('allRecalls: one live entry then three closed history rows; state follows scheduled', () => {
    const open = allRecalls(V, false);
    expect(open.map((x) => x.id)).toEqual(['v1', 'h1', 'h2', 'h3']);
    expect(open[0]).toMatchObject({ vid: 1, code: 'NHTSA 24V-137', state: 'open', done: 'Reported 12 Feb 2026', dealer: 'Tesla Service — 6.2 mi' });
    expect(allRecalls(V, true)[0]).toMatchObject({ state: 'scheduled', done: 'Booked Thu 10:30 AM' });
    expect(open[1].state).toBe('closed');
  });
  it('counts, hero and headline in the three fleet states', () => {
    const c0 = recallCounts(allRecalls(V, false));
    expect(c0).toEqual({ open: 1, scheduled: 0, closed: 3 });
    const h0 = heroVals(c0, 3);
    expect(h0).toMatchObject({ glow: true, shell: '#232228', faceOpacity: 0.86, title: '1 needs action', icon: 'alarm-warning-fill', iconBg: '#D0021B', headline: '1 OPEN RECALL · 3 VEHICLES MONITORED' });
    expect(h0.strip).toEqual([{ grow: 1, color: '#D0021B' }, { grow: 3, color: '#01a08c' }]);
    expect(h0.legend.map((l) => l.text)).toEqual(['1 OPEN', '0 SCHEDULED', '3 RESOLVED']);
    const c1 = recallCounts(allRecalls(V, true));
    expect(heroVals(c1, 3)).toMatchObject({ glow: false, shell: '#F2F1EE', faceOpacity: 0, title: '1 in the shop', icon: 'calendar-check-fill', iconBg: '#0F638F', headline: 'NOTHING OPEN · 3 VEHICLES MONITORED' });
    const c2 = recallCounts(allRecalls(V.filter((v) => !v.recall), false));
    expect(heroVals(c2, 2)).toMatchObject({ title: 'Fleet is clear', icon: 'shield-check-fill', iconBg: '#01a08c' });
    expect(heroVals({ open: 2, scheduled: 0, closed: 0 }, 3).title).toBe('2 need action');
  });
  it('filter tiles: the open tile goes red while an open recall exists', () => {
    const c = { open: 1, scheduled: 0, closed: 3 };
    expect(filterVals('open', c, 'open')).toMatchObject({ label: 'OPEN', count: 1, bg: '#FBE9EB', border: '#F0B9C0', fg: '#D0021B', meta: '#3a3941', on: true });
    expect(filterVals('closed', c, 'open')).toMatchObject({ label: 'RESOLVED', count: 3, bg: '#FFFFFF', border: 'rgba(0,0,0,0.08)', fg: '#17161A', meta: '#63626a', on: false });
    expect(filterVals('scheduled', c, 'scheduled')).toMatchObject({ bg: '#F2F1EE', border: 'rgba(0,0,0,0.14)' });
    expect(filterVals('open', { open: 0, scheduled: 1, closed: 3 }, 'open')).toMatchObject({ bg: '#F2F1EE', fg: '#17161A' });
  });
  it('empty text, rows, names', () => {
    expect(emptyText('open')).toBe('No open recalls across your fleet.');
    expect(emptyText('closed')).toBe('No repair history yet.');
    expect(itemRows(allRecalls(V, false)[0])).toEqual([['SEVERITY', 'Safety recall'], ['REMEDY', 'Software update, free'], ['WHERE', 'Tesla Service — 6.2 mi'], ['EST. TIME', '45 minutes']]);
    expect(vehicleName(V, 2)).toBe('Taycan 4S');
    expect(vehicleName(V, 9)).toBe('Vehicle');
  });
  it('detailFor assembles the detail for live and history recalls', () => {
    const items = allRecalls(V, false);
    const d = detailFor(items, V, 'v1')!;
    expect(d).toMatchObject({ code: 'NHTSA 24V-137', title: 'Rear camera image failure', vehicle: 'Model S Plaid · Reported 12 Feb 2026', state: 'open' });
    expect(d.meta.status).toBe('ACTION REQUIRED');
    expect(d.facts[0]).toEqual({ k: 'SEVERITY', v: 'Safety recall' });
    expect(d.steps[2]).toEqual({ n: 3, title: 'Confirmation', body: 'Repair is filed with NHTSA against your VIN and the recall clears in this app.' });
    expect(detailFor(items, V, 'h3')!).toMatchObject({ vehicle: 'Civic Type R · Repaired 27 Jun 2023', state: 'closed' });
    expect(detailFor(items, V, 'nope')).toBeNull();
  });
});

describe('service', () => {
  it('labels and reason card values', () => {
    expect(dateLabel('13')).toBe('Tuesday, Oct 13');
    expect(bookedToast('15', '02:30 PM')).toBe('Service booked · Tuesday, Oct 15 at 02:30 PM');
    const open = openRecallVehicle(V)!;
    expect(open.id).toBe(1);
    expect(reasonVals(open)).toEqual({ ref: 'REF: NHTSA-24V-137', reason: 'Rear camera image failure', caution: true, shell: 'transparent', tone: '#D0021B', icon: 'alarm-warning-fill', hint: 'TAP FOR RECALL DETAILS' });
    expect(reasonVals(null)).toEqual({ ref: 'REF: NHTSA-24V001', reason: 'System Diagnostic & Update', caution: false, shell: '#F2F1EE', tone: '#0F638F', icon: 'settings-3-line', hint: 'ROUTINE MAINTENANCE VISIT' });
    expect(reasonRows()[2]).toEqual(['WHERE', 'Prime Center — 4.2 mi']);
  });
  it('done details and tracker steps', () => {
    const d = doneDetails('13', '09:30 AM', 'concierge');
    expect(d[0]).toMatchObject({ label: 'DATE & TIME', value: 'Tuesday, Oct 13 at 09:30 AM', secondary: 'Concierge pick-up', line: 'transparent' });
    expect(d[1]).toMatchObject({ label: 'LOCATION', value: 'Prime Center', secondary: '1200 Technical Blvd', line: 'rgba(0,0,0,0.08)' });
    expect(doneDetails('13', '09:30 AM', 'dropoff')[0].secondary).toBe('Drop-off');
    const s = trackerSteps();
    expect(s.map((x) => x.label)).toEqual(['Recall detected', 'Appointment confirmed', 'Repair pending']);
    expect(s[0]).toMatchObject({ rail: 'rgba(0,0,0,0.12)', nodeBg: '#FFFFFF', nodeBorderWidth: 1, nodeBorderColor: '#9a99a2', dot: '#9a99a2', fg: '#3a3941', size: 15, weight: 400, track: 0 });
    expect(s[1]).toMatchObject({ nodeBorderWidth: 2, nodeBorderColor: '#0F638F', dot: '#0F638F', fg: '#0F638F', size: 20, weight: 600, track: -0.4 });
    expect(s[2]).toMatchObject({ rail: 'transparent', nodeBg: '#F2F1EE', dot: 'transparent', fg: '#9a99a2' });
  });
  it('tilt maths clamps to ±8 and detects change', () => {
    expect(tiltFor(35, 0)).toEqual({ tiltX: -0, tiltY: 0 });
    expect(tiltFor(45, 10)).toEqual({ tiltX: -2.8, tiltY: 2.8 });
    expect(tiltFor(90, -90)).toEqual({ tiltX: -8, tiltY: -8 });
    expect(tiltChanged({ tiltX: 0, tiltY: 0 }, { tiltX: 0.2, tiltY: 0.2 })).toBe(false);
    expect(tiltChanged({ tiltX: 0, tiltY: 0 }, { tiltX: 0.3, tiltY: 0 })).toBe(true);
  });
});

describe('hub', () => {
  it('headline, counter, filters, badge, neighbours', () => {
    expect(hubHeadline()).toBe('4 ARTICLES · 20 DASHBOARD LIGHTS');
    expect(hubCounter(0)).toBe('01 / 04');
    expect(visibleLights('all')).toHaveLength(20);
    expect(visibleLights('critical').map((l) => l.id)).toEqual(['l1', 'l2', 'l3', 'l4', 'l5']);
    expect(groupChip('critical', 'critical')).toMatchObject({ label: 'STOP NOW', dot: '#D0021B', bg: '#F2F1EE', edge: 'rgba(0,0,0,0.14)', fg: '#17161A', on: true });
    expect(groupChip('info', 'all')).toMatchObject({ label: 'STATUS', bg: '#FFFFFF', edge: 'rgba(0,0,0,0.08)', fg: '#63626a', on: false });
    expect(BADGE.warning).toEqual(['GET IT CHECKED', '#FBE9CB', '#7A5307']);
    expect(lightById('l8')!.glyph).toBe('ABS');
    expect(lightById(null)).toBeNull();
    expect(neighbour('a4', 1).id).toBe('a1');
    expect(neighbour('a1', -1).id).toBe('a4');
    expect(nextTitle('a2')).toBe('Reading a tyre sidewall in thirty seconds');
  });
});

describe('chat', () => {
  it('revealPlan mirrors revealChat timings for the script', () => {
    const p = revealPlan(CHAT_SCRIPT);
    expect(p.slice(0, 4)).toEqual([
      { at: 0, shown: 0, typing: true }, { at: 1200, shown: 1, typing: false },
      { at: 2420, shown: 2, typing: false }, { at: 2920, shown: 2, typing: true },
    ]);
    expect(p[p.length - 1]).toEqual({ at: 9960, shown: 7, typing: false });
    expect(SEND_REPLY_DELAY).toBe(1400);
  });
});

describe('membership', () => {
  it('labels and features', () => {
    expect(planLabel('pro')).toBe('AEGIS PRO ACTIVE');
    expect(planLine('pro')).toBe('Pro · $29/month');
    expect(planLine('plus')).toBe('Plus · $9/month');
    expect(planToast('plus')).toBe('Plus membership active');
    expect(featureVals(['Real-time alerts', 0])).toEqual({ label: 'Real-time alerts', icon: 'close-line', color: '#a3a2aa', text: '#a3a2aa' });
    expect(featureVals(['Up to 3 vehicles', 1])).toEqual({ label: 'Up to 3 vehicles', icon: 'check-line', color: '#17161A', text: '#6b6a72' });
  });
});
```

- [ ] **Step 7: Gate** — `npm test -- lib`, then `npm test && npm run typecheck`. Report.

**Checkpoint commit message (controller):** `feat: Slice 3 derivations (recalls, service, hub, chat, membership)`

---

### Task 3: Store — Slice 3 fields and actions

**Files:**
- Modify: `src/store/useAppStore.ts` (replace the whole file with the code below), `src/store/__tests__/useAppStore.test.ts` (append the new `describe` block)

**Interfaces:** every field/action in spec §5 under exactly these names. Existing actions keep their signatures (`openVinHelp`/`closeVinHelp` stay as aliases of `openScreen('vinhelp')`/`closeScreen()`); `switchTab` now also clears `hubLight` and `article`.

- [ ] **Step 1: `src/store/useAppStore.ts`** — replace the whole file

```ts
import { create } from 'zustand';
import { RECALLS_COPY } from '../fixtures/recalls';
import { SEED_VEHICLES } from '../fixtures/vehicles';
import type { LightFilter, PlanId, RecallFilter, SvcMethod, TabId, Vehicle } from '../fixtures/types';
import { decodeVin, maskVin } from '../lib/derive';
import { planToast } from '../lib/membership';
import { bookedToast } from '../lib/service';

export type SheetId = 'add' | 'recall' | 'reason';
export type ScreenId = 'vinhelp' | 'membership' | 'chat' | 'article';
export type PrefKey = 'pfPush' | 'pfEmail' | 'pfBio';

type State = {
  tab: TabId; idx: number; sheet: SheetId | null; screen: ScreenId | null; scheduled: boolean;
  toast: string | null; vin: string; splash: boolean; vehicles: Vehicle[];
  // Slice 3 (design state, line 1227)
  rFilter: RecallFilter; rOpen: string | null;
  plan: PlanId;
  hubIdx: number; hubGroup: LightFilter; hubLight: string | null; article: string | null;
  svcMethod: SvcMethod; svcDate: string; svcTime: string; svcDone: boolean;
  pfPush: boolean; pfEmail: boolean; pfBio: boolean;
};
type Actions = {
  switchTab: (tab: TabId) => void; setIdx: (i: number) => void;
  openSheet: (s: SheetId) => void; closeSheet: () => void;
  openScreen: (s: ScreenId) => void; closeScreen: () => void;
  openVinHelp: () => void; closeVinHelp: () => void;
  setVin: (v: string) => void; addVehicle: () => void; schedule: () => void;
  flash: (msg: string) => void; dismissSplash: () => void;
  // Slice 3
  setRecallFilter: (f: RecallFilter) => void; toggleRecall: (id: string) => void; showRecall: (id: string) => void; scheduleFromRecalls: () => void;
  setPlan: (p: PlanId) => void;
  setHubIdx: (i: number) => void; setHubGroup: (g: LightFilter) => void; openLight: (id: string) => void; closeLight: () => void;
  openArticle: (id: string) => void; setArticle: (id: string) => void; closeArticle: () => void;
  setSvcMethod: (m: SvcMethod) => void; setSvcDate: (d: string) => void; setSvcTime: (t: string) => void;
  confirmService: () => void; returnToGarage: () => void;
  togglePref: (k: PrefKey) => void;
};

const initial = (): State => ({
  tab: 'garage', idx: 0, sheet: null, screen: null, scheduled: false, toast: null, vin: '', splash: true,
  vehicles: SEED_VEHICLES.map((v) => ({ ...v })),
  rFilter: 'open', rOpen: null,
  plan: 'pro',
  hubIdx: 0, hubGroup: 'all', hubLight: null, article: null,
  svcMethod: 'dropoff', svcDate: '13', svcTime: '09:30 AM', svcDone: false,
  pfPush: true, pfEmail: true, pfBio: false,
});

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useAppStore = create<State & Actions>((set, get) => ({
  ...initial(),
  // tab onTap (line 2366): every overlay closes; rDetail is a route and is popped by the tab bar.
  switchTab: (tab) => set({ tab, sheet: null, screen: null, hubLight: null, article: null }),
  setIdx: (idx) => set({ idx }),
  openSheet: (sheet) => set({ sheet }),
  closeSheet: () => set({ sheet: null }),
  openScreen: (screen) => set({ screen }),
  closeScreen: () => set({ screen: null }),
  openVinHelp: () => set({ screen: 'vinhelp' }),
  closeVinHelp: () => set({ screen: null }),
  setVin: (vin) => set({ vin }),
  schedule: () => set({ scheduled: true }),
  dismissSplash: () => set({ splash: false }),
  flash: (msg) => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: msg });
    toastTimer = setTimeout(() => set({ toast: null }), 2200);
  },
  addVehicle: () => {
    const raw = get().vin.trim().toUpperCase();
    const d = decodeVin(raw);
    const v: Vehicle = {
      id: Date.now(), name: d.name, meta: d.meta, health: d.health, range: d.range,
      vin: maskVin(raw), sync: 'SYNCED JUST NOW', recall: null,
      odo: 8410, oilIn: 4800, tireIn: 2600, brakeIn: 21000, regDays: 240, psi: '40 / 40', battery: 99,
    };
    const vehicles = [...get().vehicles, v];
    set({ vehicles, sheet: null, vin: '', idx: vehicles.length - 1 });
    get().flash(d.name + ' added · monitoring for recalls');
  },
  // Recalls (lines 1401, 1471, 1520, 1552, 1555)
  setRecallFilter: (rFilter) => set({ rFilter, rOpen: null }),
  toggleRecall: (id) => set({ rOpen: get().rOpen === id ? null : id }),
  showRecall: (id) => set({ tab: 'recalls', screen: null, rFilter: 'open', rOpen: id }),
  scheduleFromRecalls: () => { set({ scheduled: true, rFilter: 'scheduled', rOpen: null }); get().flash(RECALLS_COPY.bookedToast); },
  // Membership (lines 2108, 2113)
  setPlan: (plan) => { set({ plan }); get().flash(planToast(plan)); },
  // Hub (lines 1918, 1935, 1944, 1948)
  setHubIdx: (hubIdx) => set({ hubIdx }),
  setHubGroup: (hubGroup) => set({ hubGroup }),
  openLight: (hubLight) => set({ hubLight }),
  closeLight: () => set({ hubLight: null }),
  openArticle: (article) => set({ screen: 'article', article }),
  setArticle: (article) => set({ article }),
  closeArticle: () => set({ screen: null, article: null }),
  // Service (lines 1614, 1624, 1630, 1637, 1675)
  setSvcMethod: (svcMethod) => set({ svcMethod }),
  setSvcDate: (svcDate) => set({ svcDate }),
  setSvcTime: (svcTime) => set({ svcTime }),
  confirmService: () => { const { svcDate, svcTime } = get(); set({ svcDone: true, scheduled: true }); get().flash(bookedToast(svcDate, svcTime)); },
  returnToGarage: () => set({ tab: 'garage', svcDone: false }),
  // Profile (line 1683)
  togglePref: (k) => set({ [k]: !get()[k] } as Partial<State>),
}));

export function resetAppStore() {
  if (toastTimer) clearTimeout(toastTimer);
  useAppStore.setState(initial());
}
```

- [ ] **Step 2: Append to `src/store/__tests__/useAppStore.test.ts`** (keep everything already there; the existing `switchTab clears overlays` case still holds)

```ts
describe('store — Slice 3', () => {
  it('starts with the design defaults', () => {
    expect(s()).toMatchObject({ rFilter: 'open', rOpen: null, plan: 'pro', hubIdx: 0, hubGroup: 'all', hubLight: null, article: null, svcMethod: 'dropoff', svcDate: '13', svcTime: '09:30 AM', svcDone: false, pfPush: true, pfEmail: true, pfBio: false });
  });
  it('recall filter, toggle, showRecall and scheduleFromRecalls', () => {
    s().toggleRecall('v1'); expect(s().rOpen).toBe('v1');
    s().toggleRecall('v1'); expect(s().rOpen).toBeNull();
    s().toggleRecall('h1'); s().setRecallFilter('closed');
    expect(s()).toMatchObject({ rFilter: 'closed', rOpen: null });
    s().showRecall('v1');
    expect(s()).toMatchObject({ tab: 'recalls', screen: null, rFilter: 'open', rOpen: 'v1' });
    s().scheduleFromRecalls();
    expect(s()).toMatchObject({ scheduled: true, rFilter: 'scheduled', rOpen: null, toast: 'Service booked · Thu 10:30 AM' });
  });
  it('setPlan toasts the plan name', () => {
    s().setPlan('plus');
    expect(s()).toMatchObject({ plan: 'plus', toast: 'Plus membership active' });
  });
  it('hub: index, group, light sheet, article screen', () => {
    s().setHubIdx(2); s().setHubGroup('warning'); s().openLight('l8');
    expect(s()).toMatchObject({ hubIdx: 2, hubGroup: 'warning', hubLight: 'l8' });
    s().closeLight(); expect(s().hubLight).toBeNull();
    s().openArticle('a2'); expect(s()).toMatchObject({ screen: 'article', article: 'a2' });
    s().setArticle('a3'); expect(s().article).toBe('a3');
    s().closeArticle(); expect(s()).toMatchObject({ screen: null, article: null });
  });
  it('service: selections, confirm toasts the chosen slot, return resets the form', () => {
    s().setSvcMethod('concierge'); s().setSvcDate('15'); s().setSvcTime('02:30 PM');
    s().confirmService();
    expect(s()).toMatchObject({ svcDone: true, scheduled: true, toast: 'Service booked · Tuesday, Oct 15 at 02:30 PM' });
    s().returnToGarage();
    expect(s()).toMatchObject({ tab: 'garage', svcDone: false });
  });
  it('togglePref flips one preference', () => {
    s().togglePref('pfBio'); expect(s().pfBio).toBe(true);
    s().togglePref('pfPush'); expect(s().pfPush).toBe(false);
    expect(s().pfEmail).toBe(true);
  });
  it('switchTab also closes the light sheet and the article', () => {
    s().openLight('l1'); s().openArticle('a1');
    s().switchTab('hub');
    expect(s()).toMatchObject({ tab: 'hub', sheet: null, screen: null, hubLight: null, article: null });
  });
  it('openScreen / closeScreen', () => {
    s().openScreen('chat'); expect(s().screen).toBe('chat');
    s().closeScreen(); expect(s().screen).toBeNull();
    s().openSheet('reason'); expect(s().sheet).toBe('reason');
  });
});
```

- [ ] **Step 3: Gate** — `npm test -- useAppStore`, then `npm test && npm run typecheck`. Report.

**Checkpoint commit message (controller):** `feat: store fields and actions for recalls, service, hub, profile`

---

### Task 4: Primitives — StatusChip, Toggle, ShineBorder, SheetShell, InfiniteRail (+ garage Rail refactor)

**Files:**
- Create: `src/ui/StatusChip.tsx`, `src/ui/Toggle.tsx`, `src/ui/ShineBorder.tsx`, `src/ui/InfiniteRail.tsx`, `src/ui/__tests__/slice3-primitives.test.tsx`
- Modify: `src/ui/Sheet.tsx` (add `SheetShell`; `Sheet` composes it — its rendered output is unchanged), `src/screens/garage/Rail.tsx` (delegate to `InfiniteRail`; behaviour unchanged)

**Interfaces (consumed by Tasks 6–11):**
- `StatusChip { bg, fg, icon?, label, size?, ls?, padX?, padY?, testID? }`
- `Toggle { on, label, onPress, testID? }` — `accessibilityRole="switch"`
- `ShineBorder { ramp: 'plus' | 'caution', radius, style?, children, testID? }` — the rotating image has `testID="shine"`
- `SheetShell { onClose, handleMargin?, paddingBottom?, gap?, children, testID? }`
- `InfiniteRail` (forwardRef) `{ count, index, onIndexChange, renderItem(i, active, slot), keyFor(i), extraData?, testID? }`; handle `{ scrollTo(i, animated), advance() }`

- [ ] **Step 1: `src/ui/StatusChip.tsx`** (chip at lines 133, 240, 977)

```tsx
import { View } from 'react-native';
import { Icon } from './Icon';
import { Mono } from './Txt';

export function StatusChip({ bg, fg, icon, label, size = 9, ls = 1.4, padX = 10, padY = 5, testID }:
  { bg: string; fg: string; icon?: string; label: string; size?: number; ls?: number; padX?: number; padY?: number; testID?: string }) {
  return (
    <View testID={testID} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: bg, paddingVertical: padY, paddingHorizontal: padX }}>
      {icon ? <Icon name={icon} size={12} color={fg} /> : null}
      <Mono size={size} ls={ls} color={fg}>{label}</Mono>
    </View>
  );
}
```

- [ ] **Step 2: `src/ui/Toggle.tsx`** (lines 578–583; `sw()` line 1680)

```tsx
import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { bez, color, dur, ease } from '../theme/tokens';
import { Sans } from './Txt';

// Track: background .22s ease (#dcdbd8 → #0F638F). Knob: translate3d(18px) .22s cubic-bezier(.4,0,.2,1).
export function Toggle({ on, label, onPress, testID }: { on: boolean; label: string; onPress: () => void; testID?: string }) {
  const track = useSharedValue(on ? 1 : 0);
  const knob = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    track.value = withTiming(on ? 1 : 0, { duration: dur.toggle, easing: bez(ease.css) });
    knob.value = withTiming(on ? 1 : 0, { duration: dur.toggle, easing: bez(ease.press) });
  }, [on, track, knob]);
  const trackStyle = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(track.value, [0, 1], [color.handle, color.blueDeep]) }));
  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: 18 * knob.value }] }));
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={label} onPress={onPress} testID={testID}
      style={{ minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
      <Sans size={14} color={color.ink2}>{label}</Sans>
      <Animated.View style={[{ width: 44, height: 26, borderRadius: 13, padding: 3 }, trackStyle]}>
        <Animated.View style={[{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.22)' }, knobStyle]} />
      </Animated.View>
    </Pressable>
  );
}
```

- [ ] **Step 3: `src/ui/ShineBorder.tsx`** (lines 762–766, 375–379; `shine-spin 4s linear infinite`)

```tsx
import { type ReactNode, useEffect, useState } from 'react';
import { type LayoutChangeEvent, View, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { dur } from '../theme/tokens';

const RAMP = {
  plus: require('../assets/images/shine-plus.png'),
  caution: require('../assets/images/shine-caution.png'),
};

// A conic-gradient square (inset:-100% in the source) rotating behind the caller's inner card, clipped by the outer radius.
// The square's side is the card's diagonal so every corner stays covered at every angle; the gradient depends on angle only,
// so scaling the baked texture changes nothing but sharpness.
export function ShineBorder({ ramp, radius, style, children, testID }: { ramp: 'plus' | 'caution'; radius: number; style?: ViewStyle; children: ReactNode; testID?: string }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const rot = useSharedValue(0);
  useEffect(() => { rot.value = withRepeat(withTiming(360, { duration: dur.shine, easing: Easing.linear }), -1, false); }, [rot]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  const side = Math.ceil(Math.hypot(box.w, box.h));
  const onLayout = (e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  return (
    <View testID={testID} onLayout={onLayout} style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
      {side > 0 && (
        <Animated.Image testID="shine" pointerEvents="none" source={RAMP[ramp]}
          style={[{ position: 'absolute', left: box.w / 2 - side / 2, top: box.h / 2 - side / 2, width: side, height: side }, spin]} />
      )}
      {children}
    </View>
  );
}
```

- [ ] **Step 4: `src/ui/Sheet.tsx`** — replace the whole file with this (the `Sheet` output is byte-for-byte the same tree as before; `SheetShell` is new)

```tsx
import { BlurView } from 'expo-blur';
import { type ReactNode, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppBlurTarget } from '../overlays/blurTarget';
import { bez, blur, color, dur, ease } from '../theme/tokens';
import { Mono, Sans } from './Txt';

// sheetShell() (line 2203) without its title block: scrim (rgba(23,22,26,.28) + blur(2px), fade-in .2s) and the white panel
// (radius 22 22 0 0, shadow 0 -8px 40px rgba(0,0,0,.18), padding 10 20 <paddingBottom>, sheet-up .28s) with the 36×4 handle.
export function SheetShell({ onClose, handleMargin = 18, paddingBottom = 28, gap, children, testID }:
  { onClose: () => void; handleMargin?: number; paddingBottom?: number; gap?: number; children: ReactNode; testID?: string }) {
  const insets = useSafeAreaInsets();
  const target = useAppBlurTarget();
  const scrim = useSharedValue(0);
  const slide = useSharedValue(1);
  const [h, setH] = useState(600);
  useEffect(() => {
    scrim.value = withTiming(1, { duration: dur.fade });
    slide.value = withTiming(0, { duration: dur.sheet, easing: bez(ease.standard) });
  }, [scrim, slide]);
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value }));
  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: slide.value * h }] }));
  return (
    <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]} testID={testID}>
      <Animated.View style={[StyleSheet.absoluteFill, scrimStyle]}>
        <Pressable accessibilityLabel="Close sheet" onPress={onClose} style={StyleSheet.absoluteFill}>
          <BlurView intensity={blur.scrim} tint="dark" blurMethod="dimezisBlurViewSdk31Plus" blurTarget={target} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: color.scrim }]} />
        </Pressable>
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View onLayout={(e) => setH(e.nativeEvent.layout.height)} style={[styles.panel, { paddingBottom: paddingBottom + insets.bottom, gap }, panelStyle]}>
          <View style={[styles.handle, { marginBottom: handleMargin }]} />
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

export function Sheet({ title, sub, action, onClose, children, testID }: { title: string; sub: string; action?: ReactNode; onClose: () => void; children: ReactNode; testID?: string }) {
  return (
    <SheetShell onClose={onClose} testID={testID}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Sans size={22} weight={600} ls={-0.5} color={color.ink}>{title}</Sans>
          <Mono size={10} ls={1.6} color={color.ink3} style={{ marginTop: 6 }}>{sub}</Mono>
        </View>
        {action}
      </View>
      {children}
    </SheetShell>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: color.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, boxShadow: '0 -8px 40px rgba(0,0,0,0.18)', paddingTop: 10, paddingHorizontal: 20 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: color.handle, alignSelf: 'center' },
});
```

- [ ] **Step 5: `src/ui/InfiniteRail.tsx`** — the tripled, centre-snapping, silently-recentring rail (Slice 1 `Rail.tsx`, generalised; `attachHub`/`startHubAuto` lines 1880–1898)

```tsx
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { forwardRef, type ReactElement, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { FlatList, type NativeScrollEvent, type NativeSyntheticEvent, StyleSheet, useWindowDimensions } from 'react-native';
import { GAP, liveIndex, middleSlot, railPadding, recenterSlot, slotForOffset, STEP } from '../lib/rail';
import { dur } from '../theme/tokens';

export type InfiniteRailHandle = { scrollTo: (i: number, animated: boolean) => void; advance: () => void };
export type InfiniteRailProps = {
  count: number; index: number; onIndexChange: (i: number) => void;
  renderItem: (i: number, active: boolean, slot: number) => ReactElement;
  keyFor: (i: number) => string | number;
  extraData?: unknown; testID?: string;
};

// Data is the index list tripled (3n slots); the middle copy is "home". Scrolling into the first/last copy is undone silently
// by one set once momentum ends (source onRailScroll / onHubScroll). scrollTo(i) always targets the middle copy.
// advance() moves one slot forward (the source's startHubAuto glides to children[n + idx + 1]) and recentres itself on a timer,
// because a programmatic animated scroll does not reliably fire onMomentumScrollEnd on Android.
export const InfiniteRail = forwardRef<InfiniteRailHandle, InfiniteRailProps>(function InfiniteRail({ count: n, index, onIndexChange, renderItem, keyFor, extraData, testID }, ref) {
  const { width } = useWindowDimensions();
  const data = useMemo(() => Array.from({ length: 3 * n }, (_, slot) => slot), [n]);
  const list = useRef<FlatList<number>>(null);
  const scrollIdx = useRef(index);
  const slotRef = useRef(middleSlot(index, n));
  const ready = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const jump = useCallback((slot: number, animated: boolean) => {
    slotRef.current = slot;
    list.current?.scrollToOffset({ offset: slot * STEP, animated });
  }, []);
  const scrollTo = useCallback((i: number, animated: boolean) => {
    scrollIdx.current = i;
    jump(middleSlot(i, n), animated);
  }, [n, jump]);
  const advance = useCallback(() => {
    const slot = slotRef.current + 1;
    jump(slot, true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const rs = recenterSlot(slotRef.current, n);
      if (rs !== slotRef.current) jump(rs, false);
    }, dur.swipe + 60);
  }, [n, jump]);
  useImperativeHandle(ref, () => ({ scrollTo, advance }), [scrollTo, advance]);

  useEffect(() => { if (ready.current && index !== scrollIdx.current) scrollTo(index, true); }, [index, scrollTo]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const onContentSizeChange = useCallback(() => {
    if (!ready.current) { ready.current = true; scrollTo(index, false); }
  }, [index, scrollTo]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slot = slotForOffset(e.nativeEvent.contentOffset.x);
    slotRef.current = slot;
    const live = liveIndex(slot, n);
    if (live !== scrollIdx.current) { scrollIdx.current = live; onIndexChange(live); }
  }, [n, onIndexChange]);

  const onMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slot = slotForOffset(e.nativeEvent.contentOffset.x);
    const rs = recenterSlot(slot, n);
    if (rs !== slot) jump(rs, false);
  }, [n, jump]);

  return (
    <MaskedView maskElement={<LinearGradient colors={['transparent', '#000', '#000', 'transparent']} locations={[0, 0.09, 0.91, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />}>
      <FlatList
        ref={list}
        testID={testID}
        horizontal
        data={data}
        extraData={[index, extraData]}
        keyExtractor={(slot) => `${keyFor(liveIndex(slot, n))}-${slot}`}
        renderItem={({ item: slot }) => { const i = liveIndex(slot, n); return renderItem(i, i === index, slot); }}
        contentContainerStyle={{ paddingHorizontal: railPadding(width), gap: GAP }}
        showsHorizontalScrollIndicator={false}
        snapToInterval={STEP}
        snapToAlignment="start"
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumEnd}
        onContentSizeChange={onContentSizeChange}
        initialNumToRender={3 * n}
      />
    </MaskedView>
  );
});
```

- [ ] **Step 6: `src/screens/garage/Rail.tsx`** — replace the whole file (same props, same behaviour, same `testID="rail"`)

```tsx
import { useRef } from 'react';
import { isOpenRecall } from '../../lib/derive';
import { useAppStore } from '../../store/useAppStore';
import { InfiniteRail, type InfiniteRailHandle } from '../../ui/InfiniteRail';
import { VehicleCard } from './VehicleCard';

export function Rail({ onOpenStats }: { onOpenStats: (id: number) => void }) {
  const vehicles = useAppStore((s) => s.vehicles);
  const idx = useAppStore((s) => s.idx);
  const scheduled = useAppStore((s) => s.scheduled);
  const setIdx = useAppStore((s) => s.setIdx);
  const openSheet = useAppStore((s) => s.openSheet);
  const rail = useRef<InfiniteRailHandle>(null);
  return (
    <InfiniteRail
      ref={rail}
      testID="rail"
      count={vehicles.length}
      index={idx}
      onIndexChange={setIdx}
      keyFor={(i) => vehicles[i].id}
      extraData={[scheduled, vehicles]}
      renderItem={(i, active) => {
        const item = vehicles[i];
        return (
          <VehicleCard
            vehicle={item}
            active={active}
            scheduled={scheduled}
            onPress={() => (!active ? rail.current?.scrollTo(i, true) : onOpenStats(item.id))}
            onAction={() => (isOpenRecall(item, scheduled) ? openSheet('recall') : onOpenStats(item.id))}
          />
        );
      }}
    />
  );
}
```

- [ ] **Step 7: Tests** `src/ui/__tests__/slice3-primitives.test.tsx`

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { createRef } from 'react';
import { FlatList, Text } from 'react-native';
import { InfiniteRail, type InfiniteRailHandle } from '../InfiniteRail';
import { Sheet, SheetShell } from '../Sheet';
import { ShineBorder } from '../ShineBorder';
import { StatusChip } from '../StatusChip';
import { Toggle } from '../Toggle';

describe('StatusChip', () => {
  it('renders icon and label', () => {
    const { getByText, getByTestId } = render(<StatusChip bg="#D0021B" fg="#fff" icon="alarm-warning-fill" label="ACTION REQUIRED" />);
    expect(getByText('ACTION REQUIRED')).toBeTruthy();
    expect(getByTestId('icon-alarm-warning-fill')).toBeTruthy();
  });
});

describe('Toggle', () => {
  it('is a switch that reports its state and presses', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<Toggle on label="Push Notifications" onPress={onPress} />);
    const sw = getByRole('switch');
    expect(sw.props.accessibilityState).toEqual({ checked: true });
    fireEvent.press(sw);
    expect(onPress).toHaveBeenCalled();
  });
});

describe('ShineBorder', () => {
  it('mounts the rotating ramp once it has a size', () => {
    const { getByTestId, queryByTestId, getByText } = render(<ShineBorder ramp="plus" radius={16} testID="sb"><Text>card</Text></ShineBorder>);
    expect(getByText('card')).toBeTruthy();
    expect(queryByTestId('shine')).toBeNull();
    fireEvent(getByTestId('sb'), 'layout', { nativeEvent: { layout: { width: 390, height: 300 } } });
    expect(getByTestId('shine').props.style).toEqual(expect.arrayContaining([expect.objectContaining({ width: 493, height: 493 })]));
  });
});

describe('SheetShell / Sheet', () => {
  it('SheetShell closes on scrim tap and renders children', () => {
    const onClose = jest.fn();
    const { getByLabelText, getByText } = render(<SheetShell onClose={onClose} handleMargin={6} gap={14}><Text>body</Text></SheetShell>);
    expect(getByText('body')).toBeTruthy();
    fireEvent.press(getByLabelText('Close sheet'));
    expect(onClose).toHaveBeenCalled();
  });
  it('Sheet still renders title, sub and action', () => {
    const { getByText } = render(<Sheet title="Add a vehicle" sub="ENTER VIN" onClose={jest.fn()} action={<Text>act</Text>}><Text>body</Text></Sheet>);
    expect(getByText('Add a vehicle')).toBeTruthy();
    expect(getByText('ENTER VIN')).toBeTruthy();
    expect(getByText('act')).toBeTruthy();
  });
});

describe('InfiniteRail', () => {
  const items = ['a', 'b', 'c'];
  it('renders the list tripled with the active flag on the middle copy', () => {
    const { getAllByText } = render(
      <InfiniteRail count={3} index={1} onIndexChange={jest.fn()} keyFor={(i) => items[i]} renderItem={(i, active) => <Text>{items[i] + (active ? '*' : '')}</Text>} />,
    );
    expect(getAllByText('b*')).toHaveLength(3);
    expect(getAllByText('a')).toHaveLength(3);
  });
  it('scrollTo targets the middle copy; advance moves one slot and recentres on a timer', () => {
    jest.useFakeTimers();
    const spy = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation(() => {});
    const ref = createRef<InfiniteRailHandle>();
    render(<InfiniteRail ref={ref} count={3} index={2} onIndexChange={jest.fn()} keyFor={(i) => items[i]} renderItem={(i) => <Text>{items[i]}</Text>} />);
    ref.current!.scrollTo(0, true);
    expect(spy).toHaveBeenLastCalledWith({ offset: 3 * 332, animated: true });
    ref.current!.advance();               // slot 3 → 4 (still in the middle copy)
    expect(spy).toHaveBeenLastCalledWith({ offset: 4 * 332, animated: true });
    ref.current!.advance();               // 4 → 5
    ref.current!.advance();               // 5 → 6 = first slot of the last copy → recentred to 3 after the timer
    expect(spy).toHaveBeenLastCalledWith({ offset: 6 * 332, animated: true });
    jest.advanceTimersByTime(500);
    expect(spy).toHaveBeenLastCalledWith({ offset: 3 * 332, animated: false });
    spy.mockRestore();
    jest.useRealTimers();
  });
  it('reports the live index from scroll offsets and recentres after momentum', () => {
    const onIndexChange = jest.fn();
    const spy = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation(() => {});
    const { getByTestId } = render(<InfiniteRail testID="r" count={3} index={0} onIndexChange={onIndexChange} keyFor={(i) => items[i]} renderItem={(i) => <Text>{items[i]}</Text>} />);
    fireEvent.scroll(getByTestId('r'), { nativeEvent: { contentOffset: { x: 4 * 332 } } });
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    fireEvent(getByTestId('r'), 'momentumScrollEnd', { nativeEvent: { contentOffset: { x: 7 * 332 } } });
    expect(spy).toHaveBeenLastCalledWith({ offset: 4 * 332, animated: false });
    spy.mockRestore();
  });
});
```

- [ ] **Step 8: Gate** — `npm test -- ui`, `npm test -- Garage` (the Slice 1 garage tests must pass unchanged), then `npm test && npm run typecheck`. Report.

**Checkpoint commit message (controller):** `feat: StatusChip, Toggle, ShineBorder, SheetShell, InfiniteRail (garage rail refactored onto it)`

---

### Task 5: `useTilt` + `TiltMap`

**Files:**
- Create: `src/ui/useTilt.ts`, `src/ui/TiltMap.tsx`, `src/ui/__tests__/TiltMap.test.tsx`

**Interfaces:** `TiltMap` takes no props (Task 7 renders it inside the service form); `useTilt() → { tiltX, tiltY (shared values, degrees), tiltOn }`.

- [ ] **Step 1: `src/ui/useTilt.ts`** (`onTiltMotion` / `enableTilt`, lines 1798–1822)

```ts
import { DeviceMotion } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';
import { RAD_TO_DEG, type Tilt, tiltChanged, tiltFor } from '../lib/service';
import { dur } from '../theme/tokens';

// deviceorientation → expo-sensors DeviceMotion. rotation.beta/gamma arrive in radians; the maths (tiltFor) wants degrees.
// Each accepted reading retargets the card's rotateX/rotateY over 120 ms linear (the source's `transition: transform .12s linear`).
// If the sensor is unavailable or denied, the card stays flat and the pill reads LIVE (spec §9).
export function useTilt() {
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const [tiltOn, setTiltOn] = useState(false);
  const last = useRef<Tilt>({ tiltX: 0, tiltY: 0 });
  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    let cancelled = false;
    (async () => {
      try {
        if (!(await DeviceMotion.isAvailableAsync())) return;
        const p = await DeviceMotion.requestPermissionsAsync();
        if (!p.granted || cancelled) return;
        DeviceMotion.setUpdateInterval(60);
        sub = DeviceMotion.addListener((m) => {
          if (!m.rotation) return;
          const next = tiltFor(m.rotation.beta * RAD_TO_DEG, m.rotation.gamma * RAD_TO_DEG);
          if (!tiltChanged(last.current, next)) return;
          last.current = next;
          tiltX.value = withTiming(next.tiltX, { duration: dur.tilt, easing: Easing.linear });
          tiltY.value = withTiming(next.tiltY, { duration: dur.tilt, easing: Easing.linear });
          setTiltOn(true);
        });
      } catch {
        /* no sensor on this device: stay flat */
      }
    })();
    return () => { cancelled = true; sub?.remove(); };
  }, [tiltX, tiltY]);
  return { tiltX, tiltY, tiltOn };
}
```

- [ ] **Step 2: `src/ui/TiltMap.tsx`** (lines 388–441)

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { type DimensionValue, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { SERVICE_COPY, SVC_CENTER } from '../fixtures/service';
import { color } from '../theme/tokens';
import { Icon } from './Icon';
import { Mono, Sans } from './Txt';
import { useTilt } from './useTilt';

type Pct = `${number}%`;
const pct = (n: number): Pct => `${n}%`;

// Roads (lines 391–402): orientation, position %, stroke width, colour — each line centred on its percentage.
const ROADS: ['h' | 'v', number, number, string][] = [
  ['h', 35, 4, color.mapInk], ['h', 65, 4, color.mapInk],
  ['v', 30, 3, color.mapInk2], ['v', 70, 3, color.mapInk2],
  ['h', 20, 1.5, color.mapInk3], ['h', 50, 1.5, color.mapInk3], ['h', 80, 1.5, color.mapInk3],
  ['v', 15, 1.5, color.mapInk3], ['v', 45, 1.5, color.mapInk3], ['v', 55, 1.5, color.mapInk3], ['v', 85, 1.5, color.mapInk3],
];
// Buildings (lines 403–408): percentage boxes, r3, rgba(107,106,114, fill) with a 1 px rgba(107,106,114, edge) border.
const BUILDINGS: { top: Pct; left?: Pct; right?: Pct; width: Pct; height: Pct; fill: number; edge: number }[] = [
  { top: '40%', left: '10%', width: '15%', height: '20%', fill: 0.3, edge: 0.2 },
  { top: '15%', left: '35%', width: '12%', height: '15%', fill: 0.25, edge: 0.15 },
  { top: '70%', left: '75%', width: '18%', height: '18%', fill: 0.28, edge: 0.18 },
  { top: '20%', right: '10%', width: '10%', height: '25%', fill: 0.22, edge: 0.15 },
  { top: '55%', left: '5%', width: '8%', height: '12%', fill: 0.2, edge: 0.12 },
  { top: '8%', left: '75%', width: '14%', height: '10%', fill: 0.22, edge: 0.15 },
];
const PIN = 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z';

export function TiltMap() {
  const { tiltX, tiltY, tiltOn } = useTilt();
  // perspective:1000px on the wrapper + rotateX(tiltX) rotateY(tiltY) on the card (line 388–389)
  const tilt = useAnimatedStyle(() => ({ transform: [{ perspective: 1000 }, { rotateX: `${tiltX.value}deg` }, { rotateY: `${tiltY.value}deg` }] }));
  return (
    <Animated.View testID="tilt-map" style={[styles.card, tilt]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[StyleSheet.absoluteFill, { backgroundColor: color.sunken }]} />
        {ROADS.map(([o, pos, w, c], i) => o === 'h'
          ? <View key={i} style={{ position: 'absolute', left: 0, right: 0, top: pct(pos) as DimensionValue, height: w, marginTop: -w / 2, backgroundColor: c }} />
          : <View key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: pct(pos) as DimensionValue, width: w, marginLeft: -w / 2, backgroundColor: c }} />)}
        {BUILDINGS.map((b, i) => (
          <View key={i} style={{ position: 'absolute', top: b.top, left: b.left, right: b.right, width: b.width, height: b.height, borderRadius: 3, backgroundColor: `rgba(107,106,114,${b.fill})`, borderWidth: 1, borderColor: `rgba(107,106,114,${b.edge})` }} />
        ))}
        <View style={styles.pin}>
          <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
            <Path d={PIN} fill={color.blueDeep} />
            <Circle cx={12} cy={9} r={2.5} fill="#FFFFFF" />
          </Svg>
        </View>
        <LinearGradient colors={['#FFFFFF', 'rgba(255,255,255,0)']} locations={[0, 0.55]} start={{ x: 0.5, y: 1 }} end={{ x: 0.5, y: 0 }} style={[StyleSheet.absoluteFill, { opacity: 0.72 }]} />
      </View>
      <View style={styles.content}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.86)' }}>
            <Icon name="map-pin-line" size={20} color={color.ink} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: color.mapTint, paddingVertical: 5, paddingHorizontal: 9 }}>
            <View style={{ width: 6, height: 6, borderRadius: 4, backgroundColor: color.teal }} />
            <Mono size={9} ls={1.2} color={color.ink3}>{tiltOn ? SERVICE_COPY.liveTilt : SERVICE_COPY.live}</Mono>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ gap: 3 }}>
            <Sans size={18} weight={600} ls={-0.3} color={color.ink}>{SVC_CENTER.name}</Sans>
            <Sans size={13} color={color.ink5}>{SVC_CENTER.address}</Sans>
            <Mono size={11} ls={0.6} color={color.ink3}>{SVC_CENTER.coords}</Mono>
            <LinearGradient colors={['rgba(15,99,143,0.5)', 'rgba(15,99,143,0.25)', 'rgba(15,99,143,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ height: 1, marginTop: 3 }} />
          </View>
          <Mono size={11} color={color.blueDeep}>{SVC_CENTER.distance}</Mono>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { height: 250, borderRadius: 16, backgroundColor: color.surface, borderWidth: 1, borderColor: color.hair10, overflow: 'hidden' },
  pin: { position: 'absolute', left: '50%', top: '50%', marginLeft: -15, marginTop: -15, width: 30, height: 30, filter: [{ dropShadow: '0 0 10px rgba(15,99,143,0.45)' }] },
  content: { flex: 1, justifyContent: 'space-between', paddingVertical: 15, paddingHorizontal: 16 },
});
```

- [ ] **Step 3: Tests** `src/ui/__tests__/TiltMap.test.tsx`

```tsx
import { act, render, waitFor } from '@testing-library/react-native';
import { DeviceMotion } from 'expo-sensors';
import { TiltMap } from '../TiltMap';

type Listener = (m: { rotation: { alpha: number; beta: number; gamma: number; timestamp: number } }) => void;
const mocked = DeviceMotion as unknown as { isAvailableAsync: jest.Mock; requestPermissionsAsync: jest.Mock; addListener: jest.Mock; setUpdateInterval: jest.Mock };

afterEach(() => { mocked.isAvailableAsync.mockResolvedValue(false); jest.clearAllMocks(); });

describe('TiltMap', () => {
  it('renders the centre copy and LIVE when no sensor is available', async () => {
    const { getByText, getByTestId } = render(<TiltMap />);
    expect(getByText('Prime Center')).toBeTruthy();
    expect(getByText('1200 Technical Blvd')).toBeTruthy();
    expect(getByText('37.7749° N, 122.4194° W')).toBeTruthy();
    expect(getByText('4.2 mi')).toBeTruthy();
    expect(getByText('LIVE')).toBeTruthy();
    expect(getByTestId('icon-map-pin-line')).toBeTruthy();
    await waitFor(() => expect(mocked.isAvailableAsync).toHaveBeenCalled());
    expect(mocked.addListener).not.toHaveBeenCalled();
  });
  it('subscribes at 60 ms when available and flips to LIVE TILT on the first changed reading', async () => {
    mocked.isAvailableAsync.mockResolvedValue(true);
    let listener: Listener | undefined;
    mocked.addListener.mockImplementation((l: Listener) => { listener = l; return { remove: jest.fn() }; });
    const { getByText, queryByText } = render(<TiltMap />);
    await waitFor(() => expect(listener).toBeDefined());
    expect(mocked.setUpdateInterval).toHaveBeenCalledWith(60);
    expect(queryByText('LIVE TILT')).toBeNull();
    act(() => { listener!({ rotation: { alpha: 0, beta: Math.PI / 2, gamma: 0, timestamp: 0 } }); });   // beta 90° → tiltX −8
    expect(getByText('LIVE TILT')).toBeTruthy();
  });
});
```

- [ ] **Step 4: Gate** — `npm test -- TiltMap`, then `npm test && npm run typecheck`. If `filter: [{ dropShadow: … }]` is rejected by the RN 0.86 types, use the string form `filter: 'drop-shadow(0 0 10px rgba(15,99,143,0.45))'` and say so in the report. Report.

**Checkpoint commit message (controller):** `feat: tilt map (expo-sensors DeviceMotion) for the service form`

---

### Task 6: Recalls tab, recall card, recall detail, routes

**Files:**
- Create: `src/screens/recalls/RecallsScreen.tsx`, `src/screens/recalls/RecallCard.tsx`, `src/screens/recalls/RecallDetailScreen.tsx`, `src/screens/recalls/__tests__/recalls.test.tsx`, `app/(tabs)/recalls/_layout.tsx`, `app/(tabs)/recalls/index.tsx`, `app/(tabs)/recalls/[id].tsx`
- Delete: `app/(tabs)/recalls.tsx` (a file and a directory cannot share the route name)
- Modify: `src/ui/HumpTabBar.tsx` (one line: the recalls tab also navigates to `{ screen: 'index' }`), `app/(tabs)/garage/[id].tsx` (stats "Details" → `showRecall`)

- [ ] **Step 1: `src/screens/recalls/RecallCard.tsx`** (lines 231–264; item vals 1536–1557)

```tsx
import { Pressable, View } from 'react-native';
import { RECALLS_COPY, STATE_META } from '../../fixtures/recalls';
import type { RecallItem } from '../../fixtures/types';
import { itemRows } from '../../lib/recalls';
import { color } from '../../theme/tokens';
import { GlowCard } from '../../ui/GlowCard';
import { Icon } from '../../ui/Icon';
import { MetalButton } from '../../ui/MetalButton';
import { OutlinePill } from '../../ui/OutlinePill';
import { StatusChip } from '../../ui/StatusChip';
import { Mono, Sans } from '../../ui/Txt';

export function RecallCard({ item: x, vehicleLabel, expanded, onToggle, onSchedule, onDetails }:
  { item: RecallItem; vehicleLabel: string; expanded: boolean; onToggle: () => void; onSchedule: () => void; onDetails: () => void }) {
  const m = STATE_META[x.state];
  const open = x.state === 'open';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={x.title} onPress={onToggle} testID={`recall-${x.id}`}>
      <GlowCard shell={open ? color.shellDark : color.sunken} radius={18} glow={open} blobSize={200} faceOpacity={open ? 0.86 : 0} faceRadius={16} faceStyle={{ padding: 16, gap: 12 }} outline="rgba(0,0,0,0.08)">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <StatusChip bg={m.chipBg} fg={m.chipFg} icon={m.icon} label={m.status} />
          <Mono size={10} ls={1.2} color={color.ink3}>{x.code}</Mono>
          <Icon name={expanded ? 'arrow-up-s-line' : 'arrow-down-s-line'} size={20} color={color.ink4} style={{ marginLeft: 'auto' }} />
        </View>
        <View style={{ gap: 3 }}>
          <Sans size={18} lh={23} weight={600} ls={-0.3} color={color.ink}>{x.title}</Sans>
          <Sans size={13} color={color.ink5}>{vehicleLabel}</Sans>
        </View>
        {expanded && (
          <View testID={`recall-rows-${x.id}`}>
            {itemRows(x).map(([k, v]) => (
              <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: color.hair07 }}>
                <Mono size={9} ls={1.2} color={color.ink3}>{k}</Mono>
                <Sans size={13} color={color.ink} style={{ textAlign: 'right', flexShrink: 1 }}>{v}</Sans>
              </View>
            ))}
          </View>
        )}
        {open && (
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'stretch' }}>
            <MetalButton tint="blue" label={RECALLS_COPY.scheduleRepair} icon="calendar-2-line" flex={1.4} width="auto" height={48} radius={999} gap={8} iconSize={16} fontSize={14} onPress={onSchedule} />
            <OutlinePill label={RECALLS_COPY.seeDetails} icon="arrow-right-line" height={48} onPress={onDetails} />
          </View>
        )}
      </GlowCard>
    </Pressable>
  );
}
```

- [ ] **Step 2: `src/screens/recalls/RecallsScreen.tsx`** (lines 182–273; `recallsVals` 1481)

```tsx
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RECALLS_COPY } from '../../fixtures/recalls';
import { allRecalls, emptyText, FILTERS, filterVals, heroVals, recallCounts, vehicleName } from '../../lib/recalls';
import { useAppStore } from '../../store/useAppStore';
import { bez, color, dur, ease } from '../../theme/tokens';
import { GlowCard } from '../../ui/GlowCard';
import { Icon } from '../../ui/Icon';
import { MetalButton } from '../../ui/MetalButton';
import { Mono, Sans } from '../../ui/Txt';
import { RecallCard } from './RecallCard';

export function RecallsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const vehicles = useAppStore((s) => s.vehicles);
  const scheduled = useAppStore((s) => s.scheduled);
  const rFilter = useAppStore((s) => s.rFilter);
  const rOpen = useAppStore((s) => s.rOpen);
  const openSheet = useAppStore((s) => s.openSheet);
  const setRecallFilter = useAppStore((s) => s.setRecallFilter);
  const toggleRecall = useAppStore((s) => s.toggleRecall);
  const scheduleFromRecalls = useAppStore((s) => s.scheduleFromRecalls);
  const items = allRecalls(vehicles, scheduled);
  const counts = recallCounts(items);
  const hero = heroVals(counts, vehicles.length);
  const shown = items.filter((x) => x.state === rFilter);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 20, paddingTop: insets.top + 24, paddingHorizontal: 20, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <View style={{ flexShrink: 1, gap: 6 }}>
          <Sans size={38} lh={42} weight={600} ls={-1.2} color={color.ink}>{RECALLS_COPY.title}</Sans>
          <Mono size={11} ls={1.4} color={color.ink4}>{hero.headline}</Mono>
        </View>
        <MetalButton tint="blue" label="Add Vehicle" icon="sparkling-2-line" onPress={() => openSheet('add')} />
      </View>

      <GlowCard testID="recalls-hero" shell={hero.shell} radius={18} glow={hero.glow} blobSize={220} faceOpacity={hero.faceOpacity} faceRadius={16} faceStyle={{ padding: 18, gap: 14 }} outline="rgba(0,0,0,0.08)">
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
          <View style={{ flex: 1, gap: 3 }}>
            <Sans size={30} lh={34} weight={600} ls={-1} color={color.ink}>{hero.title}</Sans>
            <Sans size={13} color={color.ink5}>{hero.sub}</Sans>
          </View>
          <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: hero.iconBg }}>
            <Icon name={hero.icon} size={19} color="#ffffff" />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 3, height: 6 }}>
          {hero.strip.map((s) => <StripSegment key={s.color} grow={s.grow} tone={s.color} />)}
        </View>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          {hero.legend.map((l) => (
            <View key={l.color} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: l.color }} />
              <Mono size={9} ls={1.1} color={color.ink3}>{l.text}</Mono>
            </View>
          ))}
        </View>
      </GlowCard>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {FILTERS.map((k) => {
          const f = filterVals(k, counts, rFilter);
          return (
            <Pressable key={k} accessibilityRole="button" accessibilityLabel={f.label} accessibilityState={{ selected: f.on }} onPress={() => setRecallFilter(k)}
              style={{ flex: 1, gap: 3, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 14, backgroundColor: f.bg, borderWidth: 1, borderColor: f.border }}>
              <Sans size={22} weight={600} ls={-0.6} color={f.fg}>{String(f.count)}</Sans>
              <Mono size={9} ls={1.2} color={f.meta}>{f.label}</Mono>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: 12 }}>
        {shown.map((x) => (
          <RecallCard
            key={x.id}
            item={x}
            vehicleLabel={vehicleName(vehicles, x.vid) + ' · ' + x.done}
            expanded={rOpen === x.id}
            onToggle={() => toggleRecall(x.id)}
            onSchedule={scheduleFromRecalls}
            onDetails={() => router.navigate({ pathname: '/(tabs)/recalls/[id]', params: { id: x.id } })}
          />
        ))}
        {shown.length === 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 16, backgroundColor: color.sunken, padding: 16 }}>
            <Icon name="shield-check-fill" size={19} color={color.teal} />
            <Sans size={14} color={color.ink2}>{emptyText(rFilter)}</Sans>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// `flex: {{ grow }}` with `transition: flex-grow .5s ease` (line 207)
function StripSegment({ grow, tone }: { grow: number; tone: string }) {
  const g = useSharedValue(grow);
  useEffect(() => { g.value = withTiming(grow, { duration: dur.strip, easing: bez(ease.css) }); }, [grow, g]);
  const style = useAnimatedStyle(() => ({ flexGrow: g.value }));
  return <Animated.View testID="strip-segment" style={[{ flexBasis: 0, borderRadius: 3, backgroundColor: tone }, style]} />;
}
```

- [ ] **Step 3: `src/screens/recalls/RecallDetailScreen.tsx`** (lines 127–180; `detailVals` 1455)

```tsx
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RECALLS_COPY } from '../../fixtures/recalls';
import { allRecalls, detailFor } from '../../lib/recalls';
import { useAppStore } from '../../store/useAppStore';
import { color } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { MetalButton } from '../../ui/MetalButton';
import { StatusChip } from '../../ui/StatusChip';
import { Mono, Sans } from '../../ui/Txt';

export function RecallDetailScreen({ id, onBack }: { id: string; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const vehicles = useAppStore((s) => s.vehicles);
  const scheduled = useAppStore((s) => s.scheduled);
  const scheduleFromRecalls = useAppStore((s) => s.scheduleFromRecalls);
  const flash = useAppStore((s) => s.flash);
  const d = detailFor(allRecalls(vehicles, scheduled), vehicles, id);
  if (!d) return null;
  return (
    <View style={{ flex: 1 }} testID="recall-detail">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 20, paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable accessibilityLabel="Back" onPress={onBack} style={{ width: 36, height: 36, marginLeft: -8, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="arrow-left-line" size={20} color={color.ink} />
          </Pressable>
          <Mono size={10} ls={1.6} color={color.ink3}>{d.code}</Mono>
          <View style={{ marginLeft: 'auto' }}>
            <StatusChip bg={d.meta.chipBg} fg={d.meta.chipFg} icon={d.meta.icon} label={d.meta.status} />
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Sans size={28} lh={33} weight={600} ls={-0.9} color={color.ink}>{d.title}</Sans>
          <Sans size={14} color={color.ink5}>{d.vehicle}</Sans>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {d.facts.map((f) => (
            <View key={f.k} style={{ width: '48%', flexGrow: 1, borderRadius: 14, backgroundColor: color.sunken, paddingVertical: 13, paddingHorizontal: 14, gap: 5 }}>
              <Mono size={9} ls={1.3} color={color.ink3}>{f.k}</Mono>
              <Sans size={15} weight={500} color={color.ink}>{f.v}</Sans>
            </View>
          ))}
        </View>

        <View style={{ gap: 9 }}>
          <Mono size={10} ls={1.8} color={color.ink4}>{RECALLS_COPY.why}</Mono>
          <Sans size={15} lh={23} color={color.ink2}>{d.why}</Sans>
        </View>

        <View style={{ gap: 11 }}>
          <Mono size={10} ls={1.8} color={color.ink4}>{RECALLS_COPY.remedy}</Mono>
          {d.steps.map((st) => (
            <View key={st.n} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' }}>
                <Mono size={11} color={color.textOnDark}>{String(st.n)}</Mono>
              </View>
              <View style={{ flex: 1, gap: 2, paddingTop: 2 }}>
                <Sans size={14} weight={500} color={color.ink}>{st.title}</Sans>
                <Sans size={13} lh={19} color={color.ink5}>{st.body}</Sans>
              </View>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, backgroundColor: color.sunken, paddingVertical: 14, paddingHorizontal: 15 }}>
          <Icon name="information-line" size={17} color={color.blueDeep} />
          <Sans size={13} lh={19} color={color.ink2} style={{ flex: 1 }}>{d.note}</Sans>
        </View>
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'stretch', paddingTop: 12, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: 'rgba(255,255,255,0.94)', borderTopWidth: 1, borderTopColor: color.hair07 }}>
        {d.state === 'open' ? (
          <MetalButton tint="blue" label={RECALLS_COPY.scheduleRepair} icon="calendar-2-line" flex={1} width="auto" height={54} radius={999} gap={9} iconSize={17} fontSize={15} onPress={scheduleFromRecalls} />
        ) : (
          <View style={{ flex: 1, height: 54, borderRadius: 999, backgroundColor: color.sunken, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icon name="checkbox-circle-line" size={17} color={color.ink5} />
            <Sans size={15} weight={500} color={color.ink5}>{d.state === 'scheduled' ? RECALLS_COPY.scheduledLabel : RECALLS_COPY.repairComplete}</Sans>
          </View>
        )}
        <Pressable accessibilityLabel="Call the service centre" onPress={() => flash(RECALLS_COPY.callToast)}
          style={{ width: 54, height: 54, borderRadius: 999, borderWidth: 1, borderColor: color.hair14, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="phone-line" size={19} color={color.ink} />
        </Pressable>
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Routes** — delete `app/(tabs)/recalls.tsx`, then create:

`app/(tabs)/recalls/_layout.tsx`
```tsx
import { Stack } from 'expo-router';
export default function RecallsStack() {
  return <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: 'transparent' } }} />;
}
```
`app/(tabs)/recalls/index.tsx`
```tsx
import { RecallsScreen } from '../../../src/screens/recalls/RecallsScreen';
export default function RecallsRoute() { return <RecallsScreen />; }
```
`app/(tabs)/recalls/[id].tsx`
```tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RecallDetailScreen } from '../../../src/screens/recalls/RecallDetailScreen';

export default function RecallDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  return <RecallDetailScreen id={String(id)} onBack={() => router.back()} />;
}
```

- [ ] **Step 5: `src/ui/HumpTabBar.tsx`** — change the tab item's `onPress` so both stacks pop to their root on a tab tap (line 2366's `rDetail: null`):

```tsx
              onPress={() => { switchTab(t.id); navigation.navigate(t.id, t.id === 'garage' || t.id === 'recalls' ? { screen: 'index' } : undefined); }}
```

- [ ] **Step 6: `app/(tabs)/garage/[id].tsx`** — replace the whole file (stats "Details", source line 1401: recalls tab, filter `open`, that recall expanded):

```tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VehicleStatsScreen } from '../../../src/screens/VehicleStatsScreen';
import { useAppStore } from '../../../src/store/useAppStore';

export default function StatsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const showRecall = useAppStore((s) => s.showRecall);
  return (
    <VehicleStatsScreen
      id={Number(id)}
      onBack={() => router.back()}
      onRecallDetails={() => { showRecall('v' + id); router.navigate('/(tabs)/recalls'); }}
    />
  );
}
```

- [ ] **Step 7: Tests** `src/screens/recalls/__tests__/recalls.test.tsx`

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { RecallDetailScreen } from '../RecallDetailScreen';
import { RecallsScreen } from '../RecallsScreen';
import { resetAppStore, useAppStore } from '../../../store/useAppStore';

const s = () => useAppStore.getState();
beforeEach(() => { resetAppStore(); jest.clearAllMocks(); });

describe('RecallsScreen', () => {
  it('renders the title, headline, hero, filters and the open recall card', () => {
    const { getByText, getByLabelText } = render(<RecallsScreen />);
    expect(getByText('Recalls')).toBeTruthy();
    expect(getByText('1 OPEN RECALL · 3 VEHICLES MONITORED')).toBeTruthy();
    expect(getByText('1 needs action')).toBeTruthy();
    expect(getByText('A free remedy is available. Booking it clears the flag on your vehicle health score.')).toBeTruthy();
    expect(getByText('1 OPEN')).toBeTruthy();
    expect(getByText('3 RESOLVED')).toBeTruthy();
    expect(getByLabelText('OPEN').props.accessibilityState).toEqual({ selected: true });
    expect(getByText('ACTION REQUIRED')).toBeTruthy();
    expect(getByText('NHTSA 24V-137')).toBeTruthy();
    expect(getByText('Model S Plaid · Reported 12 Feb 2026')).toBeTruthy();
    expect(getByLabelText('Schedule Repair')).toBeTruthy();
    expect(getByLabelText('Add Vehicle')).toBeTruthy();
  });
  it('tapping the card expands its rows; tapping again collapses', () => {
    const { getByTestId, queryByTestId, getByText } = render(<RecallsScreen />);
    expect(queryByTestId('recall-rows-v1')).toBeNull();
    fireEvent.press(getByTestId('recall-v1'));
    expect(getByTestId('recall-rows-v1')).toBeTruthy();
    expect(getByText('Tesla Service — 6.2 mi')).toBeTruthy();
    fireEvent.press(getByTestId('recall-v1'));
    expect(queryByTestId('recall-rows-v1')).toBeNull();
  });
  it('filters: scheduled is empty at first; resolved lists the three history rows', () => {
    const { getByLabelText, getByText, queryByText } = render(<RecallsScreen />);
    fireEvent.press(getByLabelText('SCHEDULED'));
    expect(getByText('Nothing scheduled right now.')).toBeTruthy();
    fireEvent.press(getByLabelText('RESOLVED'));
    expect(getByText('Front seat belt anchor torque')).toBeTruthy();
    expect(getByText('Civic Type R · Repaired 27 Jun 2023')).toBeTruthy();
    expect(queryByText('Rear camera image failure')).toBeNull();
  });
  it('Schedule Repair books it, toasts and switches to the scheduled filter', () => {
    const { getByLabelText, getByText } = render(<RecallsScreen />);
    fireEvent.press(getByLabelText('Schedule Repair'));
    expect(s()).toMatchObject({ scheduled: true, rFilter: 'scheduled', toast: 'Service booked · Thu 10:30 AM' });
    expect(getByText('1 in the shop')).toBeTruthy();
    expect(getByText('REPAIR SCHEDULED')).toBeTruthy();
    expect(getByText('Model S Plaid · Booked Thu 10:30 AM')).toBeTruthy();
    expect(getByText('NOTHING OPEN · 3 VEHICLES MONITORED')).toBeTruthy();
  });
  it('See details navigates to the detail route', () => {
    const { getByLabelText } = render(<RecallsScreen />);
    fireEvent.press(getByLabelText('See details'));
    expect(router.navigate).toHaveBeenCalledWith({ pathname: '/(tabs)/recalls/[id]', params: { id: 'v1' } });
  });
  it('Add Vehicle opens the add sheet', () => {
    const { getByLabelText } = render(<RecallsScreen />);
    fireEvent.press(getByLabelText('Add Vehicle'));
    expect(s().sheet).toBe('add');
  });
});

describe('RecallDetailScreen', () => {
  it('renders the open recall with facts, remedy steps, note and the Schedule Repair CTA', () => {
    const onBack = jest.fn();
    const { getByText, getByLabelText } = render(<RecallDetailScreen id="v1" onBack={onBack} />);
    expect(getByText('NHTSA 24V-137')).toBeTruthy();
    expect(getByText('ACTION REQUIRED')).toBeTruthy();
    expect(getByText('Rear camera image failure')).toBeTruthy();
    expect(getByText('Model S Plaid · Reported 12 Feb 2026')).toBeTruthy();
    expect(getByText('UNITS AFFECTED')).toBeTruthy();
    expect(getByText('125,227')).toBeTruthy();
    expect(getByText('WHY THIS MATTERS')).toBeTruthy();
    expect(getByText('THE REMEDY')).toBeTruthy();
    expect(getByText('Display self-test')).toBeTruthy();
    expect(getByText('Until the update is applied, check behind the vehicle before reversing rather than relying on the screen.')).toBeTruthy();
    fireEvent.press(getByLabelText('Schedule Repair'));
    expect(s()).toMatchObject({ scheduled: true, rFilter: 'scheduled' });
    fireEvent.press(getByLabelText('Back'));
    expect(onBack).toHaveBeenCalled();
  });
  it('shows the scheduled and complete footers, and the phone toast', () => {
    s().schedule();
    const { getByText, getByLabelText, rerender } = render(<RecallDetailScreen id="v1" onBack={jest.fn()} />);
    expect(getByText('REPAIR SCHEDULED')).toBeTruthy();
    expect(getByText('Scheduled Thu 10:30 AM')).toBeTruthy();
    fireEvent.press(getByLabelText('Call the service centre'));
    expect(s().toast).toBe('Calling the service centre is not wired up here');
    rerender(<RecallDetailScreen id="h2" onBack={jest.fn()} />);
    expect(getByText('RESOLVED')).toBeTruthy();
    expect(getByText('Repair complete')).toBeTruthy();
    expect(getByText('Taycan 4S · Repaired 02 Nov 2024')).toBeTruthy();
  });
  it('renders nothing for an unknown id', () => {
    const { toJSON } = render(<RecallDetailScreen id="nope" onBack={jest.fn()} />);
    expect(toJSON()).toBeNull();
  });
});
```

- [ ] **Step 8: Gate** — `npm test -- recalls`, `npm test -- OverlayHost`, `npm test -- VehicleStats`, then `npm test && npm run typecheck`. Report.

**Checkpoint commit message (controller):** `feat: Recalls tab, recall cards and the recall detail route`

---

### Task 7: Service tab — form, confirmation, reason sheet

**Files:**
- Create: `src/screens/service/ServiceScreen.tsx`, `src/screens/service/ServiceDone.tsx`, `src/screens/service/ReasonSheet.tsx`, `src/screens/service/__tests__/service.test.tsx`
- Modify: `app/(tabs)/service.tsx` (replace the stub route)

**Interfaces:** `ServiceScreen` (no props), `ServiceDone` (no props), `ReasonSheet` (no props; Task 12 mounts it when `sheet === 'reason'`).

- [ ] **Step 1: `src/screens/service/ServiceDone.tsx`** (lines 490–533; vals 1646–1677)

```tsx
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import { SERVICE_COPY } from '../../fixtures/service';
import { cssAngleToPoints } from '../../lib/gradient';
import { doneDetails, trackerSteps } from '../../lib/service';
import { useAppStore } from '../../store/useAppStore';
import { color } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { MetalButton } from '../../ui/MetalButton';
import { Mono, Sans } from '../../ui/Txt';

const FACE = cssAngleToPoints(160, 58, 58);

export function ServiceDone() {
  const router = useRouter();
  const svcMethod = useAppStore((s) => s.svcMethod);
  const svcDate = useAppStore((s) => s.svcDate);
  const svcTime = useAppStore((s) => s.svcTime);
  const returnToGarage = useAppStore((s) => s.returnToGarage);
  const details = doneDetails(svcDate, svcTime, svcMethod);
  const steps = trackerSteps();
  return (
    <View style={{ gap: 26 }} testID="service-done">
      <View style={{ alignItems: 'center', gap: 12, paddingTop: 22, paddingBottom: 4 }}>
        <View style={{ width: 146, height: 146, borderRadius: 73, alignItems: 'center', justifyContent: 'center', backgroundColor: color.sunken, borderWidth: 1, borderColor: color.doneRing, boxShadow: '0 0 34px rgba(15,99,143,0.14)' }}>
          <LinearGradient colors={['#2E93C4', '#0F638F', '#0B4E73']} locations={[0, 0.55, 1]} start={FACE.start} end={FACE.end}
            style={{ width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check-line" size={32} color="#EAF7FF" />
          </LinearGradient>
        </View>
        <Sans size={28} lh={32} weight={600} ls={-0.9} color={color.ink} style={{ marginTop: 6 }}>{SERVICE_COPY.confirmed}</Sans>
        <Sans size={13} color={color.ink5}>{SERVICE_COPY.scheduledSub}</Sans>
      </View>

      <View style={{ borderRadius: 16, backgroundColor: color.sunken, paddingHorizontal: 18 }}>
        {details.map((x) => (
          <View key={x.label} style={{ minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 18, borderTopWidth: 1, borderTopColor: x.line }}>
            <View style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface }}>
              <Icon name={x.icon} size={20} color={color.ink2} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Mono size={9} ls={1.3} color={color.ink3}>{x.label}</Mono>
              <Sans size={18} weight={600} ls={-0.3} color={color.ink}>{x.value}</Sans>
              <Sans size={12} color={color.ink5}>{x.secondary}</Sans>
            </View>
          </View>
        ))}
      </View>

      <View style={{ gap: 14 }}>
        <Mono size={10} ls={1.8} color={color.ink4}>{SERVICE_COPY.tracker}</Mono>
        <View>
          {steps.map((st) => (
            <View key={st.label} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 52 }}>
              <View style={{ width: 20, alignItems: 'center' }}>
                <View style={{ position: 'absolute', top: 20, bottom: -32, width: 1, backgroundColor: st.rail }} />
                <View style={{ width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: st.nodeBg, borderWidth: st.nodeBorderWidth, borderColor: st.nodeBorderColor }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: st.dot }} />
                </View>
              </View>
              <Sans size={st.size} weight={st.weight} ls={st.track} color={st.fg}>{st.label}</Sans>
            </View>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row' }}>
        <MetalButton tint="blue" label={SERVICE_COPY.returnToGarage} icon="inbox-line" flex={1} width="auto" height={54} radius={999} gap={9} iconSize={17} fontSize={15}
          onPress={() => { returnToGarage(); router.navigate('/(tabs)/garage'); }} />
      </View>
    </View>
  );
}
```

- [ ] **Step 2: `src/screens/service/ServiceScreen.tsx`** (lines 363–488; vals 1562–1645)

```tsx
import { type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SERVICE_COPY, SVC_DATES, SVC_METHODS, SVC_TIMES } from '../../fixtures/service';
import { openRecallVehicle, reasonVals } from '../../lib/service';
import { useAppStore } from '../../store/useAppStore';
import { color } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { MetalButton } from '../../ui/MetalButton';
import { ShineBorder } from '../../ui/ShineBorder';
import { TiltMap } from '../../ui/TiltMap';
import { Mono, Sans } from '../../ui/Txt';
import { ServiceDone } from './ServiceDone';

// Reason card shell (lines 374–379): r16, padding 2, overflow hidden; the caution ramp spins behind it when a recall is open.
function ReasonShell({ caution, shell, children }: { caution: boolean; shell: string; children: ReactNode }) {
  return caution
    ? <ShineBorder ramp="caution" radius={16} style={{ padding: 2 }}>{children}</ShineBorder>
    : <View style={{ borderRadius: 16, padding: 2, overflow: 'hidden', backgroundColor: shell }}>{children}</View>;
}

export function ServiceScreen() {
  const insets = useSafeAreaInsets();
  const vehicles = useAppStore((s) => s.vehicles);
  const svcMethod = useAppStore((s) => s.svcMethod);
  const svcDate = useAppStore((s) => s.svcDate);
  const svcTime = useAppStore((s) => s.svcTime);
  const svcDone = useAppStore((s) => s.svcDone);
  const openSheet = useAppStore((s) => s.openSheet);
  const setSvcMethod = useAppStore((s) => s.setSvcMethod);
  const setSvcDate = useAppStore((s) => s.setSvcDate);
  const setSvcTime = useAppStore((s) => s.setSvcTime);
  const confirmService = useAppStore((s) => s.confirmService);
  const flash = useAppStore((s) => s.flash);
  const open = openRecallVehicle(vehicles);
  const r = reasonVals(open);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 24, paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
      {svcDone ? <ServiceDone /> : (
        <View style={{ gap: 24 }}>
          <View style={{ gap: 5 }}>
            <Sans size={30} lh={34} weight={600} ls={-1} color={color.ink}>{SERVICE_COPY.title}</Sans>
            <Sans size={13} color={color.ink5}>{SERVICE_COPY.sub}</Sans>
          </View>

          <Pressable accessibilityRole="button" accessibilityLabel={r.reason} onPress={() => { if (open) openSheet('reason'); }} testID="reason-card">
            <ReasonShell caution={r.caution} shell={r.shell}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, backgroundColor: color.sunken, paddingVertical: 15, paddingHorizontal: 16 }}>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <Icon name={r.icon} size={13} color={r.tone} />
                    <Mono size={9} ls={1.4} color={r.tone}>{r.ref}</Mono>
                  </View>
                  <Sans size={18} lh={23} weight={600} ls={-0.3} color={color.ink}>{r.reason}</Sans>
                  <Mono size={9} ls={1.2} color={color.ink3}>{r.hint}</Mono>
                </View>
                <Icon name="arrow-right-s-line" size={20} color={color.ink4} />
              </View>
            </ReasonShell>
          </Pressable>

          <View style={{ gap: 11 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <Mono size={10} ls={1.8} color={color.ink4}>{SERVICE_COPY.selectedCenter}</Mono>
              <Pressable accessibilityRole="button" accessibilityLabel={SERVICE_COPY.change} onPress={() => flash(SERVICE_COPY.changeToast)} hitSlop={8}>
                <Sans size={12} weight={500} color={color.blueDeep}>{SERVICE_COPY.change}</Sans>
              </Pressable>
            </View>
            <TiltMap />
          </View>

          <View style={{ gap: 11 }}>
            <Mono size={10} ls={1.8} color={color.ink4}>{SERVICE_COPY.method}</Mono>
            <View style={{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 14, backgroundColor: color.sunken }}>
              {SVC_METHODS.map((m) => {
                const on = svcMethod === m.key;
                return (
                  <Pressable key={m.key} accessibilityRole="button" accessibilityLabel={m.label} accessibilityState={{ selected: on }} onPress={() => setSvcMethod(m.key)}
                    style={{ flex: 1, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, backgroundColor: on ? color.surface : 'transparent', boxShadow: on ? '0 1px 2px rgba(0,0,0,0.08)' : undefined }}>
                    <Icon name={m.icon} size={16} color={on ? color.ink : color.ink5} />
                    <Sans size={13} weight={500} color={on ? color.ink : color.ink5}>{m.label}</Sans>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ gap: 11 }}>
            <Mono size={10} ls={1.8} color={color.ink4}>{SERVICE_COPY.selectDate}</Mono>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }}>
              {SVC_DATES.map((d) => {
                const on = svcDate === d.date;
                return (
                  <Pressable key={d.date} accessibilityRole="button" accessibilityLabel={d.day + ' ' + d.date} accessibilityState={{ selected: on }} onPress={() => setSvcDate(d.date)}
                    style={{ width: 66, height: 82, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 16, backgroundColor: on ? color.infoBg : color.surface, borderWidth: 1, borderColor: on ? color.blueDeep : color.hair10 }}>
                    <Mono size={9} ls={1.2} color={on ? color.blueDeep : color.ink4}>{d.day}</Mono>
                    <Sans size={22} weight={600} ls={-0.6} color={on ? color.blueDeep : color.ink}>{d.date}</Sans>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={{ gap: 11 }}>
            <Mono size={10} ls={1.8} color={color.ink4}>{SERVICE_COPY.times}</Mono>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {SVC_TIMES.map((t, i) => {
                const off = i === 0;                       // line 1626: the first slot is unavailable
                const on = !off && svcTime === t;
                return (
                  <Pressable key={t} accessibilityRole="button" accessibilityLabel={t} accessibilityState={{ selected: on, disabled: off }} disabled={off} onPress={() => setSvcTime(t)}
                    style={{ width: '31%', flexGrow: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: on ? color.infoBg : color.surface, borderWidth: 1, borderColor: on ? color.blueDeep : color.hair10, opacity: off ? 0.35 : 1 }}>
                    <Mono size={12} color={on ? color.blueDeep : color.ink}>{t}</Mono>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ flexDirection: 'row', paddingTop: 2 }}>
            <MetalButton tint="blue" label={SERVICE_COPY.confirm} icon="calendar-check-line" flex={1} width="auto" height={54} radius={999} gap={9} iconSize={17} fontSize={15} onPress={confirmService} />
          </View>
        </View>
      )}
    </ScrollView>
  );
}
```

- [ ] **Step 3: `src/screens/service/ReasonSheet.tsx`** (lines 973–1001; vals 1580–1591)

```tsx
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { EMPTY_REASON, REASONS } from '../../fixtures/recalls';
import { SERVICE_COPY } from '../../fixtures/service';
import { openRecallVehicle, reasonRows } from '../../lib/service';
import { useAppStore } from '../../store/useAppStore';
import { color } from '../../theme/tokens';
import { OutlinePill } from '../../ui/OutlinePill';
import { SheetShell } from '../../ui/Sheet';
import { StatusChip } from '../../ui/StatusChip';
import { Mono, Sans } from '../../ui/Txt';

export function ReasonSheet() {
  const router = useRouter();
  const vehicles = useAppStore((s) => s.vehicles);
  const closeSheet = useAppStore((s) => s.closeSheet);
  const switchTab = useAppStore((s) => s.switchTab);
  const setRecallFilter = useAppStore((s) => s.setRecallFilter);
  const open = openRecallVehicle(vehicles);
  if (!open || !open.recall) return null;
  const recall = open.recall;
  const why = (REASONS[recall.code] ?? EMPTY_REASON).why;
  return (
    <SheetShell onClose={closeSheet} handleMargin={6} paddingBottom={26} gap={14} testID="sheet-reason">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <StatusChip bg={color.red} fg="#fff" icon="alarm-warning-fill" label={SERVICE_COPY.activeRecall} />
        <Mono size={10} ls={1.2} color={color.ink3}>{recall.code}</Mono>
      </View>
      <View style={{ gap: 4 }}>
        <Sans size={21} lh={26} weight={600} ls={-0.5} color={color.ink}>{recall.title}</Sans>
        <Sans size={13} color={color.ink5}>{open.name + ' · ' + open.meta}</Sans>
      </View>
      <View>
        {reasonRows().map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: color.hair07 }}>
            <Mono size={9} ls={1.2} color={color.ink3}>{k}</Mono>
            <Sans size={13} color={color.ink} style={{ textAlign: 'right', flexShrink: 1 }}>{v}</Sans>
          </View>
        ))}
      </View>
      <Sans size={13.5} lh={20} color={color.ink2}>{why}</Sans>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'stretch' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={SERVICE_COPY.continueBooking} onPress={closeSheet}
          style={{ flex: 1.4, height: 50, borderRadius: 999, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' }}>
          <Sans size={14} weight={500} color={color.textOnDark}>{SERVICE_COPY.continueBooking}</Sans>
        </Pressable>
        <OutlinePill label={SERVICE_COPY.fullRecall} icon="arrow-right-up-line" height={50}
          onPress={() => { closeSheet(); switchTab('recalls'); setRecallFilter('open'); router.navigate({ pathname: '/(tabs)/recalls/[id]', params: { id: 'v' + open.id } }); }} />
      </View>
    </SheetShell>
  );
}
```

- [ ] **Step 4: `app/(tabs)/service.tsx`** — replace the whole file

```tsx
import { ServiceScreen } from '../../src/screens/service/ServiceScreen';
export default function ServiceRoute() { return <ServiceScreen />; }
```

- [ ] **Step 5: Tests** `src/screens/service/__tests__/service.test.tsx`

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ReasonSheet } from '../ReasonSheet';
import { ServiceScreen } from '../ServiceScreen';
import { resetAppStore, useAppStore } from '../../../store/useAppStore';

const s = () => useAppStore.getState();
beforeEach(() => { resetAppStore(); jest.clearAllMocks(); });

describe('ServiceScreen (form)', () => {
  it('renders the title, the caution reason card, the centre and every picker', () => {
    const { getByText, getByLabelText } = render(<ServiceScreen />);
    expect(getByText('Schedule Service')).toBeTruthy();
    expect(getByText('REF: NHTSA-24V-137')).toBeTruthy();
    expect(getByText('Rear camera image failure')).toBeTruthy();
    expect(getByText('TAP FOR RECALL DETAILS')).toBeTruthy();
    expect(getByText('SELECTED CENTER')).toBeTruthy();
    expect(getByText('Prime Center')).toBeTruthy();
    expect(getByText('SERVICE METHOD')).toBeTruthy();
    expect(getByLabelText('Drop-off').props.accessibilityState).toEqual({ selected: true });
    expect(getByLabelText('TUE 13').props.accessibilityState).toEqual({ selected: true });
    expect(getByLabelText('09:30 AM').props.accessibilityState).toEqual({ selected: true, disabled: false });
    expect(getByLabelText('08:00 AM').props.accessibilityState).toEqual({ selected: false, disabled: true });
    expect(getByLabelText('Confirm Appointment')).toBeTruthy();
  });
  it('the reason card opens the reason sheet; Change toasts', () => {
    const { getByTestId, getByLabelText } = render(<ServiceScreen />);
    fireEvent.press(getByTestId('reason-card'));
    expect(s().sheet).toBe('reason');
    fireEvent.press(getByLabelText('Change'));
    expect(s().toast).toBe('Dealer map is not wired up here');
  });
  it('pickers update the store; the disabled slot does not', () => {
    const { getByLabelText } = render(<ServiceScreen />);
    fireEvent.press(getByLabelText('Concierge'));
    fireEvent.press(getByLabelText('THU 15'));
    fireEvent.press(getByLabelText('02:30 PM'));
    fireEvent.press(getByLabelText('08:00 AM'));
    expect(s()).toMatchObject({ svcMethod: 'concierge', svcDate: '15', svcTime: '02:30 PM' });
  });
  it('Confirm Appointment books it, toasts and shows the confirmation', () => {
    const { getByLabelText, getByText } = render(<ServiceScreen />);
    fireEvent.press(getByLabelText('Confirm Appointment'));
    expect(s()).toMatchObject({ svcDone: true, scheduled: true, toast: 'Service booked · Tuesday, Oct 13 at 09:30 AM' });
    expect(getByText('Confirmed')).toBeTruthy();
    expect(getByText('Your service request is scheduled.')).toBeTruthy();
    expect(getByText('Tuesday, Oct 13 at 09:30 AM')).toBeTruthy();
    expect(getByText('Drop-off')).toBeTruthy();
    expect(getByText('1200 Technical Blvd')).toBeTruthy();
    expect(getByText('STATUS TRACKER')).toBeTruthy();
    expect(getByText('Appointment confirmed')).toBeTruthy();
    fireEvent.press(getByLabelText('Return to Garage'));
    expect(s()).toMatchObject({ tab: 'garage', svcDone: false });
    expect(router.navigate).toHaveBeenCalledWith('/(tabs)/garage');
  });
  it('shows the routine card when no vehicle has a recall', () => {
    useAppStore.setState({ vehicles: s().vehicles.map((v) => ({ ...v, recall: null })) });
    const { getByText, getByTestId } = render(<ServiceScreen />);
    expect(getByText('REF: NHTSA-24V001')).toBeTruthy();
    expect(getByText('System Diagnostic & Update')).toBeTruthy();
    expect(getByText('ROUTINE MAINTENANCE VISIT')).toBeTruthy();
    fireEvent.press(getByTestId('reason-card'));
    expect(s().sheet).toBeNull();
  });
});

describe('ReasonSheet', () => {
  it('renders the recall, rows and why; Continue booking closes; Full recall opens the detail', () => {
    s().openSheet('reason');
    const { getByText, getByLabelText } = render(<ReasonSheet />);
    expect(getByText('ACTIVE SAFETY RECALL')).toBeTruthy();
    expect(getByText('NHTSA 24V-137')).toBeTruthy();
    expect(getByText('Model S Plaid · 2024 Tesla · 42,000 mi')).toBeTruthy();
    expect(getByText('Prime Center — 4.2 mi')).toBeTruthy();
    expect(getByText(/rear camera image while the vehicle is in reverse/)).toBeTruthy();
    fireEvent.press(getByLabelText('Continue booking'));
    expect(s().sheet).toBeNull();
    s().openSheet('reason');
    fireEvent.press(getByLabelText('Full recall'));
    expect(s()).toMatchObject({ sheet: null, tab: 'recalls', rFilter: 'open' });
    expect(router.navigate).toHaveBeenCalledWith({ pathname: '/(tabs)/recalls/[id]', params: { id: 'v1' } });
  });
  it('renders nothing without an open recall', () => {
    useAppStore.setState({ vehicles: s().vehicles.map((v) => ({ ...v, recall: null })) });
    expect(render(<ReasonSheet />).toJSON()).toBeNull();
  });
});
```

- [ ] **Step 6: Gate** — `npm test -- service`, then `npm test && npm run typecheck`. Report.

**Checkpoint commit message (controller):** `feat: Service tab — booking form with tilt map, reason sheet, confirmation`

---

### Task 8: Hub tab — article rail, dots, light filter, light grid, light sheet

**Files:**
- Create: `src/screens/hub/HubScreen.tsx`, `src/screens/hub/ArticleCard.tsx`, `src/screens/hub/LightSheet.tsx`, `src/screens/hub/__tests__/hub.test.tsx`
- Modify: `app/(tabs)/hub.tsx` (replace the stub route)

**Interfaces:** `HubScreen` (no props), `ArticleCard { article, onPress }`, `LightSheet` (no props; Task 12 mounts it while `hubLight` is set).

- [ ] **Step 1: `src/screens/hub/ArticleCard.tsx`** (lines 651–664)

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, View } from 'react-native';
import type { Article } from '../../fixtures/types';
import { cssAngleToPoints } from '../../lib/gradient';
import { color } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { Mono, Sans } from '../../ui/Txt';

const WASH = cssAngleToPoints(135, 318, 132);   // linear-gradient(135deg, from 0%, to 100%) over the 318×132 wash

export function ArticleCard({ article: a, onPress }: { article: Article; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={a.title} onPress={onPress} testID={`article-${a.id}`}
      style={{ width: 318, borderRadius: 18, overflow: 'hidden', backgroundColor: color.sunken }}>
      <LinearGradient colors={a.wash} start={WASH.start} end={WASH.end} style={{ height: 132, justifyContent: 'space-between', padding: 16 }}>
        <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.9)', paddingVertical: 5, paddingHorizontal: 10 }}>
          <Icon name={a.icon} size={12} color={color.ink} />
          <Mono size={9} ls={1.3} color={color.ink}>{a.kicker}</Mono>
        </View>
        <Icon name={a.icon} size={44} color="rgba(255,255,255,0.85)" style={{ alignSelf: 'flex-end' }} />
      </LinearGradient>
      <View style={{ paddingTop: 15, paddingHorizontal: 16, paddingBottom: 17, gap: 6 }}>
        <Sans size={18} lh={23} weight={600} ls={-0.4} color={color.ink}>{a.title}</Sans>
        <Sans size={13} lh={19} color={color.ink5}>{a.dek}</Sans>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <Mono size={9} ls={1.2} color={color.ink3}>{a.read}</Mono>
          <Icon name="arrow-right-up-line" size={14} color={color.ink4} />
        </View>
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 2: `src/screens/hub/HubScreen.tsx`** (lines 635–710; `hubVals` 1901, `startHubAuto` 1890)

```tsx
import { useIsFocused } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ARTICLES } from '../../fixtures/articles';
import { GROUPS, groupChip, HUB_COPY, hubCounter, hubHeadline, visibleLights } from '../../lib/hub';
import { useAppStore } from '../../store/useAppStore';
import { bez, color, dur, ease } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { InfiniteRail, type InfiniteRailHandle } from '../../ui/InfiniteRail';
import { Mono, Sans } from '../../ui/Txt';
import { ArticleCard } from './ArticleCard';

export function HubScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const focused = useIsFocused();
  const hubIdx = useAppStore((s) => s.hubIdx);
  const hubGroup = useAppStore((s) => s.hubGroup);
  const hubLight = useAppStore((s) => s.hubLight);
  const screen = useAppStore((s) => s.screen);
  const sheet = useAppStore((s) => s.sheet);
  const setHubIdx = useAppStore((s) => s.setHubIdx);
  const setHubGroup = useAppStore((s) => s.setHubGroup);
  const openLight = useAppStore((s) => s.openLight);
  const openArticle = useAppStore((s) => s.openArticle);
  const rail = useRef<InfiniteRailHandle>(null);

  // startHubAuto (line 1890): a 5 s interval that glides one card forward unless the tab is hidden or an overlay is open.
  // The interval is never reset by a manual swipe (the source does not reset it either).
  const paused = !focused || !!screen || !!hubLight || !!sheet;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  useEffect(() => {
    const id = setInterval(() => { if (!pausedRef.current) rail.current?.advance(); }, dur.hubAuto);
    return () => clearInterval(id);
  }, []);

  const tile = (width - 40 - 3 * 8) / 4;
  const lights = visibleLights(hubGroup);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 24, paddingTop: insets.top + 24, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
      <View style={{ gap: 6, paddingHorizontal: 20 }}>
        <Sans size={38} lh={42} weight={600} ls={-1.2} color={color.ink}>{HUB_COPY.title}</Sans>
        <Mono size={11} ls={1.4} color={color.ink4}>{hubHeadline()}</Mono>
      </View>

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 20 }}>
          <Mono size={10} ls={1.8} color={color.ink4}>{HUB_COPY.featured}</Mono>
          <Mono size={10} ls={1.8} color={color.ink4}>{hubCounter(hubIdx)}</Mono>
        </View>
        <InfiniteRail
          ref={rail}
          testID="hub-rail"
          count={ARTICLES.length}
          index={hubIdx}
          onIndexChange={setHubIdx}
          keyFor={(i) => ARTICLES[i].id}
          renderItem={(i) => <ArticleCard article={ARTICLES[i]} onPress={() => openArticle(ARTICLES[i].id)} />}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20 }} testID="hub-dots">
          {ARTICLES.map((a, i) => <Dot key={a.id} active={i === hubIdx} onPress={() => rail.current?.scrollTo(i, true)} />)}
        </View>
      </View>

      <View style={{ gap: 12, paddingHorizontal: 20 }}>
        <View style={{ gap: 5 }}>
          <Mono size={10} ls={1.8} color={color.ink4}>{HUB_COPY.lights}</Mono>
          <Sans size={13} lh={19} color={color.ink5}>{HUB_COPY.lightsSub}</Sans>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
          {GROUPS.map((k) => {
            const g = groupChip(k, hubGroup);
            return (
              <Pressable key={k} accessibilityRole="button" accessibilityLabel={g.label} accessibilityState={{ selected: g.on }} onPress={() => setHubGroup(k)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12, backgroundColor: g.bg, borderWidth: 1, borderColor: g.edge }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: g.dot }} />
                <Mono size={9} ls={1.2} color={g.fg}>{g.label}</Mono>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {lights.map((l) => (
            <Pressable key={l.id} accessibilityRole="button" accessibilityLabel={l.name} onPress={() => openLight(l.id)} testID={`light-${l.id}`}
              style={{ width: tile, aspectRatio: 1, borderRadius: 14, backgroundColor: color.sunken, borderWidth: 1, borderColor: hubLight === l.id ? color.hair20 : 'transparent', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 6 }}>
              <View style={{ height: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                {l.icon ? <Icon name={l.icon} size={23} color={l.tone} /> : null}
                {l.glyph ? <Mono size={13} weight={500} ls={0.4} color={l.tone}>{l.glyph}</Mono> : null}
              </View>
              <Sans size={9.5} lh={12} color={color.ink3} center>{l.short}</Sans>
            </Pressable>
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, backgroundColor: color.sunken, paddingVertical: 13, paddingHorizontal: 15 }}>
          <Icon name="information-line" size={16} color={color.blueDeep} />
          <Sans size={12} lh={18} color={color.ink2} style={{ flex: 1 }}>{HUB_COPY.note}</Sans>
        </View>
      </View>
    </ScrollView>
  );
}

// dots (line 669): 2 px tall, r1; active 22 px #17161A, inactive 6 px #dcdbd8; width/background .3s ease
function Dot({ active, onPress }: { active: boolean; onPress: () => void }) {
  const a = useSharedValue(active ? 1 : 0);
  useEffect(() => { a.value = withTiming(active ? 1 : 0, { duration: dur.color, easing: bez(ease.css) }); }, [active, a]);
  const style = useAnimatedStyle(() => ({ width: 6 + 16 * a.value }));
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <Animated.View style={[{ height: 2, borderRadius: 1, backgroundColor: active ? color.ink : color.handle }, style]} />
    </Pressable>
  );
}
```

- [ ] **Step 3: `src/screens/hub/LightSheet.tsx`** (lines 897–922; vals 1938–1946)

```tsx
import { Pressable, View } from 'react-native';
import { BADGE, HUB_COPY, lightById } from '../../lib/hub';
import { useAppStore } from '../../store/useAppStore';
import { color } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { SheetShell } from '../../ui/Sheet';
import { StatusChip } from '../../ui/StatusChip';
import { Mono, Sans } from '../../ui/Txt';

export function LightSheet() {
  const hubLight = useAppStore((s) => s.hubLight);
  const closeLight = useAppStore((s) => s.closeLight);
  const l = lightById(hubLight);
  if (!l) return null;
  const [badge, badgeBg, badgeFg] = BADGE[l.group];
  return (
    <SheetShell onClose={closeLight} handleMargin={6} paddingBottom={26} gap={14} testID="sheet-light">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
        <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: color.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          {l.icon ? <Icon name={l.icon} size={27} color={l.tone} /> : null}
          {l.glyph ? <Mono size={15} weight={500} color={l.tone}>{l.glyph}</Mono> : null}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Sans size={19} weight={600} ls={-0.4} color={color.ink}>{l.name}</Sans>
          <View style={{ alignSelf: 'flex-start' }}>
            <StatusChip bg={badgeBg} fg={badgeFg} label={badge} ls={1.3} padX={9} padY={4} />
          </View>
        </View>
      </View>
      <Sans size={14} lh={21} color={color.ink2}>{l.means}</Sans>
      <View style={{ gap: 9, borderRadius: 14, backgroundColor: color.sunken, paddingVertical: 14, paddingHorizontal: 15 }}>
        <Mono size={9} ls={1.3} color={color.ink3}>{HUB_COPY.whatToDo}</Mono>
        <Sans size={13.5} lh={20} color={color.ink}>{l.action}</Sans>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={HUB_COPY.gotIt} onPress={closeLight}
        style={{ height: 50, borderRadius: 999, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' }}>
        <Sans size={14} weight={500} color={color.textOnDark}>{HUB_COPY.gotIt}</Sans>
      </Pressable>
    </SheetShell>
  );
}
```

- [ ] **Step 4: `app/(tabs)/hub.tsx`** — replace the whole file

```tsx
import { HubScreen } from '../../src/screens/hub/HubScreen';
export default function HubRoute() { return <HubScreen />; }
```

- [ ] **Step 5: Tests** `src/screens/hub/__tests__/hub.test.tsx`

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { FlatList } from 'react-native';
import { HubScreen } from '../HubScreen';
import { LightSheet } from '../LightSheet';
import { resetAppStore, useAppStore } from '../../../store/useAppStore';

const s = () => useAppStore.getState();
beforeEach(() => { resetAppStore(); jest.clearAllMocks(); });

describe('HubScreen', () => {
  it('renders the title, headline, featured rail, counter, groups and all twenty lights', () => {
    const { getByText, getAllByText, getByLabelText, getByTestId } = render(<HubScreen />);
    expect(getByText('Hub')).toBeTruthy();
    expect(getByText('4 ARTICLES · 20 DASHBOARD LIGHTS')).toBeTruthy();
    expect(getByText('FEATURED READING')).toBeTruthy();
    expect(getByText('01 / 04')).toBeTruthy();
    expect(getAllByText('What actually happens after a recall is issued')).toHaveLength(3);   // tripled rail
    expect(getAllByText('RECALL BASICS')).toHaveLength(3);
    expect(getByLabelText('ALL').props.accessibilityState).toEqual({ selected: true });
    expect(getByText('STOP NOW')).toBeTruthy();
    expect(getByTestId('light-l1')).toBeTruthy();
    expect(getByTestId('light-l20')).toBeTruthy();
    expect(getByText('ABS')).toBeTruthy();
    expect(getByText('Oil pressure')).toBeTruthy();
    expect(getByText("Symbols vary by manufacturer. Your owner's manual is the final word for your vehicle.")).toBeTruthy();
  });
  it('group chips filter the grid', () => {
    const { getByLabelText, queryByTestId, getByTestId } = render(<HubScreen />);
    fireEvent.press(getByLabelText('STOP NOW'));
    expect(s().hubGroup).toBe('critical');
    expect(getByTestId('light-l1')).toBeTruthy();
    expect(queryByTestId('light-l8')).toBeNull();
    fireEvent.press(getByLabelText('STATUS'));
    expect(getByTestId('light-l17')).toBeTruthy();
    expect(queryByTestId('light-l1')).toBeNull();
  });
  it('tapping a light opens the light sheet; tapping a card opens the article', () => {
    const { getByTestId, getAllByTestId } = render(<HubScreen />);
    fireEvent.press(getByTestId('light-l8'));
    expect(s().hubLight).toBe('l8');
    fireEvent.press(getAllByTestId('article-a2')[0]);
    expect(s()).toMatchObject({ screen: 'article', article: 'a2' });
  });
  it('auto-advances every 5 s while nothing is open, and pauses while the light sheet is open', () => {
    jest.useFakeTimers();
    const spy = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation(() => {});
    render(<HubScreen />);
    jest.advanceTimersByTime(5000);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith({ offset: 5 * 332, animated: true });
    useAppStore.getState().openLight('l1');
    jest.advanceTimersByTime(5000);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
    jest.useRealTimers();
  });
});

describe('LightSheet', () => {
  it('renders the light with its badge, means, action and closes on Got it', () => {
    s().openLight('l1');
    const { getByText, getByLabelText } = render(<LightSheet />);
    expect(getByText('Engine oil pressure')).toBeTruthy();
    expect(getByText('STOP DRIVING')).toBeTruthy();
    expect(getByText(/Oil pressure has dropped below the safe minimum/)).toBeTruthy();
    expect(getByText('WHAT TO DO')).toBeTruthy();
    expect(getByText(/Pull over as soon as it is safe/)).toBeTruthy();
    fireEvent.press(getByLabelText('Got it'));
    expect(s().hubLight).toBeNull();
  });
  it('shows the warning and status badges, and the ABS glyph', () => {
    s().openLight('l8');
    const { getByText, rerender } = render(<LightSheet />);
    expect(getByText('ABS')).toBeTruthy();
    expect(getByText('GET IT CHECKED')).toBeTruthy();
    s().openLight('l17');
    rerender(<LightSheet />);
    expect(getByText('Cruise control')).toBeTruthy();
    expect(getByText('STATUS ONLY')).toBeTruthy();
  });
  it('renders nothing when no light is selected', () => {
    expect(render(<LightSheet />).toJSON()).toBeNull();
  });
});
```

- [ ] **Step 6: Gate** — `npm test -- hub`, then `npm test && npm run typecheck`. If the auto-advance test's first `scrollToOffset` call count differs because `onContentSizeChange` fires in the test renderer, assert on the `advance` call only (`toHaveBeenLastCalledWith`) and say so in the report. Report.

**Checkpoint commit message (controller):** `feat: Hub tab — auto-advancing article rail, dashboard lights, light sheet`

---

### Task 9: Article reader — live panel, peek panels, leaver, swipe

**Files:**
- Create: `src/screens/hub/ArticlePanel.tsx`, `src/screens/hub/ArticleReader.tsx`, `src/screens/hub/__tests__/ArticleReader.test.tsx`

**Interfaces:** `ArticleReader` (no props; Task 12 mounts it while `screen === 'article'`), `ArticlePeek { article }`, `Wash { article }`.

**Motion (all `cubic-bezier(.22,1,.36,1)`):** entrance from the hub `translateY(H) → 0` (dir 0) or `translateX(±W) → 0` (dir ±1), 360 ms; the leaving panel `translateX 0 → ∓22 %·W`, opacity 1 → 0, 360 ms, unmounted after 380 ms; drag = the live panel follows `dx` while the neighbour peeks in at `±W + dx`; release `|dx| > 70` → go, else snap back over 300 ms. Drags are ignored while a leaver is animating.

- [ ] **Step 1: `src/screens/hub/ArticlePanel.tsx`** (`articlePanel`, line 1979 — the simplified, non-interactive panel used for peeks and the leaver; `Wash` is the 150 px header shared with the live panel)

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Article } from '../../fixtures/types';
import { cssAngleToPoints } from '../../lib/gradient';
import { color } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { Mono, Sans } from '../../ui/Txt';

export function Wash({ article: a }: { article: Article }) {
  const { width } = useWindowDimensions();
  const pts = cssAngleToPoints(135, width - 40, 150);
  return (
    <LinearGradient colors={a.wash} start={pts.start} end={pts.end} style={{ height: 150, borderRadius: 18, alignItems: 'flex-end', justifyContent: 'flex-end', padding: 16 }}>
      <Icon name={a.icon} size={56} color="rgba(255,255,255,0.85)" />
    </LinearGradient>
  );
}

export function ArticlePeek({ article: a, testID }: { article: Article; testID?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View testID={testID} style={[StyleSheet.absoluteFill, { backgroundColor: color.surface }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: 8 }}>
        <View style={{ width: 38, height: 38, marginLeft: -9, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close-line" size={23} color={color.ink} />
        </View>
        <Mono size={10} ls={1.8} color={color.ink3}>{a.kicker}</Mono>
      </View>
      <View style={{ flex: 1, overflow: 'hidden', gap: 18, paddingTop: 8, paddingHorizontal: 20, paddingBottom: 32 }}>
        <Wash article={a} />
        <Sans size={30} lh={35} weight={600} ls={-1.1} color={color.ink}>{a.title}</Sans>
        <Sans size={15} lh={24} color={color.ink2}>{a.body[0].text}</Sans>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: `src/screens/hub/ArticleReader.tsx`** (lines 924–971; logic 1950–2086)

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, runOnJS, type SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Article } from '../../fixtures/types';
import { articleById, articleIndex, HUB_COPY, neighbour, nextTitle } from '../../lib/hub';
import { useAppStore } from '../../store/useAppStore';
import { color, dur } from '../../theme/tokens';
import { ArticlePeek, Wash } from './ArticlePanel';

type Dir = -1 | 0 | 1;
const EASE = Easing.bezier(0.22, 1, 0.36, 1);   // cubic-bezier(.22,1,.36,1) — precomputed so worklets can capture it
const SWIPE = 70;                                // release threshold (onArtUp)

export function ArticleReader() {
  const { width: W, height: H } = useWindowDimensions();
  const article = useAppStore((s) => s.article);
  const setArticle = useAppStore((s) => s.setArticle);
  const setHubIdx = useAppStore((s) => s.setHubIdx);
  const closeArticle = useAppStore((s) => s.closeArticle);
  const [leaving, setLeaving] = useState<Article | null>(null);
  const [dir, setDir] = useState<Dir>(0);
  const drag = useSharedValue(0);
  const busy = useSharedValue(false);            // a leaver is animating → drags are ignored (line 2003)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const a = articleById(article);

  // goArticle (line 1950): the current article becomes the leaver, the neighbour enters from `dir`, the hub rail follows.
  const go = useCallback((d: 1 | -1) => {
    if (!a || busy.value) return;
    const next = neighbour(a.id, d);
    busy.value = true;
    drag.value = 0;
    setLeaving(a);
    setDir(d);
    setArticle(next.id);
    setHubIdx(articleIndex(next.id));
    clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => { busy.value = false; setLeaving(null); }, dur.leave);
  }, [a, busy, drag, setArticle, setHubIdx]);
  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  const goNext = useCallback(() => go(1), [go]);
  const goPrev = useCallback(() => go(-1), [go]);

  // onArtDown/Move/Up (lines 2002–2022): live once |dx| ≥ 8 with |dx| ≥ |dy|; release beyond 70 px changes article, else snaps back.
  const pan = Gesture.Pan()
    .withTestId('article-pan')
    .activeOffsetX([-8, 8])
    .failOffsetY([-8, 8])
    .onUpdate((e) => { if (!busy.value) drag.value = e.translationX; })
    .onEnd(() => {
      if (busy.value) return;
      const dx = drag.value;
      if (Math.abs(dx) > SWIPE) runOnJS(dx < 0 ? goNext : goPrev)();
      else drag.value = withTiming(0, { duration: dur.snap, easing: EASE });
    });

  const nextStyle = useAnimatedStyle(() => ({ transform: [{ translateX: W + drag.value }] }));
  const prevStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -W + drag.value }] }));

  if (!a) return null;
  const nextA = neighbour(a.id, 1);
  const prevA = neighbour(a.id, -1);
  return (
    <View style={StyleSheet.absoluteFill} testID="article-reader">
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, prevStyle]}><ArticlePeek article={prevA} testID="article-peek-prev" /></Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, nextStyle]}><ArticlePeek article={nextA} testID="article-peek-next" /></Animated.View>
      {leaving && <Leaver key={'leave-' + leaving.id} article={leaving} dir={dir} W={W} />}
      <GestureDetector gesture={pan}>
        <LivePanel key={a.id} article={a} dir={dir} W={W} H={H} drag={drag} onClose={closeArticle} onNext={goNext} onPrev={goPrev} />
      </GestureDetector>
    </View>
  );
}

// articleLeaver + playArticleSwipe's `out` animation: translateX(0) → ∓22 %, opacity 1 → 0, 360 ms, fill forwards.
function Leaver({ article, dir, W }: { article: Article; dir: Dir; W: number }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withTiming(1, { duration: dur.swipe, easing: EASE }); }, [p]);
  const style = useAnimatedStyle(() => ({ opacity: 1 - p.value, transform: [{ translateX: -dir * 0.22 * W * p.value }] }));
  return (
    <Animated.View pointerEvents="none" testID="article-leaver" style={[StyleSheet.absoluteFill, style]}>
      <ArticlePeek article={article} />
    </Animated.View>
  );
}

// The live panel (lines 926–970) — keyed by article id so every article change replays the entrance (playArticleSwipe).
function LivePanel({ article: a, dir, W, H, drag, onClose, onNext, onPrev }:
  { article: Article; dir: Dir; W: number; H: number; drag: SharedValue<number>; onClose: () => void; onNext: () => void; onPrev: () => void }) {
  const insets = useSafeAreaInsets();
  const enter = useSharedValue(1);
  useEffect(() => { enter.value = withTiming(0, { duration: dur.swipe, easing: EASE }); }, [enter]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: drag.value + (dir === 0 ? 0 : dir * W * enter.value) },
      { translateY: dir === 0 ? H * enter.value : 0 },
    ],
  }));
  return (
    <Animated.View testID="article-live" style={[StyleSheet.absoluteFill, { backgroundColor: color.surface, boxShadow: '0 0 40px rgba(0,0,0,0.18)' }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 }}>
          <Pressable accessibilityLabel="Close" onPress={onClose} style={{ width: 38, height: 38, marginLeft: -9, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close-line" size={23} color={color.ink} />
          </Pressable>
          <Mono size={10} ls={1.8} color={color.ink3}>{a.kicker}</Mono>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Pressable accessibilityLabel="Previous article" onPress={onPrev} style={styles.nav}><Icon name="arrow-left-s-line" size={19} color={color.ink2} /></Pressable>
          <Pressable accessibilityLabel="Next article" onPress={onNext} style={styles.nav}><Icon name="arrow-right-s-line" size={19} color={color.ink2} /></Pressable>
        </View>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 18, paddingTop: 8, paddingHorizontal: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <Wash article={a} />
        <View style={{ gap: 8 }}>
          <Sans size={30} lh={35} weight={600} ls={-1.1} color={color.ink}>{a.title}</Sans>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Mono size={9} ls={1.2} color={color.ink3}>{a.read}</Mono>
            <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: color.ink8 }} />
            <Mono size={9} ls={1.2} color={color.ink3}>{a.date}</Mono>
          </View>
        </View>
        {a.body.map((b, i) => (
          <View key={i} style={{ gap: 6 }}>
            {b.heading ? <Sans size={17} weight={600} ls={-0.3} color={color.ink}>{b.heading}</Sans> : null}
            <Sans size={15} lh={24} color={color.ink2}>{b.text}</Sans>
          </View>
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 2 }}>
          <Icon name="drag-move-2-line" size={15} color={color.ink7} />
          <Mono size={9} ls={1.3} color={color.ink7}>{HUB_COPY.swipeHint}</Mono>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={HUB_COPY.nextArticle} onPress={onNext}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, backgroundColor: color.sunken, paddingVertical: 15, paddingHorizontal: 16 }}>
          <View style={{ flex: 1, gap: 3 }}>
            <Mono size={9} ls={1.3} color={color.ink3}>{HUB_COPY.nextArticle}</Mono>
            <Sans size={14} weight={500} color={color.ink}>{nextTitle(a.id)}</Sans>
          </View>
          <Icon name="arrow-right-line" size={19} color={color.ink4} />
        </Pressable>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  nav: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: color.hair12, alignItems: 'center', justifyContent: 'center' },
});
```
(`Icon`, `Mono`, `Sans` are imported from `../../ui/Icon` and `../../ui/Txt` — add those two imports at the top.)

- [ ] **Step 3: Tests** `src/screens/hub/__tests__/ArticleReader.test.tsx`

```tsx
import { act, fireEvent, render } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import type { PanGesture } from 'react-native-gesture-handler';
import { ArticleReader } from '../ArticleReader';
import { resetAppStore, useAppStore } from '../../../store/useAppStore';

const s = () => useAppStore.getState();
beforeEach(() => { resetAppStore(); jest.useFakeTimers(); s().openArticle('a2'); });
afterEach(() => jest.useRealTimers());

describe('ArticleReader', () => {
  it('renders the live article with kicker, meta, headings, hint and the next card', () => {
    const { getByText, getAllByText, getByLabelText } = render(<ArticleReader />);
    expect(getAllByText('MAINTENANCE').length).toBeGreaterThan(0);
    expect(getAllByText('Oil intervals: why the sticker and the manual disagree').length).toBeGreaterThan(0);
    expect(getByText('3 MIN READ')).toBeTruthy();
    expect(getByText('JAN 2026')).toBeTruthy();
    expect(getByText('Read the manual, not the sticker')).toBeTruthy();
    expect(getByText('SWIPE FOR THE NEXT ARTICLE')).toBeTruthy();
    expect(getByText('NEXT ARTICLE')).toBeTruthy();
    expect(getAllByText('Reading a tyre sidewall in thirty seconds').length).toBeGreaterThan(0);   // next card + peek
    expect(getByLabelText('Next article')).toBeTruthy();
    expect(getByLabelText('Previous article')).toBeTruthy();
  });
  it('mounts both neighbour peeks off-screen', () => {
    const { getByTestId } = render(<ArticleReader />);
    expect(getByTestId('article-peek-prev')).toBeTruthy();
    expect(getByTestId('article-peek-next')).toBeTruthy();
  });
  it('Next/Previous change the article, sync the hub index and show a leaver for 380 ms', () => {
    const { getByLabelText, queryByTestId } = render(<ArticleReader />);
    fireEvent.press(getByLabelText('Next article'));
    expect(s()).toMatchObject({ article: 'a3', hubIdx: 2 });
    expect(queryByTestId('article-leaver')).toBeTruthy();
    act(() => { jest.advanceTimersByTime(400); });
    expect(queryByTestId('article-leaver')).toBeNull();
    fireEvent.press(getByLabelText('Previous article'));
    expect(s()).toMatchObject({ article: 'a2', hubIdx: 1 });
    act(() => { jest.advanceTimersByTime(400); });
    fireEvent.press(getByLabelText('Previous article'));
    expect(s().article).toBe('a1');
    act(() => { jest.advanceTimersByTime(400); });
    fireEvent.press(getByLabelText('Previous article'));
    expect(s().article).toBe('a4');   // wraps
  });
  it('ignores a second change while the leaver is still animating', () => {
    const { getByLabelText } = render(<ArticleReader />);
    fireEvent.press(getByLabelText('Next article'));
    fireEvent.press(getByLabelText('Next article'));
    expect(s().article).toBe('a3');
  });
  it('the NEXT ARTICLE card advances; Close clears the article', () => {
    const { getByLabelText } = render(<ArticleReader />);
    fireEvent.press(getByLabelText('NEXT ARTICLE'));
    expect(s().article).toBe('a3');
    fireEvent.press(getByLabelText('Close'));
    expect(s()).toMatchObject({ screen: null, article: null });
  });
  it('a swipe past 70 px changes the article; a short swipe does not', () => {
    render(<ArticleReader />);
    fireGestureHandler<PanGesture>(getByGestureTestId('article-pan'), [
      { state: State.BEGAN }, { state: State.ACTIVE, translationX: -40 }, { state: State.END, translationX: -40 },
    ]);
    expect(s().article).toBe('a2');
    fireGestureHandler<PanGesture>(getByGestureTestId('article-pan'), [
      { state: State.BEGAN }, { state: State.ACTIVE, translationX: -120 }, { state: State.END, translationX: -120 },
    ]);
    expect(s().article).toBe('a3');
    act(() => { jest.advanceTimersByTime(400); });
    fireGestureHandler<PanGesture>(getByGestureTestId('article-pan'), [
      { state: State.BEGAN }, { state: State.ACTIVE, translationX: 120 }, { state: State.END, translationX: 120 },
    ]);
    expect(s().article).toBe('a2');
  });
  it('renders nothing without an article', () => {
    s().closeArticle();
    expect(render(<ArticleReader />).toJSON()).toBeNull();
  });
});
```

- [ ] **Step 4: Gate** — `npm test -- ArticleReader`, then `npm test && npm run typecheck`. If `fireGestureHandler` cannot drive the worklet callbacks in this jest setup, keep the button-driven tests, drop only the swipe test, and say so in the report (the swipe is verified on the emulator in Task 13). Report.

**Checkpoint commit message (controller):** `feat: article reader with swipe, prev/next and the leaver/peek transitions`

---

### Task 10: Profile tab, membership screen, plan cards

**Files:**
- Create: `src/screens/profile/ProfileScreen.tsx`, `src/screens/profile/MembershipScreen.tsx`, `src/screens/profile/PlanCard.tsx`, `src/screens/profile/__tests__/profile.test.tsx`
- Modify: `app/(tabs)/profile.tsx` (replace the stub route), `src/ui/SlideUpScreen.tsx` (add an optional `gap` prop, default 20 — VIN help keeps 20, membership uses 16)

**Interfaces:** `ProfileScreen` (no props), `MembershipScreen` (no props; Task 12 mounts it while `screen === 'membership'`), `PlanCard { plan, active, onSelect }`.

- [ ] **Step 1: `src/ui/SlideUpScreen.tsx`** — add `gap` (only these two lines change):

```tsx
export function SlideUpScreen({ caption, onClose, footer, children, testID, gap = 20 }: { caption: string; onClose: () => void; footer?: ReactNode; children: ReactNode; testID?: string; gap?: number }) {
```
```tsx
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap, paddingTop: 8, paddingHorizontal: 20, paddingBottom: 32 }}>{children}</ScrollView>
```

- [ ] **Step 2: `src/screens/profile/PlanCard.tsx`** (lines 760–792; vals 2096–2124)

```tsx
import { Pressable, View } from 'react-native';
import { MEMBERSHIP_COPY } from '../../fixtures/profile';
import type { Plan } from '../../fixtures/types';
import { featureVals } from '../../lib/membership';
import { color } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { MetalButton } from '../../ui/MetalButton';
import { ShineBorder } from '../../ui/ShineBorder';
import { Sans } from '../../ui/Txt';

export function PlanCard({ plan: p, active, onSelect }: { plan: Plan; active: boolean; onSelect: () => void }) {
  const label = active ? MEMBERSHIP_COPY.current : p.cta;
  const inner = (
    <View style={{ borderRadius: 14, backgroundColor: color.surface, borderWidth: 1, borderColor: p.recommend ? 'transparent' : color.hair10, padding: 18, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ gap: 5 }}>
          <Sans size={18} weight={600} ls={-0.3} color={color.ink}>{p.name}</Sans>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Sans size={32} weight={600} ls={-1.3} color={color.ink}>{p.price}</Sans>
            <Sans size={13} color={color.ink5}>{MEMBERSHIP_COPY.perMonth}</Sans>
          </View>
        </View>
        {p.recommend ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, backgroundColor: color.ink, paddingVertical: 5, paddingHorizontal: 10 }}>
            <Icon name="fire-fill" size={13} color={color.textOnDark} />
            <Sans size={11} weight={500} color={color.textOnDark}>{MEMBERSHIP_COPY.recommend}</Sans>
          </View>
        ) : null}
      </View>
      <View style={{ height: 1, backgroundColor: color.hair08 }} />
      <View style={{ gap: 10 }}>
        {p.features.map((f) => {
          const v = featureVals(f);
          return (
            <View key={v.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <Icon name={v.icon} size={15} color={v.color} />
              <Sans size={13} color={v.text}>{v.label}</Sans>
            </View>
          );
        })}
      </View>
      {p.recommend ? (
        // metalPill without a tint (line 2109): the default chrome ramp over the dark face, r12, full width
        <MetalButton tint="default" label={label} icon="sparkling-2-line" width="auto" height={48} radius={12} gap={8} iconSize={16} fontSize={14} onPress={onSelect} testID={`plan-cta-${p.id}`} />
      ) : (
        <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: active }} disabled={active} onPress={onSelect} testID={`plan-cta-${p.id}`}
          style={{ height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: active ? color.sunken : color.surface, borderWidth: 1, borderColor: active ? 'transparent' : color.hair14 }}>
          <Sans size={14} weight={500} color={active ? color.ink5 : color.ink}>{label}</Sans>
        </Pressable>
      )}
    </View>
  );
  return p.recommend
    ? <ShineBorder ramp="plus" radius={16} style={{ padding: 2 }} testID={`plan-${p.id}`}>{inner}</ShineBorder>
    : <View testID={`plan-${p.id}`} style={{ borderRadius: 16, backgroundColor: color.surface }}>{inner}</View>;
}
```

- [ ] **Step 3: `src/screens/profile/MembershipScreen.tsx`** (lines 749–799)

```tsx
import { View } from 'react-native';
import { MEMBERSHIP_COPY, PLANS } from '../../fixtures/profile';
import { useAppStore } from '../../store/useAppStore';
import { color } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { SlideUpScreen } from '../../ui/SlideUpScreen';
import { Sans } from '../../ui/Txt';
import { PlanCard } from './PlanCard';

export function MembershipScreen() {
  const plan = useAppStore((s) => s.plan);
  const setPlan = useAppStore((s) => s.setPlan);
  const closeScreen = useAppStore((s) => s.closeScreen);
  return (
    <SlideUpScreen caption={MEMBERSHIP_COPY.caption} onClose={closeScreen} gap={16} testID="screen-membership">
      <View style={{ gap: 7 }}>
        <Sans size={32} lh={36} weight={600} ls={-1.1} color={color.ink}>{MEMBERSHIP_COPY.title}</Sans>
        <Sans size={14} lh={21} color={color.ink5}>{MEMBERSHIP_COPY.sub}</Sans>
      </View>
      {PLANS.map((p) => <PlanCard key={p.id} plan={p} active={p.id === plan} onSelect={() => setPlan(p.id)} />)}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingTop: 2, paddingHorizontal: 2 }}>
        <Icon name="lock-line" size={14} color={color.ink4} />
        <Sans size={12} lh={18} color={color.ink5} style={{ flex: 1 }}>{MEMBERSHIP_COPY.billed}</Sans>
      </View>
    </SlideUpScreen>
  );
}
```

- [ ] **Step 4: `src/screens/profile/ProfileScreen.tsx`** (lines 537–633; `profileVals` 1678)

```tsx
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACTIVITY, PROFILE_COPY, USER } from '../../fixtures/profile';
import { isOpenRecall } from '../../lib/derive';
import { planLabel, planLine } from '../../lib/membership';
import { useAppStore } from '../../store/useAppStore';
import { color } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { MetalButton } from '../../ui/MetalButton';
import { Toggle } from '../../ui/Toggle';
import { Mono, Sans } from '../../ui/Txt';

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const vehicles = useAppStore((s) => s.vehicles);
  const scheduled = useAppStore((s) => s.scheduled);
  const plan = useAppStore((s) => s.plan);
  const pfPush = useAppStore((s) => s.pfPush);
  const pfEmail = useAppStore((s) => s.pfEmail);
  const pfBio = useAppStore((s) => s.pfBio);
  const openSheet = useAppStore((s) => s.openSheet);
  const openScreen = useAppStore((s) => s.openScreen);
  const togglePref = useAppStore((s) => s.togglePref);
  const switchTab = useAppStore((s) => s.switchTab);
  const flash = useAppStore((s) => s.flash);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16, paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
      <View style={{ alignItems: 'center', gap: 8, paddingTop: 20, paddingBottom: 22 }}>
        <View style={{ width: 118, height: 118, borderRadius: 59, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface, borderWidth: 2, borderColor: color.hair12 }}>
          <Sans size={42} lh={49} weight={600} ls={-1.5} color={color.ink7}>{USER.initials}</Sans>
        </View>
        <Sans size={28} lh={32} weight={600} ls={-0.9} color={color.ink} style={{ marginTop: 4 }}>{USER.name}</Sans>
        <Sans size={13} color={color.ink5}>{USER.memberSince}</Sans>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, backgroundColor: color.sunken, paddingVertical: 5, paddingHorizontal: 12 }}>
          <Icon name="shield-check-fill" size={12} color={color.blueDeep} />
          <Mono size={9} ls={1.4} color={color.blueDeep}>{planLabel(plan)}</Mono>
        </View>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel={PROFILE_COPY.membership} onPress={() => openScreen('membership')} style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
        <Icon name="vip-crown-2-line" size={20} color={color.blueDeep} />
        <View style={{ flex: 1, gap: 3 }}>
          <Sans size={18} weight={600} ls={-0.3} color={color.ink}>{PROFILE_COPY.membership}</Sans>
          <Mono size={9} ls={1.3} color={color.ink3}>{planLine(plan)}</Mono>
        </View>
        <Icon name="arrow-right-s-line" size={22} color={color.ink4} />
      </Pressable>

      <View style={[styles.card, { gap: 16 }]}>
        <Sans size={18} weight={600} ls={-0.3} color={color.ink}>{PROFILE_COPY.account}</Sans>
        <View style={{ gap: 3 }}>
          <Mono size={9} ls={1.3} color={color.ink3}>{PROFILE_COPY.email}</Mono>
          <Sans size={13} color={color.ink2}>{USER.email}</Sans>
        </View>
        <View style={{ gap: 3 }}>
          <Mono size={9} ls={1.3} color={color.ink3}>{PROFILE_COPY.phone}</Mono>
          <Sans size={13} color={color.ink2}>{USER.phone}</Sans>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={PROFILE_COPY.edit} onPress={() => flash(PROFILE_COPY.editToast)}
          style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: color.hair14 }}>
          <Icon name="pencil-line" size={15} color={color.ink2} />
          <Sans size={13} weight={500} color={color.ink2}>{PROFILE_COPY.edit}</Sans>
        </Pressable>
      </View>

      <View style={[styles.card, { gap: 6 }]}>
        <Sans size={18} weight={600} ls={-0.3} color={color.ink} style={{ marginBottom: 8 }}>{PROFILE_COPY.preferences}</Sans>
        <Toggle on={pfPush} label={PROFILE_COPY.toggles[0]} onPress={() => togglePref('pfPush')} />
        <Toggle on={pfEmail} label={PROFILE_COPY.toggles[1]} onPress={() => togglePref('pfEmail')} />
        <Toggle on={pfBio} label={PROFILE_COPY.toggles[2]} onPress={() => togglePref('pfBio')} />
      </View>

      <View style={[styles.card, { gap: 14 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Sans size={18} weight={600} ls={-0.3} color={color.ink}>{PROFILE_COPY.garage}</Sans>
          <Pressable accessibilityRole="button" accessibilityLabel={PROFILE_COPY.addVehicle} onPress={() => openSheet('add')} hitSlop={8}>
            <Mono size={9} ls={1.4} color={color.blueDeep}>{PROFILE_COPY.addVehicle}</Mono>
          </Pressable>
        </View>
        {vehicles.map((v) => {
          const open = isOpenRecall(v, scheduled);
          const tone = open ? color.red : color.teal;
          return (
            <Pressable key={v.id} accessibilityRole="button" accessibilityLabel={v.name}
              onPress={() => { switchTab('garage'); router.navigate({ pathname: '/(tabs)/garage/[id]', params: { id: String(v.id) } }); }}
              style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 12, backgroundColor: color.surface, borderWidth: 1, borderColor: color.hair08, paddingVertical: 15, paddingHorizontal: 16 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Sans size={15} weight={600} ls={-0.2} color={color.ink}>{v.name}</Sans>
                <Sans size={12} color={color.ink5}>{v.meta}</Sans>
                <View style={{ alignSelf: 'flex-start', marginTop: 2, borderRadius: 4, backgroundColor: color.sunken, paddingVertical: 4, paddingHorizontal: 6 }}>
                  <Mono size={9} ls={1.1} color={color.ink3}>{'VIN: ' + v.vin.replace('···· ', '') + 'XXXXXX'}</Mono>
                </View>
                <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: tone }} />
                  <Sans size={12} color={tone}>{open ? PROFILE_COPY.activeRecall : PROFILE_COPY.allClear}</Sans>
                </View>
              </View>
              <Icon name="car-fill" size={18} color={open ? color.red : color.ink7} />
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.card, { gap: 12 }]}>
        <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: color.infoBg }}>
          <Icon name="customer-service-2-line" size={23} color={color.blueDeep} />
        </View>
        <Sans size={18} weight={600} ls={-0.3} color={color.ink}>{PROFILE_COPY.concierge}</Sans>
        <Sans size={13} lh={20} color={color.ink5}>{PROFILE_COPY.conciergeBody}</Sans>
        <View style={{ flexDirection: 'row', paddingTop: 2 }}>
          <MetalButton tint="blue" label={PROFILE_COPY.startChat} icon="chat-3-line" flex={1} width="auto" height={50} radius={999} gap={8} iconSize={16} fontSize={14} onPress={() => openScreen('chat')} />
        </View>
      </View>

      <View style={[styles.card, { gap: 14 }]}>
        <Sans size={18} weight={600} ls={-0.3} color={color.ink}>{PROFILE_COPY.activity}</Sans>
        {ACTIVITY.map((a) => (
          <View key={a.title} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ width: 8, height: 8, marginTop: 6, borderRadius: 4, backgroundColor: a.color }} />
            <View style={{ flex: 1, gap: 3 }}>
              <Sans size={13} color={color.ink2}>{a.title}</Sans>
              <Mono size={9} ls={1.2} color={color.ink3}>{a.detail}</Mono>
            </View>
          </View>
        ))}
      </View>

      <View style={{ borderRadius: 16, backgroundColor: color.dangerBg, borderWidth: 1, borderColor: color.dangerEdge, padding: 18, gap: 12 }}>
        <Sans size={18} weight={600} ls={-0.3} color={color.red}>{PROFILE_COPY.danger}</Sans>
        <Sans size={13} lh={20} color={color.dangerInk}>{PROFILE_COPY.dangerBody}</Sans>
        <Pressable accessibilityRole="button" accessibilityLabel={PROFILE_COPY.deleteAccount} onPress={() => flash(PROFILE_COPY.deleteToast)}
          style={{ alignSelf: 'flex-start', minHeight: 46, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: color.red }}>
          <Sans size={13} weight={500} color={color.red}>{PROFILE_COPY.deleteAccount}</Sans>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ card: { borderRadius: 16, backgroundColor: color.sunken, padding: 18 } });
```

- [ ] **Step 5: `app/(tabs)/profile.tsx`** — replace the whole file

```tsx
import { ProfileScreen } from '../../src/screens/profile/ProfileScreen';
export default function ProfileRoute() { return <ProfileScreen />; }
```

- [ ] **Step 6: Tests** `src/screens/profile/__tests__/profile.test.tsx`

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { MembershipScreen } from '../MembershipScreen';
import { ProfileScreen } from '../ProfileScreen';
import { resetAppStore, useAppStore } from '../../../store/useAppStore';

const s = () => useAppStore.getState();
beforeEach(() => { resetAppStore(); jest.clearAllMocks(); });

describe('ProfileScreen', () => {
  it('renders the header, membership line, account details, toggles, garage, concierge, activity and danger zone', () => {
    const { getByText, getAllByRole, getByRole } = render(<ProfileScreen />);
    expect(getByText('AV')).toBeTruthy();
    expect(getByText('Alexander Vance')).toBeTruthy();
    expect(getByText('Premium Member since 2022')).toBeTruthy();
    expect(getByText('AEGIS PRO ACTIVE')).toBeTruthy();
    expect(getByText('Pro · $29/month')).toBeTruthy();
    expect(getByText('alexander.vance@example.com')).toBeTruthy();
    expect(getByText('+1 (555) 019-8234')).toBeTruthy();
    expect(getAllByRole('switch')).toHaveLength(3);
    expect(getByRole('switch', { name: 'Biometric Login' }).props.accessibilityState).toEqual({ checked: false });
    expect(getByText('VIN: F12345XXXXXX')).toBeTruthy();
    expect(getByText('1 Active Recall')).toBeTruthy();
    expect(getByText('All Clear')).toBeTruthy();
    expect(getByText('Concierge Support')).toBeTruthy();
    expect(getByText('System scan completed.')).toBeTruthy();
    expect(getByText('YESTERDAY, 14:15 PM')).toBeTruthy();
    expect(getByText('Danger Zone')).toBeTruthy();
  });
  it('toggles flip preferences', () => {
    const { getByRole } = render(<ProfileScreen />);
    fireEvent.press(getByRole('switch', { name: 'Biometric Login' }));
    expect(s().pfBio).toBe(true);
    fireEvent.press(getByRole('switch', { name: 'Push Notifications' }));
    expect(s().pfPush).toBe(false);
  });
  it('rows open the membership screen, the add sheet, the chat, stats, and the two toasts', () => {
    const { getByLabelText } = render(<ProfileScreen />);
    fireEvent.press(getByLabelText('Membership'));
    expect(s().screen).toBe('membership');
    fireEvent.press(getByLabelText('+ ADD VEHICLE'));
    expect(s().sheet).toBe('add');
    fireEvent.press(getByLabelText('Start Chat'));
    expect(s().screen).toBe('chat');
    fireEvent.press(getByLabelText('Taycan 4S'));
    expect(s().tab).toBe('garage');
    expect(router.navigate).toHaveBeenCalledWith({ pathname: '/(tabs)/garage/[id]', params: { id: '2' } });
    fireEvent.press(getByLabelText('Edit Profile'));
    expect(s().toast).toBe('Profile editing stays local in this prototype');
    fireEvent.press(getByLabelText('Delete Account'));
    expect(s().toast).toBe('No account data is stored by this build');
  });
  it('the garage rows go clear once scheduled', () => {
    s().schedule();
    const { getAllByText, queryByText } = render(<ProfileScreen />);
    expect(getAllByText('All Clear')).toHaveLength(3);
    expect(queryByText('1 Active Recall')).toBeNull();
  });
});

describe('MembershipScreen', () => {
  it('renders the three plans with Plus recommended and Pro current', () => {
    const { getByText, getByLabelText, getByTestId } = render(<MembershipScreen />);
    expect(getByText('MEMBERSHIP')).toBeTruthy();
    expect(getByText('Select your protection level')).toBeTruthy();
    expect(getByText('Standard')).toBeTruthy();
    expect(getByText('$9')).toBeTruthy();
    expect(getByText('Recommend')).toBeTruthy();
    expect(getByLabelText('Upgrade to Plus')).toBeTruthy();
    expect(getByLabelText('Switch to Standard')).toBeTruthy();
    expect(getByLabelText('Current plan').props.accessibilityState).toEqual({ disabled: true });
    expect(getByText('Real-time alerts')).toBeTruthy();
    expect(getByText('Billed monthly. Cancel any time from this screen.')).toBeTruthy();
    expect(getByTestId('plan-plus')).toBeTruthy();
  });
  it('selecting Plus makes it current and toasts; Pro becomes selectable', () => {
    const { getByLabelText, getAllByLabelText } = render(<MembershipScreen />);
    fireEvent.press(getByLabelText('Upgrade to Plus'));
    expect(s()).toMatchObject({ plan: 'plus', toast: 'Plus membership active' });
    expect(getByLabelText('Upgrade to Pro')).toBeTruthy();
    expect(getAllByLabelText('Current plan').length).toBeGreaterThan(0);
  });
  it('Close closes the screen', () => {
    const { getByLabelText } = render(<MembershipScreen />);
    fireEvent.press(getByLabelText('Close'));
    expect(s().screen).toBeNull();
  });
});
```

- [ ] **Step 7: Gate** — `npm test -- profile`, `npm test -- VinHelp`, then `npm test && npm run typecheck`. Report.

**Checkpoint commit message (controller):** `feat: Profile tab and membership screen with the Plus shine card`

---

### Task 11: Concierge chat screen

**Files:**
- Create: `src/screens/profile/ChatScreen.tsx`, `src/screens/profile/__tests__/ChatScreen.test.tsx`

**Interfaces:** `ChatScreen` (no props; Task 12 mounts it while `screen === 'chat'`). Chat state (`log`, `shown`, `typing`, `draft`) is local (spec §15.1).

- [ ] **Step 1: `src/screens/profile/ChatScreen.tsx`**

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CANNED_REPLY, CHAT_COPY, CHAT_SCRIPT } from '../../fixtures/chat';
import type { ChatMessage } from '../../fixtures/types';
import { revealPlan, SEND_REPLY_DELAY } from '../../lib/chat';
import { cssAngleToPoints } from '../../lib/gradient';
import { useAppStore } from '../../store/useAppStore';
import { bez, color, dur, ease } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { Mono, Sans } from '../../ui/Txt';

const AVATAR = cssAngleToPoints(135, 34, 34);
const BUBBLE = cssAngleToPoints(135, 300, 60);
const GRADIENT: [string, string] = ['#2E93C4', '#0B4E73'];

export function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const closeScreen = useAppStore((s) => s.closeScreen);
  const [log, setLog] = useState<ChatMessage[]>(CHAT_SCRIPT);
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scroll = useRef<ScrollView>(null);

  const clear = useCallback(() => { timers.current.forEach(clearTimeout); timers.current = []; }, []);
  // openChat + revealChat (lines 1724–1743): reset, then play the scripted reveal on the plan's timers.
  const reveal = useCallback(() => {
    clear();
    setLog(CHAT_SCRIPT); setShown(0); setTyping(false); setDraft('');
    for (const step of revealPlan(CHAT_SCRIPT)) {
      timers.current.push(setTimeout(() => { setShown(step.shown); setTyping(step.typing); }, step.at));
    }
  }, [clear]);
  useEffect(() => { reveal(); return clear; }, [reveal, clear]);
  useEffect(() => { scroll.current?.scrollToEnd({ animated: true }); }, [shown, typing]);

  // sendChat (line 1751): append mine, show typing, canned reply after 1400 ms.
  const send = () => {
    const text = draft.trim();
    if (!text) return;
    clear();
    setLog((l) => [...l, { from: 'me', content: text }]);
    setShown((n) => n + 1);
    setDraft('');
    setTyping(true);
    timers.current.push(setTimeout(() => { setLog((l) => [...l, CANNED_REPLY]); setShown((n) => n + 1); setTyping(false); }, SEND_REPLY_DELAY));
  };

  // screen-up .34s cubic-bezier(.2,.85,.2,1)
  const slide = useSharedValue(1);
  useEffect(() => { slide.value = withTiming(0, { duration: dur.screen, easing: bez(ease.sheet) }); }, [slide]);
  const slideStyle = useAnimatedStyle(() => ({ transform: [{ translateY: slide.value * height }] }));
  const hasDraft = draft.trim().length > 0;
  const messages = log.slice(0, shown);

  return (
    <Animated.View testID="screen-chat" style={[StyleSheet.absoluteFill, slideStyle]}>
      <LinearGradient colors={[color.chatTop, color.chatBottom]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      <StatusBar style="light" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 13, borderBottomWidth: 1, borderBottomColor: color.chatHair }}>
        <Pressable accessibilityLabel="Close" onPress={closeScreen} style={{ width: 34, height: 34, marginLeft: -7, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close-line" size={22} color="#FFFFFF" />
        </Pressable>
        <Avatar size={34} icon={17} />
        <View style={{ flex: 1, gap: 1 }}>
          <Sans size={14} weight={500} color="#FFFFFF">{CHAT_COPY.title}</Sans>
          <Sans size={11} color={color.chatDim}>{typing ? CHAT_COPY.typing : CHAT_COPY.online}</Sans>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={CHAT_COPY.replay} onPress={reveal}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, backgroundColor: color.chatHair, paddingVertical: 7, paddingHorizontal: 11 }}>
          <Icon name="restart-line" size={14} color={color.chatMuted} />
          <Sans size={12} color={color.chatMuted}>{CHAT_COPY.replay}</Sans>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingVertical: 18, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {messages.map((m, i) => <Bubble key={i} message={m} />)}
          {typing && (
            <View testID="chat-typing" style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
              <Avatar size={30} icon={15} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 16, borderTopLeftRadius: 6, borderWidth: 1, borderColor: color.chatEdge, backgroundColor: color.chatBubble, paddingVertical: 13, paddingHorizontal: 15 }}>
                <Dot delay={0} /><Dot delay={150} /><Dot delay={300} />
              </View>
            </View>
          )}
        </ScrollView>

        <View style={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 20 + insets.bottom, borderTopWidth: 1, borderTopColor: color.chatHair }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, borderColor: color.chatEdge, backgroundColor: color.chatField, paddingVertical: 8, paddingRight: 8, paddingLeft: 15 }}>
            <TextInput
              testID="chat-input"
              accessibilityLabel="Message the concierge"
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={send}
              returnKeyType="send"
              submitBehavior="submit"
              placeholder={CHAT_COPY.placeholder}
              placeholderTextColor={color.chatPlaceholder}
              allowFontScaling={false}
              style={{ flex: 1, minWidth: 0, paddingVertical: 8, fontFamily: 'Geist_400Regular', fontSize: 13.5, color: '#FFFFFF' }}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={send}
              style={{ width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: hasDraft ? color.blueDeep : color.chatHair }}>
              <Icon name="send-plane-fill" size={16} color={hasDraft ? '#FFFFFF' : color.chatSendOff} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

function Avatar({ size, icon }: { size: number; icon: number }) {
  return (
    <LinearGradient colors={GRADIENT} start={AVATAR.start} end={AVATAR.end} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="customer-service-2-fill" size={icon} color="#FFFFFF" />
    </LinearGradient>
  );
}

// bub-in-l / bub-in-r (.35s cubic-bezier(.22,1,.36,1) both): opacity 0 → 1, translate3d(∓20px, 12px) scale(.96) → none
function Bubble({ message: m }: { message: ChatMessage }) {
  const mine = m.from === 'me';
  const p = useSharedValue(0);
  useEffect(() => { p.value = withTiming(1, { duration: dur.bubbleIn, easing: bez(ease.swipe) }); }, [p]);
  const style = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateX: (mine ? 20 : -20) * (1 - p.value) }, { translateY: 12 * (1 - p.value) }, { scale: 0.96 + 0.04 * p.value }],
  }));
  return (
    <Animated.View testID={mine ? 'bubble-me' : 'bubble-them'} style={[{ width: '100%', flexDirection: mine ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8 }, style]}>
      {!mine && <Avatar size={30} icon={15} />}
      {mine ? (
        <LinearGradient colors={GRADIENT} start={BUBBLE.start} end={BUBBLE.end} style={[styles.bubble, { borderTopRightRadius: 6, boxShadow: '0 8px 24px -6px rgba(15,99,143,0.5)' }]}>
          <Sans size={13.5} lh={20} color="#FFFFFF">{m.content}</Sans>
        </LinearGradient>
      ) : (
        <View style={[styles.bubble, { backgroundColor: color.chatBubble, borderWidth: 1, borderColor: color.chatEdge, borderTopLeftRadius: 6, boxShadow: '0 4px 12px -2px rgba(0,0,0,0.3)' }]}>
          <Sans size={13.5} lh={20} color={color.chatInk}>{m.content}</Sans>
        </View>
      )}
    </Animated.View>
  );
}

// dot-bob .8s ease-in-out infinite (delays 0 / .15 / .3 s): opacity .4 → 1 → .4, translateY 0 → −4 → 0
function Dot({ delay }: { delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    const half = { duration: dur.dotBob / 2, easing: Easing.inOut(Easing.ease) };
    p.value = withDelay(delay, withRepeat(withSequence(withTiming(1, half), withTiming(0, half)), -1, false));
  }, [p, delay]);
  const style = useAnimatedStyle(() => ({ opacity: 0.4 + 0.6 * p.value, transform: [{ translateY: -4 * p.value }] }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: color.chatMuted }, style]} />;
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '75%', borderRadius: 16, paddingVertical: 11, paddingHorizontal: 14 },
});
```

- [ ] **Step 2: Tests** `src/screens/profile/__tests__/ChatScreen.test.tsx`

```tsx
import { act, fireEvent, render } from '@testing-library/react-native';
import { ChatScreen } from '../ChatScreen';
import { resetAppStore, useAppStore } from '../../../store/useAppStore';

const s = () => useAppStore.getState();
beforeEach(() => { resetAppStore(); s().openScreen('chat'); jest.useFakeTimers(); });
afterEach(() => jest.useRealTimers());

describe('ChatScreen', () => {
  it('opens typing, reveals the script on the plan timers, then reads Online', () => {
    const { getByText, queryByTestId, getAllByTestId, queryByText } = render(<ChatScreen />);
    expect(getByText('Aegis Concierge')).toBeTruthy();
    expect(getByText('Typing…')).toBeTruthy();
    expect(queryByTestId('chat-typing')).toBeTruthy();
    act(() => { jest.advanceTimersByTime(1200); });
    expect(getByText(/Good afternoon, Alexander/)).toBeTruthy();
    expect(queryByTestId('chat-typing')).toBeNull();
    expect(getByText('Online · replies in minutes')).toBeTruthy();
    act(() => { jest.advanceTimersByTime(1220); });
    expect(getByText('Yes please. What does the repair actually involve?')).toBeTruthy();
    act(() => { jest.advanceTimersByTime(10000); });
    expect(getAllByTestId('bubble-them')).toHaveLength(4);
    expect(getAllByTestId('bubble-me')).toHaveLength(3);
    expect(getByText(/Booked\. You'll get a confirmation/)).toBeTruthy();
    expect(queryByText('Typing…')).toBeNull();
  });
  it('Replay restarts the script', () => {
    const { getByLabelText, queryByText, getByText } = render(<ChatScreen />);
    act(() => { jest.advanceTimersByTime(3000); });
    expect(getByText('Yes please. What does the repair actually involve?')).toBeTruthy();
    fireEvent.press(getByLabelText('Replay'));
    expect(queryByText('Yes please. What does the repair actually involve?')).toBeNull();
    expect(getByText('Typing…')).toBeTruthy();
  });
  it('sending a message appends it, shows typing, then the canned reply after 1.4 s', () => {
    const { getByTestId, getByLabelText, getByText, queryByTestId } = render(<ChatScreen />);
    act(() => { jest.advanceTimersByTime(11000); });
    fireEvent.changeText(getByTestId('chat-input'), '  Can you send the driver details now? ');
    fireEvent.press(getByLabelText('Send'));
    expect(getByText('Can you send the driver details now?')).toBeTruthy();
    expect(getByTestId('chat-input').props.value).toBe('');
    expect(queryByTestId('chat-typing')).toBeTruthy();
    act(() => { jest.advanceTimersByTime(1400); });
    expect(getByText(/Noted\. A specialist will pick this up/)).toBeTruthy();
    expect(queryByTestId('chat-typing')).toBeNull();
  });
  it('ignores an empty send; Enter submits; Close closes the screen', () => {
    const { getByTestId, getByLabelText, queryByText } = render(<ChatScreen />);
    act(() => { jest.advanceTimersByTime(11000); });
    fireEvent.press(getByLabelText('Send'));
    expect(queryByText('Noted. A specialist', { exact: false })).toBeNull();
    fireEvent.changeText(getByTestId('chat-input'), 'Thanks');
    fireEvent(getByTestId('chat-input'), 'submitEditing');
    expect(queryByText('Thanks')).toBeTruthy();
    fireEvent.press(getByLabelText('Close'));
    expect(s().screen).toBeNull();
  });
});
```

- [ ] **Step 3: Gate** — `npm test -- ChatScreen`, then `npm test && npm run typecheck`. Report.

**Checkpoint commit message (controller):** `feat: concierge chat with the scripted reveal, typing indicator and canned reply`

---

### Task 12: Overlay host integration, hardware back order, stub removal

**Files:**
- Modify: `src/overlays/OverlayHost.tsx` (replace the whole file), `src/overlays/__tests__/OverlayHost.test.tsx` (replace the whole file)
- Delete: `src/screens/TabStub.tsx`, `src/screens/__tests__/TabStub.test.tsx`

- [ ] **Step 1: `src/overlays/OverlayHost.tsx`**

```tsx
// src/overlays/OverlayHost.tsx — every overlay, mounted here in the source's z-order: add/recall sheet (z20), light sheet and
// reason sheet (z24), membership (z25), chat (z26), VIN help (z27), article reader (z28), toast (z30), splash (z60).
import { useEffect } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '../store/useAppStore';
import { AddVehicleSheet } from '../screens/AddVehicleSheet';
import { RecallSheet } from '../screens/RecallSheet';
import { VinHelpScreen } from '../screens/VinHelpScreen';
import { ArticleReader } from '../screens/hub/ArticleReader';
import { LightSheet } from '../screens/hub/LightSheet';
import { ChatScreen } from '../screens/profile/ChatScreen';
import { MembershipScreen } from '../screens/profile/MembershipScreen';
import { ReasonSheet } from '../screens/service/ReasonSheet';
import { Splash } from '../screens/splash/Splash';
import { Toast } from '../ui/Toast';

export function OverlayHost() {
  const sheet = useAppStore((s) => s.sheet);
  const screen = useAppStore((s) => s.screen);
  const hubLight = useAppStore((s) => s.hubLight);
  const splash = useAppStore((s) => s.splash);
  const dismissSplash = useAppStore((s) => s.dismissSplash);
  const closeSheet = useAppStore((s) => s.closeSheet);
  const closeScreen = useAppStore((s) => s.closeScreen);
  const closeArticle = useAppStore((s) => s.closeArticle);
  const closeLight = useAppStore((s) => s.closeLight);
  const router = useRouter();

  // Android back closes the topmost overlay (screens above the light sheet above the sheets) instead of leaving the app;
  // with nothing open it falls through to the navigator (pops a stats/detail route or exits).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'article') { closeArticle(); return true; }
      if (screen) { closeScreen(); return true; }
      if (hubLight) { closeLight(); return true; }
      if (sheet) { closeSheet(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [sheet, screen, hubLight, closeSheet, closeScreen, closeArticle, closeLight]);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {sheet === 'add' && <AddVehicleSheet />}
      {sheet === 'recall' && <RecallSheet onDetails={() => router.navigate('/(tabs)/recalls')} />}
      {hubLight && <LightSheet />}
      {sheet === 'reason' && <ReasonSheet />}
      {screen === 'membership' && <MembershipScreen />}
      {screen === 'chat' && <ChatScreen />}
      {screen === 'vinhelp' && <VinHelpScreen />}
      {screen === 'article' && <ArticleReader />}
      <Toast />
      {splash && <Splash onDone={dismissSplash} />}
    </View>
  );
}
```

- [ ] **Step 2: `src/overlays/__tests__/OverlayHost.test.tsx`** — replace the whole file (the global `expo-router` mock from `jest.setup.ts` now covers `useRouter`)

```tsx
import { act, render } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { OverlayHost } from '../OverlayHost';
import { resetAppStore, useAppStore } from '../../store/useAppStore';

jest.mock('../../screens/splash/useMarqueeDrive');

type Handler = () => boolean | null | undefined;
const handlers: Handler[] = [];
const pressBack = () => handlers[handlers.length - 1]();
const s = () => useAppStore.getState();

beforeEach(() => {
  handlers.length = 0;
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => { handlers.push(handler as Handler); return { remove: jest.fn() }; });
  resetAppStore();
  useAppStore.setState({ splash: false });
  jest.useFakeTimers();
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

describe('OverlayHost mounts', () => {
  it('the light sheet while hubLight is set', () => {
    s().openLight('l1');
    const { getByTestId } = render(<OverlayHost />);
    expect(getByTestId('sheet-light')).toBeTruthy();
  });
  it('the reason sheet, membership, chat and article by state', () => {
    s().openSheet('reason');
    const { getByTestId, rerender } = render(<OverlayHost />);
    expect(getByTestId('sheet-reason')).toBeTruthy();
    act(() => { s().closeSheet(); s().openScreen('membership'); });
    rerender(<OverlayHost />);
    expect(getByTestId('screen-membership')).toBeTruthy();
    act(() => { s().openScreen('chat'); });
    rerender(<OverlayHost />);
    expect(getByTestId('screen-chat')).toBeTruthy();
    act(() => { s().closeScreen(); s().openArticle('a1'); });
    rerender(<OverlayHost />);
    expect(getByTestId('article-reader')).toBeTruthy();
  });
  it('the real Splash while splash is true', () => {
    useAppStore.setState({ splash: true });
    const { getByTestId, getByText } = render(<OverlayHost />);
    expect(getByTestId('stage')).toBeTruthy();
    expect(getByText('REPLAY')).toBeTruthy();
  });
});

describe('OverlayHost hardware back', () => {
  it('closes the add sheet instead of leaving the app', () => {
    s().openSheet('add');
    render(<OverlayHost />);
    expect(pressBack()).toBe(true);
    expect(s().sheet).toBeNull();
  });
  it('closes VIN help first, then the sheet beneath it', () => {
    s().openSheet('add'); s().openVinHelp();
    const { rerender } = render(<OverlayHost />);
    expect(pressBack()).toBe(true);
    expect(s().screen).toBeNull();
    expect(s().sheet).toBe('add');
    rerender(<OverlayHost />);
    expect(pressBack()).toBe(true);
    expect(s().sheet).toBeNull();
  });
  it('closes the article (clearing it), the chat, the membership screen, the light sheet and the reason sheet', () => {
    s().openArticle('a2');
    const { rerender } = render(<OverlayHost />);
    expect(pressBack()).toBe(true);
    expect(s()).toMatchObject({ screen: null, article: null });
    act(() => { s().openScreen('chat'); }); rerender(<OverlayHost />);
    expect(pressBack()).toBe(true); expect(s().screen).toBeNull();
    act(() => { s().openScreen('membership'); }); rerender(<OverlayHost />);
    expect(pressBack()).toBe(true); expect(s().screen).toBeNull();
    act(() => { s().openLight('l3'); }); rerender(<OverlayHost />);
    expect(pressBack()).toBe(true); expect(s().hubLight).toBeNull();
    act(() => { s().openSheet('reason'); }); rerender(<OverlayHost />);
    expect(pressBack()).toBe(true); expect(s().sheet).toBeNull();
  });
  it('lets the system handle back when nothing is open', () => {
    render(<OverlayHost />);
    expect(pressBack()).toBe(false);
  });
});
```

- [ ] **Step 3: Delete** `src/screens/TabStub.tsx` and `src/screens/__tests__/TabStub.test.tsx`. Confirm with a search that no file imports `TabStub` (the four tab routes were replaced by Tasks 6–10). If a route still imports it, report BLOCKED with the file name — do not rewrite another task's route.

- [ ] **Step 4: Gate** — `npm test -- OverlayHost`, then `npm test && npm run typecheck`. Report.

**Checkpoint commit message (controller):** `feat: overlay host mounts every Slice 3 overlay; stub tab removed`

---

### Task 13: Emulator verification pass (controller)

Boot the AVD, `REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1 npx expo start`, `adb reverse tcp:8081 tcp:8081`, open `exp://127.0.0.1:8081`. Capture every state in spec §12.2 with `adb exec-out screencap -p` (driving notes in `docs/reference/verification.md`), compare each with its `app-*.png` reference at the same logical width, fix what is fixable, and append a **Slice 3** section to `docs/reference/verification.md` (table, accepted differences, fixed, NOT fixed, driving notes). Then update `CLAUDE.md`, `WHERE-WE-LEFT-OFF.md`, the ledger, and push.

### Task 14: On-device pass on the S24 Ultra (with Slice 1's Task 23 and Slice 2's Task 12)

Expo Go over Wi-Fi (`npx expo start`, scan the QR). Judge by eye at 120 Hz: the shine spins, the strip growth, toggles, the tilt map reacting to the phone, the hub auto-advance and swipe, the article swipe in both directions, chat bubbles and dots. Append to `verification.md`.
