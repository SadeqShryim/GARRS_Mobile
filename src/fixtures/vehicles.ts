import type { Vehicle } from './types';
export const SEED_VEHICLES: Vehicle[] = [
  { id: 1, name: 'Model S Plaid', meta: '2024 Tesla · 42,000 mi', health: 65, range: '340 mi', vin: '···· F12345', sync: 'SYNCED 2 MIN AGO', recall: { code: 'NHTSA 24V-137', title: 'Rear camera image failure' }, odo: 42000, oilIn: 1200, tireIn: 3400, brakeIn: 9000, regDays: 42, psi: '42 / 40', battery: 92 },
  { id: 2, name: 'Taycan 4S', meta: '2022 Porsche · 17,680 mi', health: 91, range: '227 mi', vin: '···· K88201', sync: 'SYNCED 12 MIN AGO', recall: null, odo: 17680, oilIn: 4300, tireIn: 900, brakeIn: 12000, regDays: 190, psi: '41 / 41', battery: 97 },
  { id: 3, name: 'Civic Type R', meta: '2021 Honda · 31,905 mi', health: 88, range: '402 mi', vin: '···· R55019', sync: 'SYNCED 1 HR AGO', recall: null, odo: 31905, oilIn: 300, tireIn: 2100, brakeIn: 5200, regDays: 12, psi: '38 / 36', battery: 88 },
];
