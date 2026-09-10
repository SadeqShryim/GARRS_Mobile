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
