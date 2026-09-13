// Tiny date formatter — nhtsa.ts recall dates are ISO (yyyy-mm-dd); recalls.ts displays them long-form.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2019-03-06' → '6 Mar 2019' (recalls.ts allRecalls() done fallback, spec §10). */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
