import { DECODE, type Decoded } from '../fixtures/decode';
import type { Vehicle } from '../fixtures/types';

export const isOpenRecall = (v: Vehicle, scheduled: boolean) => !!v.recall && !scheduled;
export const recallCount = (vs: Vehicle[], scheduled: boolean) => vs.filter((v) => isOpenRecall(v, scheduled)).length;

export function fleetLine(vs: Vehicle[], scheduled: boolean) {
  const n = vs.length;
  const rc = recallCount(vs, scheduled);
  return n + (n === 1 ? ' VEHICLE · ' : ' VEHICLES · ') + (rc ? rc + ' RECALL' : 'ALL CLEAR');
}

export const counter = (idx: number, n: number) => String(idx + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0');
export const vinOk = (raw: string) => raw.length >= 11;
export const maskVin = (raw: string) => '···· ' + raw.slice(-6);
export const decodeVin = (raw: string): Decoded => DECODE[raw] ?? { name: 'New Vehicle', meta: 'Decoded from VIN', health: 90, range: '—' };

const mi = (n: number) => n.toLocaleString('en-US') + ' mi';
const tone = (n: number, warn: number, bad: number) => (n <= bad ? '#D0021B' : n <= warn ? '#c98a1f' : '#01a08c');

export type StatTile = { icon: string; tone: string; label: string; value: string; note: string };
export type ServiceRow = { key: string; label: string; due: string; pct: number; tone: string; meta: string };
export type Stats = {
  name: string; metaUpper: string; hasRecall: boolean; recallCode: string; recallTitle: string;
  clearTitle: string; clearMeta: string; word: string; gaugeColor: string; summary: string;
  tiles: StatTile[]; service: ServiceRow[];
};

export function statsFor(v: Vehicle, scheduled: boolean): Stats {
  const open = isOpenRecall(v, scheduled);
  const word = v.health >= 90 ? 'Excellent' : v.health >= 80 ? 'Good' : v.health >= 65 ? 'Fair' : 'Needs work';
  const gaugeColor = v.health >= 80 ? '#01a08c' : v.health >= 65 ? '#0F638F' : '#D0021B';
  const due = [
    { key: 'oil', label: 'Oil & filter', in: v.oilIn, span: 6000, warn: 1500, bad: 500 },
    { key: 'tire', label: 'Tire rotation', in: v.tireIn, span: 6000, warn: 1500, bad: 500 },
    { key: 'brake', label: 'Brake fluid', in: v.brakeIn, span: 24000, warn: 6000, bad: 2000 },
  ];
  return {
    name: v.name,
    metaUpper: v.meta.toUpperCase() + ' · VIN ' + v.vin,
    hasRecall: open,
    recallCode: open && v.recall ? v.recall.code : '',
    recallTitle: open && v.recall ? v.recall.title : '',
    clearTitle: v.recall ? 'Recall remedy scheduled' : 'No open recalls',
    clearMeta: v.recall ? 'THU 10:30 AM · ' + v.recall.code : v.sync.replace('SYNCED ', ''),
    word,
    gaugeColor,
    summary: open
      ? 'One open safety recall is holding this score down. Everything else is inside spec.'
      : 'All monitored systems are inside spec for a ' + v.meta.split(' ')[0] + ' at this mileage.',
    tiles: [
      { icon: 'dashboard-3-line', tone: '#57565e', label: 'ODOMETER', value: mi(v.odo), note: 'Read ' + v.sync.replace('SYNCED ', '').toLowerCase() },
      { icon: 'oil-line', tone: tone(v.oilIn, 1500, 500), label: 'NEXT OIL CHANGE', value: mi(v.oilIn), note: v.oilIn <= 500 ? 'Overdue soon' : 'On schedule' },
      { icon: 'loader-2-line', tone: tone(v.tireIn, 1500, 500), label: 'TIRE ROTATION', value: mi(v.tireIn), note: 'Pressure ' + v.psi + ' psi' },
      { icon: 'battery-charge-line', tone: tone(v.battery, 90, 80), label: 'BATTERY HEALTH', value: v.battery + '%', note: v.regDays <= 30 ? 'Registration due in ' + v.regDays + ' days' : 'Registration in ' + v.regDays + ' days' },
    ],
    service: due.map((d) => ({
      key: d.key,
      label: d.label,
      due: 'in ' + d.in.toLocaleString('en-US') + ' mi',
      pct: Math.max(4, Math.min(100, Math.round(100 - (d.in / d.span) * 100))),
      tone: tone(d.in, d.warn, d.bad),
      meta: 'LAST DONE AT ' + mi(v.odo - (d.span - d.in)).toUpperCase(),
    })),
  };
}
