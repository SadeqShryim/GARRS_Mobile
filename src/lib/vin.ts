// VIN library — spec §5 (normalise, check digit, positional rules, bounded candidate search) and §6 (the 0-100 gate).
// Pure: no React, no I/O. The demo-VIN rule (§5.2, §16.4) is the only fixture dependency.
import { DECODE } from '../fixtures/decode';

export const VIN_CHARS = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'; // no I, O, Q
export const TRANSLIT: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9, S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9 };
export const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

const digit = (c: string) => c >= '0' && c <= '9';
const value = (c: string) => (digit(c) ? Number(c) : TRANSLIT[c]);
const vinChars = (vin: string) => vin.length === 17 && [...vin].every((c) => VIN_CHARS.includes(c));
const mean = (ns: number[]) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0);

/** Weighted sum mod 11; 10 → 'X'. '' when the input is not 17 VIN characters. */
export function checkDigit(vin: string): string {
  if (!vinChars(vin)) return '';
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += value(vin[i]) * WEIGHTS[i]; // position 9 carries weight 0, so an 'X' there is harmless
  const r = sum % 11;
  return r === 10 ? 'X' : String(r);
}

/** First character '1'–'5' — these VINs must carry a valid check digit (§5). */
export const isNorthAmerican = (vin: string) => vin[0] >= '1' && vin[0] <= '5';
export const hasValidCheckDigit = (vin: string) => vinChars(vin) && vin[8] === checkDigit(vin);

/** Uppercase, strip everything outside [A-Z0-9], then I→1, O→0, Q→0 (§5). */
export const normalizeRead = (text: string) =>
  text.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/I/g, '1').replace(/[OQ]/g, '0');

export const AMBIGUOUS: [string, string][] = [['1', 'T'], ['1', 'L'], ['5', 'S'], ['7', 'T'], ['8', 'B'], ['6', 'G'], ['2', 'Z'], ['4', 'A'], ['0', 'D'], ['0', 'U']];
const twins = (c: string) => AMBIGUOUS.flatMap(([a, b]) => (a === c ? [b] : b === c ? [a] : []));
const couldBeNA = (vin: string) => isNorthAmerican(vin) || twins(vin[0]).some((c) => c >= '1' && c <= '5');

// One position's rule: 9 ∈ [0-9X]; 10 (model year) ∉ {0,U,Z}; 15–17 digits (ISO 3779); NA VINs also 12–17 digits.
function posOk(vin: string, i: number): boolean {
  const c = vin[i];
  if (!VIN_CHARS.includes(c)) return false;
  if (i === 8) return digit(c) || c === 'X';
  if (i === 9) return c !== '0' && c !== 'U' && c !== 'Z';
  if (i >= 14) return digit(c);
  if (i >= 11) return !isNorthAmerican(vin) || digit(c);
  return true;
}
export const positionalOk = (vin: string) => vin.length === 17 && [...vin].every((_, i) => posOk(vin, i));

export type Read = { text: string; symbols: { t: string; c: number }[] };
export type VinCandidate = { vin: string; subs: number; deletions: number; ocrMean: number };

// §5.1 step 1 — normalise the text and keep the per-symbol confidences aligned with it in the same pass:
// a symbol stripped by normalisation drops its confidence, a multi-character symbol repeats it per kept character.
function aligned(read: Read) {
  const text = normalizeRead(read.text);
  const conf: number[] = [];
  for (const s of read.symbols) for (let k = normalizeRead(s.t).length; k > 0; k--) conf.push(s.c);
  while (conf.length < text.length) conf.push(mean(conf)); // symbols and text disagreed; pad so the arrays line up
  return { text, conf: conf.slice(0, text.length) };
}

const swapAt = (vin: string, at: { i: number; ch: string }[]) =>
  [...vin].map((c, i) => at.find((a) => a.i === i)?.ch ?? c).join('');
const cost = (c: { subs: number; deletions: number }) => c.subs + c.deletions;
// §5.2 + §16.4 — a demo VIN is trusted as read. Otherwise a valid check digit counts when the VIN must carry one
// (NA) or when it matched with no edits at all: an *edited* non-NA candidate that happens to match is a 1-in-11
// accident we selected for, so it stays `unchecked` and the NHTSA decode decides (§6).
const trusted = (c: VinCandidate) => !!DECODE[c.vin] || (hasValidCheckDigit(c.vin) && (isNorthAmerican(c.vin) || cost(c) === 0));

