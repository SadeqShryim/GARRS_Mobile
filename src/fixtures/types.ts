export type Recall = { code: string; title: string };
export type Vehicle = {
  id: number; name: string; meta: string; health: number; range: string; vin: string; sync: string;
  recall: Recall | null; odo: number; oilIn: number; tireIn: number; brakeIn: number; regDays: number; psi: string; battery: number;
};
export type TabId = 'garage' | 'recalls' | 'service' | 'hub' | 'profile';

// Slice 3 — GaragePrototype.dc.html lines 1016–1225, 1431–1451
export type RecallState = 'open' | 'scheduled' | 'closed';
export type RecallFilter = RecallState;
export type RecallItem = { id: string; vid: number; code: string; title: string; severity: string; remedy: string; dealer: string; est: string; done: string; state: RecallState };
export type HistoryItem = Omit<RecallItem, 'state'>;
export type Reason = { why: string; facts: [string, string][]; steps: [string, string][]; note: string };
export type StateMeta = { label: string; chipBg: string; chipFg: string; icon: string; status: string };
export type ArticleBlock = { heading?: string; text: string };
export type Article = { id: string; kicker: string; icon: string; read: string; date: string; wash: [string, string]; title: string; dek: string; body: ArticleBlock[] };
export type LightGroup = 'critical' | 'warning' | 'info';
export type LightFilter = 'all' | LightGroup;
export type Light = { id: string; group: LightGroup; name: string; short: string; icon: string; tone: string; glyph?: string; means: string; action: string };
export type ChatFrom = 'them' | 'me';
export type ChatMessage = { from: ChatFrom; content: string };
export type PlanId = 'standard' | 'plus' | 'pro';
export type Plan = { id: PlanId; name: string; price: string; cta: string; recommend?: boolean; features: [string, 0 | 1][] };
export type SvcMethod = 'dropoff' | 'concierge';
export type SvcMethodDef = { key: SvcMethod; label: string; icon: string };
export type SvcDate = { day: string; date: string };
export type ActivityItem = { color: string; title: string; detail: string };
export type TrackerState = 'done' | 'active' | 'pending';
