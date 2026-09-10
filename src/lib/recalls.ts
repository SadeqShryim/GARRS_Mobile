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