/** §5.1 — bounded, deterministic: ≤ 2 substitutions over ambiguous positions, single deletions for 18-character reads. */
export function candidates(read: Read): VinCandidate[] {
  const { text, conf } = aligned(read);
  const bases =
    text.length === 17 ? [{ chars: [...text], conf, deletions: 0 }]
    : text.length === 18 ? [...text].map((_, i) => ({ chars: [...text].filter((_, k) => k !== i), conf: conf.filter((_, k) => k !== i), deletions: 1 }))
    : []; // step 2: any other length → no candidates → malformed
  const out: VinCandidate[] = [];
  for (const b of bases) {
    const ocrMean = mean(b.conf); // a substituted symbol keeps its original confidence, so this is per base
    const push = (vin: string, subs: number) => out.push({ vin, subs, deletions: b.deletions, ocrMean });
    const base = b.chars.join('');
    if (DECODE[base]) { push(base, 0); continue; } // a demo VIN is taken as read (§16.4): its placeholder check digit is invalid
    const s = [...b.chars];
    let subs = 0;
    for (let i = 0; i < 17; i++) { // step 3: positional fixes, e.g. 'S' at position 16 → '5'
      if (posOk(s.join(''), i)) continue;
      const fix = twins(s[i]).find((tw) => posOk(swapAt(s.join(''), [{ i, ch: tw }]), i));
      if (fix) { s[i] = fix; subs++; }
    }
    const fixed = s.join('');
    if (!positionalOk(fixed)) continue; // unfixable structure — not a candidate
    push(fixed, subs);
    // Step 4 is NA-only — only a North-American VIN carries a validator. The read itself may be what hides that:
    // the lab's whole failure mode is `1`→`T` at position 1 (§3), so search whenever an ambiguous twin of the
    // first character could be NA, and accept only variants that are NA *and* validate.
    if (hasValidCheckDigit(fixed) || !couldBeNA(fixed)) continue;
    const ok = (v: string) => isNorthAmerican(v) && positionalOk(v) && hasValidCheckDigit(v);
    const alts = [...fixed].flatMap((c, i) => twins(c).map((ch) => ({ i, ch, c: b.conf[i] }))).sort((x, y) => x.c - y.c); // ascending symbol confidence
    for (const a of alts) {
      const v = swapAt(fixed, [a]);
      if (ok(v)) push(v, subs + 1);
    }
    for (let x = 0; x < alts.length; x++) for (let y = x + 1; y < alts.length; y++) {
      if (alts[x].i === alts[y].i) continue;
      const v = swapAt(fixed, [alts[x], alts[y]]);
      if (ok(v)) push(v, subs + 2);
    }
  }
  const best = new Map<string, VinCandidate>();
  for (const c of out) { const p = best.get(c.vin); if (!p || cost(c) < cost(p)) best.set(c.vin, c); }
  // step 5: validated candidates first, then fewest deletions+subs, then highest ocrMean; ties keep the
  // ascending-confidence order they were found in (Array#sort is stable).
  return [...best.values()].sort((a, b) => Number(!trusted(a)) - Number(!trusted(b)) || cost(a) - cost(b) || b.ocrMean - a.ocrMean);
}

export type LocalVerdict = {
  vin: string | null; ocrMean: number; subs: number; deletions: number;
  structure: 'check-ok' | 'check-fail' | 'unchecked' | 'malformed'; reason: string;
};

/** §5.2 — the local verdict; `unchecked` leaves the decision to the NHTSA decode (§6). */
export function readVin(read: Read): LocalVerdict {
  const best = candidates(read)[0];
  if (!best) return { vin: null, ocrMean: 0, subs: 0, deletions: 0, structure: 'malformed', reason: 'Not a 17-character VIN' };
  const structure = trusted(best) ? 'check-ok' : isNorthAmerican(best.vin) ? 'check-fail' : 'unchecked';
  return { ...best, structure, reason: structure === 'check-fail' ? 'Check digit does not match' : '' };
}

/**
 * §6 — score = round(0.6·ocrMean + 0.4·structure − 3·subs − 6·deletions), clamped to [0,100]; passes at ≥ 90.
 * `nhtsa: 'none'` = no lookup was made (check-ok and demo VINs); 'clean'/'fatal' decide an `unchecked` read.
 * The rounding is deliberate: the displayed number is the number that is gated (89.8 → 90 passes).
 */
export function computeScore(v: LocalVerdict, nhtsa: 'clean' | 'fatal' | 'none'): { score: number; passes: boolean } {
  const structure = v.structure === 'check-ok' || (v.structure === 'unchecked' && nhtsa === 'clean') ? 100 : 0;
  const raw = 0.6 * v.ocrMean + 0.4 * structure - 3 * v.subs - 6 * v.deletions;
  const score = Math.min(100, Math.max(0, Math.round(raw)));
  return { score, passes: score >= 90 };
}

/** Display grouping 4-4-4-4-1 — '1HGC M826 33A0 0435 2'. */
export const formatVin = (vin: string) => (vin.match(/.{1,4}/g) ?? []).join(' ');
