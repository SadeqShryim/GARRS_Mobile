import lab from './fixtures/ocr-lab.json';
import { DECODE } from '../../fixtures/decode';
import {
  candidates, checkDigit, computeScore, formatVin, hasValidCheckDigit, isNorthAmerican,
  normalizeRead, positionalOk, readVin, type LocalVerdict,
} from '../vin';

const HONDA = '1HGCM82633A004352';
const ACURA = 'JH4KA7561PC008269';
const TESLA = '5YJ3E1EA7KF317654'; // made-up: invalid check digit (§3)
const BMW = 'WBA3A5C57DF123456'; // European: carries no check digit (§3)

/** A synthetic OCR read: one symbol per character, all at the same confidence. */
const read = (text: string, c = 98) => ({ text, symbols: [...text].map((t) => ({ t, c })) });
const verdict = (p: Partial<LocalVerdict>): LocalVerdict =>
  ({ vin: HONDA, ocrMean: 98, subs: 0, deletions: 0, structure: 'check-ok', reason: '', ...p });
const rows = (vin: string) => lab.filter((r) => r.vin === vin);

describe('§5 — check digit', () => {
  it('computes the four sample VINs', () => {
    expect(checkDigit(HONDA)).toBe('3');
    expect(checkDigit(ACURA)).toBe('1');
    expect(checkDigit(TESLA)).toBe('5'); // the VIN carries a 7, so it is invalid
    expect(checkDigit(BMW)).toBe('0');
  });
  it('renders a remainder of 10 as X', () => expect(checkDigit('1M8GDM9AXKP042788')).toBe('X'));
  it('validates only when the ninth character matches', () => {
    expect(hasValidCheckDigit(HONDA)).toBe(true);
    expect(hasValidCheckDigit(ACURA)).toBe(true);
    expect(hasValidCheckDigit(TESLA)).toBe(false);
    expect(hasValidCheckDigit(BMW)).toBe(false);
  });
  it('rejects anything that is not 17 VIN characters', () => {
    expect(checkDigit('1HGCM82633A00435')).toBe('');
    expect(checkDigit('1HGCM82633A00435I')).toBe(''); // I, O, Q are not VIN characters
    expect(hasValidCheckDigit('')).toBe(false);
  });
  it('marks 1–5 as North American', () => {
    expect([HONDA, TESLA].map(isNorthAmerican)).toEqual([true, true]);
    expect([ACURA, BMW].map(isNorthAmerican)).toEqual([false, false]);
  });
});

describe('§5 — normalizeRead', () => {
  it('uppercases, strips and folds the three forbidden letters', () => {
    expect(normalizeRead('1hg cm8-2633a 0o4352')).toBe(HONDA);
    expect(normalizeRead('I O Q')).toBe('100');
    expect(normalizeRead('')).toBe('');
  });
});

describe('§5 — positionalOk', () => {
  it('position 9 takes a digit or X', () => {
    expect(positionalOk('1HGCM826X3A004352')).toBe(true);
    expect(positionalOk('1HGCM826A3A004352')).toBe(false);
  });
  it('position 10 rejects 0, U and Z', () => {
    expect(positionalOk(HONDA)).toBe(true);
    expect(['0', 'U', 'Z'].map((c) => positionalOk(HONDA.slice(0, 9) + c + HONDA.slice(10)))).toEqual([false, false, false]);
  });
  it('positions 15–17 must be digits', () => {
    expect(positionalOk('1HGCM82633A00435S')).toBe(false);
    expect(positionalOk('JH4KA7561PC00826S')).toBe(false);
  });
  it('North American VINs also need digits at 12–17', () => {
    expect(positionalOk('1FTVW1EL5NWG00001')).toBe(false); // G at position 12
    expect(positionalOk('WFTVW1EL5NWG00001')).toBe(true); // the same VIN outside 1–5
  });
});

