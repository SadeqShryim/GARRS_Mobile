// src/screens/scan/scanFlow.ts
// Spec §4, §6, §10, §11 — the scan sequence as a plain async function, so the whole gate is testable without a
// camera, a WebView or React: capture → recognise → readVin → (demo table | NHTSA decode + recalls) → add or fail.
// Every outcome leaves the store's `scan` in a terminal phase; the screen only renders what it finds there.
import { DECODE } from '../../fixtures/decode';
import type { Vehicle } from '../../fixtures/types';
import { decodeVin as decodeDemoVin, maskVin } from '../../lib/derive';
import { decodeVin, nhtsaOutcome, recallsFor, vehicleFromDecode, NhtsaError } from '../../lib/nhtsa';
import { computeScore, isNorthAmerican, readVin, type Read } from '../../lib/vin';
import type { ScanState } from '../../store/useAppStore';

export type ScanDeps = {
  capture: () => Promise<{ base64: string }>;
  recognize: (base64: string) => Promise<Read>;
  setScan: (p: Partial<ScanState>) => void;
  addScannedVehicle: (v: Vehicle) => void;
  fetchImpl?: typeof fetch;
  now?: () => number;
};

/**
 * §11 — the three failures that have no score to show name themselves on the chip instead. The label is never
 * stored: `ScanResult` derives it from the reason, so the store keeps exactly the five fields spec §10 defines.
 */
export const FAIL_LABELS = { malformed: 'NO VIN FOUND', engine: 'READER UNAVAILABLE', network: 'NO CONNECTION' } as const;

/** §11 — every sentence the result card can print under the chip. */
export const REASONS = {
  malformed: 'Not a 17-character VIN',
  check: 'Check digit does not match',
  decode: 'NHTSA could not decode this VIN',
  low: 'Confidence below 90 %',
  engine: 'Reader unavailable — check your connection and try again',
  network: "Couldn't reach NHTSA — check your connection",
} as const;

const LABEL_OF: Record<string, string> = {
  [REASONS.malformed]: FAIL_LABELS.malformed,
  [REASONS.engine]: FAIL_LABELS.engine,
  [REASONS.network]: FAIL_LABELS.network,
};

/** The failed chip's label: the reader/reading failures name themselves, every scored failure shows its score. */
export const failLabel = (score: number | null, reason: string | null): string =>
  (reason ? LABEL_OF[reason] : undefined) ?? `${score ?? 0}% — TOO LOW`;

/** §11 — the recall line on the success card. */
export const recallNote = (code: string) => `1 open recall — ${code}`;

// Telemetry constants addVehicle()/vehicleFromDecode() already use; the demo has no other source for a scanned
// vehicle's odometer, service intervals, tyre pressure or battery (§16.6).
const TELEMETRY = { odo: 8410, oilIn: 4800, tireIn: 2600, brakeIn: 21000, regDays: 240, psi: '40 / 40', battery: 99 } as const;

/**
 * §4 — one capture, one verdict. Failures are reported through `setScan`, never thrown; the only throws that
 * escape `sequence` are the reader's (recognise/capture rejected) and NHTSA's, which the catch below maps to the
 * two copy strings §11 gives them. An unexpected throw lands on the reader copy: the advice is the same.
 */
export async function runScan(deps: ScanDeps): Promise<void> {
  deps.setScan({ phase: 'reading', score: null, vin: null, vehicleName: null, reason: null });
  try {
    await sequence(deps);
  } catch (e) {
    deps.setScan({ phase: 'failed', score: null, reason: e instanceof NhtsaError ? REASONS.network : REASONS.engine });
  }
}

async function sequence(deps: ScanDeps): Promise<void> {
  const { capture, recognize, setScan, addScannedVehicle, fetchImpl, now = Date.now } = deps;
  // A failed read keeps its best-guess VIN in the store so "Type it instead" can prefill the Add sheet (§11).
  const fail = (score: number | null, reason: string, vin: string | null = null) => setScan({ phase: 'failed', score, reason, vin });

  const shot = await capture();
  const read = await recognize(shot.base64);
  const v = readVin(read);

  if (!v.vin) { fail(null, REASONS.malformed); return; }                                     // §5.2 malformed — no network
  if (v.structure === 'check-fail') { fail(computeScore(v, 'none').score, REASONS.check, v.vin); return; } // §5.2 — fails before the network

  const vin = v.vin;
  if (DECODE[vin]) {                                                                         // §16.4 — the app's own demo VINs
    const d = decodeDemoVin(vin);
    const vehicle: Vehicle = {
      id: now(), name: d.name, meta: d.meta, health: d.health, range: d.range,
      vin: maskVin(vin), sync: 'SYNCED JUST NOW', recall: null, ...TELEMETRY,
    };
    addScannedVehicle(vehicle);
    setScan({ phase: 'added', score: computeScore(v, 'none').score, vin, vehicleName: vehicle.name, reason: null });
    return;
  }

  setScan({ phase: 'checking' });
  const d = await decodeVin(vin, fetchImpl);
  const outcome = nhtsaOutcome(d, isNorthAmerican(vin));
  // A check-ok read already has its structure credit (§6), so the decode only has to not contradict it.
  const { score, passes } = computeScore(v, v.structure === 'check-ok' ? 'none' : outcome);
  // Fatal means NHTSA either could not decode the string or had to change it — the read is wrong even when the
  // check digit validated locally (§9.1), so a check-ok read fails here too.
  if (outcome === 'fatal') { fail(score, REASONS.decode, vin); return; }
  if (!passes) { fail(score, REASONS.low, vin); return; }

  // A recall lookup that fails must not block the add: the vehicle is known, its campaigns are not (§11).
  const recalls = await recallsFor({ make: d.make, model: d.model, year: d.year }, fetchImpl).catch(() => []);
  const vehicle = vehicleFromDecode(d, recalls, vin);
  addScannedVehicle(vehicle);
  setScan({
    phase: 'added', score, vin, vehicleName: vehicle.name,
    reason: vehicle.recall ? recallNote(vehicle.recall.code) : null,
  });
}
