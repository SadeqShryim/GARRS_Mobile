// NHTSA client — spec §9 (decodeVin / recallsFor / nhtsaOutcome) and §10 (vehicleFromDecode).
// fetchImpl is injectable (default globalThis.fetch) so tests never touch the network. Every request
// races a 12s timer that both aborts the AbortController and rejects, so a stub that ignores the
// signal (as a test's never-resolving fetch does) still times out correctly.
import { maskVin } from './derive';
import { longDate } from './dates';
import type { Recall, Vehicle } from '../fixtures/types';

const TIMEOUT_MS = 12_000;

export class NhtsaError extends Error {
  kind: 'http' | 'timeout' | 'network';
  status?: number;
  constructor(kind: 'http' | 'timeout' | 'network', status?: number) {
    super(kind === 'http' ? `NHTSA request failed (${status})` : kind === 'timeout' ? 'NHTSA request timed out' : 'NHTSA request failed (network)');
    this.kind = kind;
    this.status = status;
  }
}

async function requestJson<T>(url: string, fetchImpl: typeof fetch): Promise<T> {
  const ctrl = new AbortController();
  let timer!: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { ctrl.abort(); reject(new NhtsaError('timeout')); }, TIMEOUT_MS);
  });
  let res: Response;
  try {
    res = await Promise.race([fetchImpl(url, { signal: ctrl.signal }), timeout]);
  } catch (e) {
    throw e instanceof NhtsaError ? e : new NhtsaError('network');
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new NhtsaError('http', res.status);
  return res.json() as Promise<T>;
}

// ---- decodeVin — vPIC DecodeVinValues ---------------------------------------------------------

export type DecodedVehicle = {
  vin: string; make: string; model: string; year: string; trim: string; body: string; fuel: string; plant: string;
  errorCodes: string[]; errorText: string;
};

type RawDecodeResult = {
  VIN?: string; Make?: string; Model?: string; ModelYear?: string; Trim?: string; BodyClass?: string;
  FuelTypePrimary?: string; PlantCountry?: string; ErrorCode?: string; ErrorText?: string;
};

export async function decodeVin(vin: string, fetchImpl: typeof fetch = globalThis.fetch): Promise<DecodedVehicle> {
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`;
  const json = await requestJson<{ Results: RawDecodeResult[] }>(url, fetchImpl);
  const r = json.Results[0] ?? {};
  return {
    vin: r.VIN ?? vin,
    make: r.Make ?? '',
    model: r.Model ?? '',
    year: r.ModelYear ?? '',
    trim: r.Trim ?? '',
    body: r.BodyClass ?? '',
    fuel: r.FuelTypePrimary ?? '',
    plant: r.PlantCountry ?? '',
    errorCodes: (r.ErrorCode ?? '').split(',').map((c) => c.trim()).filter(Boolean),
    errorText: r.ErrorText ?? '',
  };
}

// §9.1 — fatal when NHTSA couldn't decode (or had to *change*) the VIN, or a NA VIN fails its check
// digit; codes 8/9/12/14 are informational only. Code 1 alone on a non-NA VIN is not fatal (the BMW
// fixture decodes fine despite carrying no check digit).
const FATAL_CODES = new Set(['2', '3', '4', '5', '6', '7', '10', '11', '400']);
export function nhtsaOutcome(d: DecodedVehicle, northAmerican: boolean): 'clean' | 'fatal' {
  if (!d.make.trim()) return 'fatal';
  if (d.errorCodes.some((c) => FATAL_CODES.has(c))) return 'fatal';
  if (northAmerican && d.errorCodes.includes('1')) return 'fatal';
  return 'clean';
}

// ---- recallsFor — recalls/recallsByVehicle -----------------------------------------------------

export type NhtsaRecall = {
  campaign: string; code: string; component: string; summary: string; remedy: string; consequence: string;
  date: string /* ISO yyyy-mm-dd */; parkIt: boolean;
};

type RawRecall = {
  NHTSACampaignNumber: string; ReportReceivedDate: string; Component?: string; Summary?: string;
  Remedy?: string; Consequence?: string; parkIt?: boolean;
};

// '19V182000' → 'NHTSA 19V-182' — the app's existing recall-code style (e.g. 'NHTSA 23V-742').
const campaignCode = (n: string) => `NHTSA ${n.slice(0, 3)}-${n.slice(3, 6)}`;

// Sentence-case each ':'-separated segment: 'AIR BAGS:FRONTAL:DRIVER SIDE:INFLATOR MODULE' →
// 'Air bags · Frontal · Driver side · Inflator module' (only the segment's first letter capitalises).
const sentenceCase = (s: string) => {
  const t = s.trim().toLowerCase();
  return t ? t[0].toUpperCase() + t.slice(1) : t;
};
const mapComponent = (raw: string) => raw.split(':').map(sentenceCase).join(' · ');

// §9.2 — the recorded responses give DD/MM/YYYY though NHTSA's own docs say MM/DD/YYYY; parse
// defensively: a first field over 12 must be the day; else a second field over 12 makes the first
// the month; otherwise assume DD/MM (matches the campaign numbering — see spec §9.2).
function parseRecallDate(raw: string): string {
  const [a, b, y] = raw.split('/').map(Number);
  const [day, month] = a > 12 ? [a, b] : b > 12 ? [b, a] : [a, b];
  return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function mapRecall(r: RawRecall): NhtsaRecall {
  return {
    campaign: r.NHTSACampaignNumber,
    code: campaignCode(r.NHTSACampaignNumber),
    component: mapComponent(r.Component ?? ''),
    summary: r.Summary ?? '',
    remedy: r.Remedy ?? '',
    consequence: r.Consequence ?? '',
    date: parseRecallDate(r.ReportReceivedDate),
    parkIt: !!r.parkIt,
  };
}

export async function recallsFor(
  v: { make: string; model: string; year: string },
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<NhtsaRecall[]> {
  const qs = new URLSearchParams({ make: v.make, model: v.model, modelYear: v.year }).toString();
  const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?${qs}`;
  // NHTSA's recalls API replies with a lowercase 'results' key (unlike vPIC's 'Results').
  const json = await requestJson<{ results?: RawRecall[] }>(url, fetchImpl);
  return (json.results ?? []).map(mapRecall).sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : 0));
}

// ---- vehicleFromDecode — §10 -------------------------------------------------------------------

// Title case for display ('HONDA' → 'Honda'); distinct from mapComponent's per-segment sentence case.
const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

// Telemetry constants addVehicle() already uses (useAppStore.ts) — the demo has no other source for
// a scanned vehicle's odometer/service/tyre/battery figures (§16.6).
const TELEMETRY = { odo: 8410, oilIn: 4800, tireIn: 2600, brakeIn: 21000, regDays: 240, psi: '40 / 40', battery: 99 } as const;

export function vehicleFromDecode(d: DecodedVehicle, recalls: NhtsaRecall[], rawVin: string): Vehicle {
  const top = recalls[0];
  const recall: Recall | null = top
    ? { code: top.code, title: top.component, remedy: top.remedy, summary: top.summary, date: top.date }
    : null;
  return {
    id: Date.now(),
    name: [d.model, d.trim].filter(Boolean).join(' '),
    meta: `${d.year} ${titleCase(d.make)} · ${d.body || d.fuel}`,
    health: 90,
    range: '—',
    vin: maskVin(rawVin),
    sync: 'SYNCED JUST NOW',
    recall,
    ...TELEMETRY,
  };
}