describe('§5.1 — candidate search', () => {
  it('only accepts 17- and 18-character reads', () => {
    expect(candidates(read('1HGCM82633A00435'))).toEqual([]); // 16
    expect(candidates(read('1HGCM82633A0043521X'))).toEqual([]); // 19
    expect(candidates(read(HONDA))).toHaveLength(1);
  });
  it('returns nothing when the structure cannot be fixed', () => {
    expect(candidates(read('1HGCM82633A004WXY'))).toEqual([]); // W, X, Y at 15–17 have no digit twin
  });
  it('applies a positional fix before anything else — S at position 16 → 5', () => {
    expect(candidates(read('JH4KA7561PC0082S9'))).toEqual([{ vin: 'JH4KA7561PC008259', subs: 1, deletions: 0, ocrMean: 98 }]);
  });
  it('recovers the lab\'s 1→T misread by check digit', () => {
    expect(candidates(read('THGCM82633A004352'))[0]).toMatchObject({ vin: HONDA, subs: 1, deletions: 0 });
  });
  it('takes two substitutions but never more', () => {
    expect(candidates(read('THGCM8Z633A004352'))[0]).toMatchObject({ vin: HONDA, subs: 2 });
    for (const r of lab) for (const c of candidates(r)) {
      expect(c.subs).toBeLessThanOrEqual(2);
      expect(c.deletions).toBe(0);
    }
  });
  it('deletes exactly one character from an 18-character read', () => {
    const cs = candidates(read('1THGCM82633A004352'));
    expect(cs[0]).toMatchObject({ vin: HONDA, subs: 0, deletions: 1 });
    expect(cs.every((c) => c.deletions === 1)).toBe(true);
  });
  it('puts validated candidates first, then the cheapest, and averages the symbol confidences', () => {
    const r = { text: 'THGCM82633A004352', symbols: [...'THGCM82633A004352'].map((t, i) => ({ t, c: i === 0 ? 80 : 99 })) };
    const cs = candidates(r);
    expect(cs.map((c) => c.vin)).toEqual([HONDA, 'THGCM82633A004352']);
    expect(cs[0].ocrMean).toBeCloseTo((80 + 99 * 16) / 17, 6); // a substituted symbol keeps its own confidence
  });
  it('keeps the confidences aligned with the normalised text', () => {
    // 18 raw characters that normalise to 17: the stripped '-' drops its confidence, and a multi-character
    // symbol repeats its own for every character it keeps.
    const cs = candidates({ text: '1HG-CM82633A004352', symbols: [{ t: '1HG', c: 90 }, { t: '-', c: 10 }, { t: 'CM82633A004352', c: 96 }] });
    expect(cs).toHaveLength(1);
    expect(cs[0].vin).toBe(HONDA);
    expect(cs[0].ocrMean).toBeCloseTo((90 * 3 + 96 * 14) / 17, 6);
  });
});

describe('§5.2 / §6 — the OCR lab plates (§3)', () => {
  it('reads all 16 plates', () => expect(lab).toHaveLength(16));

  for (const vin of [HONDA, ACURA]) {
    it('recovers ' + vin + ' on every plate and passes with no lookup', () => {
      for (const r of rows(vin)) {
        const v = readVin(r);
        expect([r.plate, v.vin, v.structure]).toEqual([r.plate, vin, 'check-ok']);
        expect(computeScore(v, 'none').passes).toBe(true);
      }
    });
  }
  it('scores the two 1→T plates at 96 with a single substitution', () => {
    const misread = lab.filter((r) => r.text.startsWith('T'));
    expect(misread.map((r) => r.plate)).toEqual(['dash', 'glare']);
    for (const r of misread) {
      const v = readVin(r);
      expect([v.vin, v.subs, v.deletions]).toEqual([HONDA, 1, 0]);
      const { score, passes } = computeScore(v, 'none');
      expect(score).toBeGreaterThanOrEqual(93);
      expect(score).toBeLessThanOrEqual(97);
      expect([score, passes]).toEqual([96, true]);
    }
  });
  it('fails the made-up North American VIN before any network call', () => {
    for (const r of rows(TESLA)) {
      const v = readVin(r);
      expect([v.vin, v.structure, v.reason]).toEqual([TESLA, 'check-fail', 'Check digit does not match']);
      expect(computeScore(v, 'none')).toEqual({ score: 59, passes: false });
    }
  });
  it('leaves the European VIN to NHTSA', () => {
    for (const r of rows(BMW)) {
      const v = readVin(r);
      expect([v.vin, v.structure, v.subs]).toEqual([BMW, 'unchecked', 0]);
      expect(computeScore(v, 'clean')).toEqual({ score: 99, passes: true });
      expect(computeScore(v, 'fatal').passes).toBe(false);
    }
  });
});

