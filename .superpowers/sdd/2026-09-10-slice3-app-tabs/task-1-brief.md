# Task 1 brief — Slice 3 (app tabs)

Extracted verbatim from `docs/superpowers/plans/2026-09-10-slice3-app-tabs.md`. The spec `docs/superpowers/specs/2026-09-10-slice3-app-tabs-design.md` is the binding authority; the source of truth for every measurement and string is `design_handoff_recall_hub/design/GaragePrototype.dc.html` (reference captures `docs/reference/app-*.png`, measured DOM `docs/reference/app-geometry.json`).

## Rules for this task
- Work in `C:\GarrsMobile`. **Do not run git. Do not install packages. Do not download anything.**
- Transcribe the code in this brief exactly. Deviate only when something does not compile or pass, keep the deviation minimal, and state exactly what you changed and why in the report.
- Only create/modify the files listed under **Files**. Other tasks may be editing other files at the same time; if the full-tree gate fails inside a file that is not yours, say so in the report and do not touch it.
- Gate: run your own suites first (`npm test -- <pattern>`), then the full `npm test && npm run typecheck` before reporting.
- Environment: Windows 11 x64, Node 24, npm 11, Expo SDK 57, RN 0.86, Reanimated 4.5, gesture-handler 2.32, expo-router 57, expo-sensors 57 (installed), jest-expo 57, TypeScript 6 strict; `tsconfig` types = jest + node.
- Report: write `.superpowers/sdd/2026-09-10-slice3-app-tabs/task-1-report.md` with: **Status** (DONE / DONE_WITH_CONCERNS / BLOCKED), files created/modified, the test and typecheck output summary (numbers), deviations from the brief, deferred steps, concerns.

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
