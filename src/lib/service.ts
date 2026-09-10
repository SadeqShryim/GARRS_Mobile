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