describe('§5.2 — verdicts on synthetic reads', () => {
  it('a single insertion costs one deletion and scores 93', () => {
    const v = readVin(read('1THGCM82633A004352'));
    expect(v).toEqual({ vin: HONDA, ocrMean: 98, subs: 0, deletions: 1, structure: 'check-ok', reason: '' });
    expect(computeScore(v, 'none')).toEqual({ score: 93, passes: true });
  });
  it('a 16-character read is malformed', () => {
    const v = readVin(read('1HGCM82633A00435'));
    expect(v).toEqual({ vin: null, ocrMean: 0, subs: 0, deletions: 0, structure: 'malformed', reason: 'Not a 17-character VIN' });
    expect(computeScore(v, 'none')).toEqual({ score: 0, passes: false });
  });
  it('two substitutions still pass, a third is out of reach', () => {
    expect(computeScore(readVin(read('THGCM8Z633A004352')), 'none')).toEqual({ score: 93, passes: true });
  });
  it('trusts a demo VIN read cleanly despite its placeholder check digit (§16.4)', () => {
    for (const vin of Object.keys(DECODE)) {
      expect(hasValidCheckDigit(vin)).toBe(false);
      const v = readVin(read(vin, 97));
      expect([v.vin, v.structure, v.subs, v.deletions]).toEqual([vin, 'check-ok', 0, 0]);
      expect(computeScore(v, 'none')).toEqual({ score: 98, passes: true });
    }
  });
});

describe('§6 — confidence score', () => {
  it('scores the worked cases from the spec', () => {
    expect(computeScore(verdict({ ocrMean: 98.9 }), 'none').score).toBe(99); // clean sticker read
    expect(computeScore(verdict({ ocrMean: 98.6, subs: 1 }), 'none').score).toBe(96); // dash plate, T→1 recovered
    expect(computeScore(verdict({ ocrMean: 98, deletions: 1 }), 'none').score).toBe(93); // fast-model insertion
    expect(computeScore(verdict({ ocrMean: 98, subs: 2, deletions: 1 }), 'none')).toEqual({ score: 87, passes: false }); // 59 + 40 − 12
  });
  it('gives no structure credit to a failed check digit or a malformed read', () => {
    expect(computeScore(verdict({ structure: 'check-fail', ocrMean: 98.9 }), 'clean')).toEqual({ score: 59, passes: false });
    expect(computeScore(verdict({ structure: 'malformed', ocrMean: 0 }), 'clean')).toEqual({ score: 0, passes: false });
  });
  it('lets NHTSA decide an unchecked read; no lookup means no credit', () => {
    const v = verdict({ structure: 'unchecked', ocrMean: 98.9 });
    expect(computeScore(v, 'clean')).toEqual({ score: 99, passes: true });
    expect(computeScore(v, 'fatal')).toEqual({ score: 59, passes: false });
    expect(computeScore(v, 'none')).toEqual({ score: 59, passes: false });
  });
  it('rounds the final sum, and the rounded number is what is gated', () => {
    expect(computeScore(verdict({ ocrMean: 83 }), 'none')).toEqual({ score: 90, passes: true }); // 89.8 → 90
    expect(computeScore(verdict({ ocrMean: 82.4 }), 'none')).toEqual({ score: 89, passes: false }); // 89.44 → 89
  });
  it('clamps to 0–100', () => {
    expect(computeScore(verdict({ ocrMean: 100 }), 'none').score).toBe(100);
    expect(computeScore(verdict({ structure: 'check-fail', ocrMean: 0, subs: 2 }), 'none').score).toBe(0);
  });
});

describe('§11 — formatVin', () => {
  it('groups 4-4-4-4-1', () => expect(formatVin(HONDA)).toBe('1HGC M826 33A0 0435 2'));
  it('leaves a short string alone', () => expect(formatVin('1HGC')).toBe('1HGC'));
});
