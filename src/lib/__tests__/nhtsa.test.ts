import decodeHonda from './fixtures/nhtsa/decode-1HGCM82633A004352.json';
import decodeHonda16 from './fixtures/nhtsa/decode-1HGCM82633A00435.json';
import decodeThgcm from './fixtures/nhtsa/decode-THGCM82633A004352.json';
import decodeBmw from './fixtures/nhtsa/decode-WBA3A5C57DF123456.json';
import decodeTesla from './fixtures/nhtsa/decode-5YJ3E1EA7KF317654.json';
import decodeAcura from './fixtures/nhtsa/decode-JH4KA7561PC008269.json';
import recallsHonda2003 from './fixtures/nhtsa/recalls-make-honda_model-accord_modelYear-2003.json';
import recallsHonda1975 from './fixtures/nhtsa/recalls-make-honda_model-accord_modelYear-1975.json';
import recallsTesla2019 from './fixtures/nhtsa/recalls-make-tesla_model-model-3_modelYear-2019.json';
import { decodeVin, nhtsaOutcome, recallsFor, vehicleFromDecode, NhtsaError, type DecodedVehicle } from '../nhtsa';

// A fetchImpl stub — every real network call in this suite is forbidden by the task; only recorded
// fixtures (or synthetic bodies for the date-parsing/error-path cases) ever flow through `requestJson`.
const okFetch = (body: unknown): typeof fetch =>
  (async () => ({ ok: true, status: 200, json: async () => body }) as Response) as unknown as typeof fetch;
const errFetch = (status: number): typeof fetch =>
  (async () => ({ ok: false, status, json: async () => ({}) }) as Response) as unknown as typeof fetch;

describe('decodeVin', () => {
  it('maps a clean Honda decode', async () => {
    const d = await decodeVin('1HGCM82633A004352', okFetch(decodeHonda));
    expect(d).toEqual({
      vin: '1HGCM82633A004352', make: 'HONDA', model: 'Accord', year: '2003', trim: 'EX-V6',
      body: 'Coupe', fuel: 'Gasoline', plant: 'UNITED STATES (USA)', errorCodes: ['0'],
      errorText: '0 - VIN decoded clean. Check Digit (9th position) is correct',
    });
    expect(nhtsaOutcome(d, true)).toBe('clean');
  });

  it('an empty Make is fatal regardless of the error codes', async () => {
    const d = await decodeVin('THGCM82633A004352', okFetch(decodeThgcm));
    expect(d.make).toBe('');
    expect(d.errorCodes).toEqual(['1', '7']);
    expect(nhtsaOutcome(d, true)).toBe('fatal');
    expect(nhtsaOutcome(d, false)).toBe('fatal');
  });

  it('a 16-character VIN (code 6) is fatal', async () => {
    const d = await decodeVin('1HGCM82633A00435', okFetch(decodeHonda16));
    expect(d.errorCodes).toEqual(['6']);
    expect(nhtsaOutcome(d, true)).toBe('fatal');
  });

  it('BMW: code 1 alone is fatal only when the VIN is North American', async () => {
    const d = await decodeVin('WBA3A5C57DF123456', okFetch(decodeBmw));
    expect(d).toMatchObject({ make: 'BMW', model: '328i', year: '2013', errorCodes: ['1'] });
    expect(nhtsaOutcome(d, false)).toBe('clean');
    expect(nhtsaOutcome(d, true)).toBe('fatal');
  });

  it('the made-up Tesla VIN is fatal (NA VIN, code 1)', async () => {
    const d = await decodeVin('5YJ3E1EA7KF317654', okFetch(decodeTesla));
    expect(nhtsaOutcome(d, true)).toBe('fatal');
  });

  it('a clean non-US decode (Acura, JDM VIN)', async () => {
    const d = await decodeVin('JH4KA7561PC008269', okFetch(decodeAcura));
    expect(d).toMatchObject({ make: 'ACURA', model: 'Legend', trim: 'L', errorCodes: ['0'] });
    expect(nhtsaOutcome(d, false)).toBe('clean');
  });
});

describe('nhtsaOutcome — §9.1 fatal-code set', () => {
  const mk = (errorCodes: string[], make = 'HONDA'): DecodedVehicle => ({
    vin: '', make, model: '', year: '', trim: '', body: '', fuel: '', plant: '', errorCodes, errorText: '',
  });
  it('"1,11,400" is fatal (11 and 400 are both fatal codes)', () => expect(nhtsaOutcome(mk(['1', '11', '400']), false)).toBe('fatal'));
  it('"8" is informational only — clean', () => expect(nhtsaOutcome(mk(['8']), true)).toBe('clean'));
  it('"1" is clean off North America, fatal on it', () => {
    expect(nhtsaOutcome(mk(['1']), false)).toBe('clean');
    expect(nhtsaOutcome(mk(['1']), true)).toBe('fatal');
  });
  it('"2" (VIN corrected) is fatal', () => expect(nhtsaOutcome(mk(['2']), false)).toBe('fatal'));
});

