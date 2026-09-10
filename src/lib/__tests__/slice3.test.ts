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
    const t1 = tiltFor(35, 0);
    expect(t1.tiltX).toBeCloseTo(-0, 5);
    expect(t1.tiltY).toBeCloseTo(0, 5);
    const t2 = tiltFor(45, 10);
    expect(t2.tiltX).toBeCloseTo(-2.8, 5);
    expect(t2.tiltY).toBeCloseTo(2.8, 5);
    const t3 = tiltFor(90, -90);
    expect(t3.tiltX).toBeCloseTo(-8, 5);
    expect(t3.tiltY).toBeCloseTo(-8, 5);
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
