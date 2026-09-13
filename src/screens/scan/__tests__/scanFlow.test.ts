import lab from '../../../lib/__tests__/fixtures/ocr-lab.json';
import decodeHonda from '../../../lib/__tests__/fixtures/nhtsa/decode-1HGCM82633A004352.json';
import decodeBmw from '../../../lib/__tests__/fixtures/nhtsa/decode-WBA3A5C57DF123456.json';
import decodeThgcm from '../../../lib/__tests__/fixtures/nhtsa/decode-THGCM82633A004352.json';
import recallsHonda2003 from '../../../lib/__tests__/fixtures/nhtsa/recalls-make-honda_model-accord_modelYear-2003.json';
import { DEMO_VIN } from '../../../fixtures/decode';
import type { Vehicle } from '../../../fixtures/types';
import { NhtsaError } from '../../../lib/nhtsa';
import type { Read } from '../../../lib/vin';
import type { ScanState } from '../../../store/useAppStore';
import { FAIL_LABELS, REASONS, failLabel, runScan, type ScanDeps } from '../scanFlow';

// Spec §4/§6/§10/§11. Every read here is a recorded OCR lab row (or a synthetic one built the same way), every
// HTTP response a recorded NHTSA fixture routed by URL — nothing in this suite touches the network or React.

const HONDA = '1HGCM82633A004352';
const TESLA = '5YJ3E1EA7KF317654'; // made-up VIN: its check digit does not validate (§3)
const BMW = 'WBA3A5C57DF123456';   // European: carries no check digit, so NHTSA decides (§6)

const row = (plate: string, vin: string): Read => {
  const r = lab.find((x) => x.plate === plate && x.vin === vin);
  if (!r) throw new Error('no lab row for ' + plate + ' ' + vin);
  return { text: r.text, symbols: r.symbols };
};
/** A synthetic read: one symbol per character, all at the same confidence. */
const read = (text: string, c = 98): Read => ({ text, symbols: [...text].map((t) => ({ t, c })) });

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;
const failed = (status: number) => ({ ok: false, status, json: async () => ({}) }) as Response;

// The Honda's single recorded airbag campaign — the same single-entry body Task 3's mapping test uses.
const ONE_RECALL = { Count: 1, results: [recallsHonda2003.results[0]] };

type Routes = { decode?: unknown; recalls?: unknown; recallsStatus?: number; decodeThrows?: unknown };
const router = (routes: Routes) =>
  jest.fn(async (url: string) => {
    if (url.includes('DecodeVinValues')) {
      if (routes.decodeThrows) throw routes.decodeThrows;
      if (!routes.decode) throw new Error('unrouted decode: ' + url);
      return ok(routes.decode);
    }
    if (url.includes('recallsByVehicle')) {
      if (routes.recallsStatus) return failed(routes.recallsStatus);
      if (!routes.recalls) throw new Error('unrouted recalls: ' + url);
      return ok(routes.recalls);
    }
    throw new Error('unexpected url: ' + url);
  });

type Harness = { patches: Partial<ScanState>[]; added: Vehicle[]; last: Partial<ScanState>; phases: string[] };

async function run(recognized: Read | Error, over: Partial<ScanDeps> = {}): Promise<Harness> {
  const patches: Partial<ScanState>[] = [];
  const added: Vehicle[] = [];
  const deps: ScanDeps = {
    capture: async () => ({ base64: 'QUJD' }),
    recognize: async () => { if (recognized instanceof Error) throw recognized; return recognized; },
    setScan: (p) => { patches.push(p); },
    addScannedVehicle: (v) => { added.push(v); },
    ...over,
  };
  await runScan(deps);
  return { patches, added, last: patches[patches.length - 1], phases: patches.flatMap((p) => (p.phase ? [p.phase] : [])) };
}

