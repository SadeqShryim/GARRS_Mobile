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
