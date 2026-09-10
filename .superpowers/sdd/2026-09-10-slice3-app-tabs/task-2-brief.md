# Task 2 brief — Slice 3 (app tabs)

Extracted verbatim from `docs/superpowers/plans/2026-09-10-slice3-app-tabs.md`. The spec `docs/superpowers/specs/2026-09-10-slice3-app-tabs-design.md` is the binding authority; the source of truth is `design_handoff_recall_hub/design/GaragePrototype.dc.html` (logic lines 1431–1723, 1728–1808, 1901–1960, 2087–2127).

## Rules for this task
- Work in `C:\GarrsMobile`. **Do not run git. Do not install packages. Do not download anything.**
- Transcribe the code in this brief exactly. Deviate only when something does not compile or pass, keep the deviation minimal, and state exactly what you changed and why in the report.
- Only create/modify the files listed under **Files**. Other tasks may be editing other files at the same time; if the full-tree gate fails inside a file that is not yours, say so in the report and do not touch it.
- Gate: run your own suites first (`npm test -- lib`), then the full `npm test && npm run typecheck` before reporting.
- Environment: Windows 11 x64, Node 24, Expo SDK 57, jest-expo 57, TypeScript 6 strict. Task 1's fixtures (`src/fixtures/{articles,lights,chat,profile,service,recalls}.ts`, the Slice 3 types in `src/fixtures/types.ts`) already exist — import them, never redefine them.
- Report: write `.superpowers/sdd/2026-09-10-slice3-app-tabs/task-2-report.md` with: **Status** (DONE / DONE_WITH_CONCERNS / BLOCKED), files created/modified, the test and typecheck output summary (numbers), deviations, deferred steps, concerns.

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