describe('runScan — the successful paths', () => {
  it('adds the Honda from the sticker read with its open recall (§4)', async () => {
    const fetchImpl = router({ decode: decodeHonda, recalls: ONE_RECALL });
    const h = await run(row('sticker', HONDA), { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(h.phases).toEqual(['reading', 'checking', 'added']);
    expect(h.patches[0]).toEqual({ phase: 'reading', score: null, vin: null, vehicleName: null, reason: null });
    expect(h.added).toHaveLength(1);
    expect(h.added[0]).toMatchObject({ name: 'Accord EX-V6', meta: '2003 Honda · Coupe', vin: '···· 004352' });
    expect(h.added[0].recall).toMatchObject({ code: 'NHTSA 19V-182' });
    expect(h.last).toEqual({ phase: 'added', score: 99, vin: HONDA, vehicleName: 'Accord EX-V6', reason: '1 open recall — NHTSA 19V-182' });
    expect(h.last.score).toBeGreaterThanOrEqual(90);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('still adds the dash plate whose 1 was read as a T — one substitution, 96 (§3, §6)', async () => {
    const fetchImpl = router({ decode: decodeHonda, recalls: ONE_RECALL });
    const h = await run(row('dash', HONDA), { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(h.last).toMatchObject({ phase: 'added', score: 96, vin: HONDA, vehicleName: 'Accord EX-V6' });
    expect(h.added).toHaveLength(1);
  });

  it('adds the European VIN once NHTSA decodes it clean (§6 structure from the lookup)', async () => {
    const fetchImpl = router({ decode: decodeBmw, recalls: { Count: 0, results: [] } });
    const h = await run(row('sticker', BMW), { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(h.phases).toEqual(['reading', 'checking', 'added']);
    expect(h.added[0]).toMatchObject({ name: '328i', meta: '2013 Bmw · Sedan/Saloon', recall: null });
    expect(h.last).toEqual({ phase: 'added', score: 99, vin: BMW, vehicleName: '328i', reason: null });
  });

  it('adds a demo VIN straight from the app table, with no network call at all (§16.4)', async () => {
    const fetchImpl = router({});
    const h = await run(read(DEMO_VIN, 97), { fetchImpl: fetchImpl as unknown as typeof fetch, now: () => 4242 });
    expect(h.phases).toEqual(['reading', 'added']);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(h.added[0]).toMatchObject({
      id: 4242, name: 'F-150 Lightning', meta: '2023 Ford · 8,410 mi', health: 94, range: '320 mi',
      vin: '···· G00001', sync: 'SYNCED JUST NOW', recall: null,
      odo: 8410, oilIn: 4800, tireIn: 2600, brakeIn: 21000, regDays: 240, psi: '40 / 40', battery: 99,
    });
    expect(h.last).toEqual({ phase: 'added', score: 98, vin: DEMO_VIN, vehicleName: 'F-150 Lightning', reason: null });
  });

  it('adds the vehicle even when the recall lookup fails — the campaigns are not the gate', async () => {
    const fetchImpl = router({ decode: decodeHonda, recallsStatus: 500 });
    const h = await run(row('sticker', HONDA), { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(h.added[0]).toMatchObject({ name: 'Accord EX-V6', recall: null });
    expect(h.last).toEqual({ phase: 'added', score: 99, vin: HONDA, vehicleName: 'Accord EX-V6', reason: null });
  });

  it('reads what the capture produced', async () => {
    const recognize = jest.fn(async () => row('sticker', HONDA));
    const fetchImpl = router({ decode: decodeHonda, recalls: ONE_RECALL });
    await run(row('sticker', HONDA), { recognize, capture: async () => ({ base64: 'Wk9P' }), fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(recognize).toHaveBeenCalledWith('Wk9P');
  });
});

describe('runScan — the failures', () => {
  it('fails a North American VIN whose check digit does not match, before any network call (§5.2)', async () => {
    const fetchImpl = router({});
    const h = await run(row('sticker', TESLA), { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(h.phases).toEqual(['reading', 'failed']);
    expect(h.last).toEqual({ phase: 'failed', score: 59, reason: REASONS.check, vin: TESLA });
    expect(failLabel(h.last.score ?? null, h.last.reason ?? null)).toBe('59% — TOO LOW');
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(h.added).toEqual([]);
  });

  it('fails a read that is not 17 characters with NO VIN FOUND', async () => {
    const h = await run(read('1HGCM82633A00435'));
    expect(h.last).toEqual({ phase: 'failed', score: null, reason: REASONS.malformed, vin: null });
    expect(failLabel(null, h.last.reason ?? null)).toBe(FAIL_LABELS.malformed);
  });

  it('fails with the reader copy when the engine rejects', async () => {
    const h = await run(new Error('timeout'));
    expect(h.last).toEqual({ phase: 'failed', score: null, reason: REASONS.engine });
    expect(failLabel(null, h.last.reason ?? null)).toBe(FAIL_LABELS.engine);
  });

  it('fails with the reader copy when the capture itself throws', async () => {
    const h = await run(read(HONDA), { capture: async () => { throw new Error('camera'); } });
    expect(h.last).toMatchObject({ phase: 'failed', reason: REASONS.engine });
  });

  it('fails with the connection copy when NHTSA cannot be reached', async () => {
    const fetchImpl = router({ decodeThrows: new NhtsaError('timeout') });
    const h = await run(row('sticker', BMW), { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(h.phases).toEqual(['reading', 'checking', 'failed']);
    expect(h.last).toEqual({ phase: 'failed', score: null, reason: REASONS.network });
    expect(failLabel(null, h.last.reason ?? null)).toBe(FAIL_LABELS.network);
    expect(h.added).toEqual([]);
  });

  it('fails when NHTSA cannot decode the VIN it was given (§9.1 fatal)', async () => {
    const fetchImpl = router({ decode: decodeThgcm }); // the misread's recorded response: codes 1,7 and an empty Make
    const h = await run(row('sticker', BMW), { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(h.last).toEqual({ phase: 'failed', score: 59, reason: REASONS.decode, vin: BMW });
    expect(failLabel(h.last.score ?? null, h.last.reason ?? null)).toBe('59% — TOO LOW');
    expect(fetchImpl).toHaveBeenCalledTimes(1); // no recall lookup for a vehicle that was never identified
  });

  it('fails a clean decode whose confidence is still under the gate', async () => {
    const fetchImpl = router({ decode: decodeBmw });
    const h = await run(read(BMW, 80), { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(h.last).toEqual({ phase: 'failed', score: 88, reason: REASONS.low, vin: BMW }); // 0.6·80 + 40
    expect(h.added).toEqual([]);
  });
});

describe('failLabel — §11 chip labels', () => {
  it('names the three unscored failures and shows the score for the rest', () => {
    expect(failLabel(null, REASONS.malformed)).toBe('NO VIN FOUND');
    expect(failLabel(null, REASONS.engine)).toBe('READER UNAVAILABLE');
    expect(failLabel(null, REASONS.network)).toBe('NO CONNECTION');
    expect(failLabel(61, REASONS.check)).toBe('61% — TOO LOW');
    expect(failLabel(87, REASONS.low)).toBe('87% — TOO LOW');
    expect(failLabel(null, null)).toBe('0% — TOO LOW');
  });
});
