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