describe('recallsFor', () => {
  it('maps the Honda Accord recalls (component/code/date) and sorts newest first', async () => {
    const recalls = await recallsFor({ make: 'HONDA', model: 'ACCORD', year: '2003' }, okFetch(recallsHonda2003));
    expect(recalls).toHaveLength(3);
    const airbag = recalls.find((r) => r.campaign === '19V182000')!;
    expect(airbag).toMatchObject({
      code: 'NHTSA 19V-182',
      component: 'Air bags · Frontal · Driver side · Inflator module',
      date: '2019-03-06',
      parkIt: false,
    });
    expect(airbag.summary).toBe(recallsHonda2003.results[0].Summary);
    expect(airbag.remedy).toBe(recallsHonda2003.results[0].Remedy);
    const dates = recalls.map((r) => r.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('an empty results array resolves to []', async () => {
    expect(await recallsFor({ make: 'HONDA', model: 'ACCORD', year: '1975' }, okFetch(recallsHonda1975))).toEqual([]);
  });

  it('maps and sorts the Tesla Model 3 recalls newest first', async () => {
    const recalls = await recallsFor({ make: 'TESLA', model: 'MODEL 3', year: '2019' }, okFetch(recallsTesla2019));
    expect(recalls).toHaveLength(3);
    expect(recalls.map((r) => r.date)).toEqual(['2022-02-01', '2022-01-27', '2021-10-25']);
    expect(recalls.map((r) => r.code)).toEqual(['NHTSA 22V-045', 'NHTSA 22V-037', 'NHTSA 21V-835']);
  });

  it.each([
    ['15/01/2020', '2020-01-15'], // first field > 12 → it is the day
    ['06/03/2019', '2019-03-06'], // neither field > 12 → assume DD/MM
    ['12/25/2021', '2021-12-25'], // second field > 12 → the first field is the month
  ])('parses %s defensively as %s', async (raw, iso) => {
    const body = { Count: 1, results: [{ NHTSACampaignNumber: '20V017000', ReportReceivedDate: raw, Component: 'A:B', Summary: 's', Remedy: 'r', Consequence: 'c' }] };
    const recalls = await recallsFor({ make: 'x', model: 'y', year: '2020' }, okFetch(body));
    expect(recalls[0].date).toBe(iso);
  });

  it('a non-2xx response rejects with kind "http"', async () => {
    await expect(recallsFor({ make: 'x', model: 'y', year: '2020' }, errFetch(500))).rejects.toMatchObject({ kind: 'http', status: 500 });
  });

  it('a never-resolving fetch rejects with kind "timeout" after 12s and aborts the signal', async () => {
    jest.useFakeTimers();
    let signal: AbortSignal | undefined;
    const stub = ((_url: string, init?: RequestInit) => {
      signal = init?.signal ?? undefined;
      return new Promise(() => {}); // never settles, ignores the signal — like a hung connection
    }) as unknown as typeof fetch;
    const rejected = expect(recallsFor({ make: 'x', model: 'y', year: '2020' }, stub)).rejects.toBeInstanceOf(NhtsaError);
    await jest.advanceTimersByTimeAsync(12_000);
    await rejected;
    expect(signal?.aborted).toBe(true);
    jest.useRealTimers();
  });

  it('a rejected fetch (not from our own abort) is a network error', async () => {
    const stub = (async () => { throw new TypeError('Network request failed'); }) as unknown as typeof fetch;
    await expect(recallsFor({ make: 'x', model: 'y', year: '2020' }, stub)).rejects.toMatchObject({ kind: 'network' });
  });
});

describe('vehicleFromDecode', () => {
  it('builds the Honda vehicle with its newest recall', async () => {
    const d = await decodeVin('1HGCM82633A004352', okFetch(decodeHonda));
    // Feed vehicleFromDecode a single-recall response (the recorded airbag campaign) so this test
    // pins the field mapping independently of recallsFor's own sort-order coverage above.
    const oneRecall = { Count: 1, results: [recallsHonda2003.results[0]] };
    const recalls = await recallsFor({ make: 'HONDA', model: 'ACCORD', year: '2003' }, okFetch(oneRecall));
    const v = vehicleFromDecode(d, recalls, '1HGCM82633A004352');
    expect(typeof v.id).toBe('number');
    expect(v).toMatchObject({
      name: 'Accord EX-V6',
      meta: '2003 Honda · Coupe',
      health: 90,
      range: '—',
      vin: '···· 004352',
      sync: 'SYNCED JUST NOW',
      recall: {
        code: 'NHTSA 19V-182',
        title: 'Air bags · Frontal · Driver side · Inflator module',
        date: '2019-03-06',
      },
      odo: 8410, oilIn: 4800, tireIn: 2600, brakeIn: 21000, regDays: 240, psi: '40 / 40', battery: 99,
    });
    expect(v.recall!.remedy).toBe(recallsHonda2003.results[0].Remedy);
    expect(v.recall!.summary).toBe(recallsHonda2003.results[0].Summary);
  });

  it('recall is null when there are no open recalls', async () => {
    const d = await decodeVin('JH4KA7561PC008269', okFetch(decodeAcura));
    const v = vehicleFromDecode(d, [], 'JH4KA7561PC008269');
    expect(v.recall).toBeNull();
    expect(v.name).toBe('Legend L');
    expect(v.meta).toBe('1993 Acura · Sedan/Saloon');
  });
});
