export type Recall = { code: string; title: string };
export type Vehicle = {
  id: number; name: string; meta: string; health: number; range: string; vin: string; sync: string;
  recall: Recall | null; odo: number; oilIn: number; tireIn: number; brakeIn: number; regDays: number; psi: string; battery: number;
};
export type TabId = 'garage' | 'recalls' | 'service' | 'hub' | 'profile';
