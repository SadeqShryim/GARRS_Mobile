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
