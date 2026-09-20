// Live articles for the Hub (user request, 2026-09-20), parsed into the fixtures' Article shape so the rail, the peeks and
// the reader need no second code path. The primary feed is Motor1's recalls category — a summary, a direct link and a
// photo per story (the user wants real images, not the wash) — with Google News' recall search as a text-only fallback
// (no images; its links open through Google's redirect page). The fixtures stay as the offline fallback: on any failure
// the store keeps them. The reader shows a live story in a WebView.
import { ARTICLES } from '../fixtures/articles';
import type { Article } from '../fixtures/types';

export type Feed = { url: string; source?: string; kicker?: string; icon?: string };   // kicker/icon: the feed's own topic, for stories whose text names none
export const FEEDS: Feed[] = [
  { url: 'https://www.motor1.com/rss/category/recalls/', source: 'Motor1', kicker: 'RECALL', icon: 'alarm-warning-line' },
  { url: 'https://news.google.com/rss/search?q=vehicle+recall+OR+car+maintenance+OR+NHTSA&hl=en-US&gl=US&ceid=US:en' },
];
export const MAX_LIVE = 8;
const DEK_MAX = 150;

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TOPICS: [RegExp, string, string][] = [
  [/recall|nhtsa|defect|safety|air ?bag|fire risk/i, 'RECALL', 'alarm-warning-line'],
  [/tire|tyre|wheel|tpms/i, 'TIRES', 'loader-2-line'],
  [/oil|maintenance|service|mechanic|repair/i, 'MAINTENANCE', 'oil-line'],
  [/battery|electric|\bev\b|\bevs\b|charging/i, 'EV', 'battery-2-charge-fill'],
];

const tag = (xml: string, name: string) => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? m[1].trim() : '';
};
const attr = (xml: string, element: RegExp) => { const m = xml.match(element); return m ? m[1] : ''; };
const clean = (s: string) => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;|&#8217;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ').trim();
const shorten = (s: string, max: number) => (s.length <= max ? s : s.slice(0, max).replace(/\s+\S*$/, '') + '…');

export function parseFeed(xml: string, feed: Pick<Feed, 'source' | 'kicker' | 'icon'> = {}): Article[] {
  const feedSource = feed.source;
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items.slice(0, MAX_LIVE).map((item, i) => {
    const source = clean(tag(item, 'source')) || feedSource || 'News';
    // Google News titles end in " - Source"; with a source tag that suffix goes.
    const raw = clean(tag(item, 'title'));
    const title = tag(item, 'source') && raw.endsWith(' - ' + source) ? raw.slice(0, -(source.length + 3)) : raw;
    const summary = clean(tag(item, 'description'));
    // Google's description is only the linked title again — no summary there.
    const dek = summary && summary !== title && !summary.includes(title) ? shorten(summary, DEK_MAX) : '';
    const when = new Date(tag(item, 'pubDate'));
    const dated = !Number.isNaN(when.getTime());
    const date = dated ? `${MONTHS[when.getUTCMonth()]} ${when.getUTCDate()}, ${when.getUTCFullYear()}` : 'TODAY';
    const day = dated ? `${DAYS[when.getUTCDay()]}, ${MONTHS[when.getUTCMonth()][0]}${MONTHS[when.getUTCMonth()].slice(1).toLowerCase()} ${when.getUTCDate()}` : 'today';
    const topic = TOPICS.find(([re]) => re.test(title + ' ' + summary)) ?? [null, feed.kicker ?? 'NEWS', feed.icon ?? 'car-line'];
    const image = attr(item, /<enclosure[^>]*type="image\/[^"]*"[^>]*url="([^"]+)"/) || attr(item, /<enclosure[^>]*url="([^"]+\.(?:jpe?g|png|webp)[^"]*)"/i)
      || attr(item, /<media:(?:content|thumbnail)[^>]*url="([^"]+)"/);
    return {
      id: `live-${i}`,
      kicker: topic[1], icon: topic[2],
      read: source.toUpperCase(), date,
      wash: ARTICLES[i % ARTICLES.length].wash,
      title,
      dek: dek || `${source} · ${day}`,
      body: [{ text: dek ? `${dek} — ${source}, ${day}. The full story opens below.` : `Live from ${source}. The full story opens below.` }],
      url: clean(tag(item, 'link')),
      source,
      ...(image ? { image } : {}),
    };
  }).filter((a) => a.title && a.url);
}

export async function fetchFeed(feed: Feed): Promise<Article[]> {
  const res = await fetch(feed.url, { headers: { Accept: 'application/rss+xml, application/xml, text/xml' } });
  if (!res.ok) throw new Error(`feed ${res.status}`);
  const articles = parseFeed(await res.text(), feed);
  if (articles.length === 0) throw new Error('feed empty');
  return articles;
}

// The first feed that answers wins; the caller keeps the fixtures when none does.
export async function fetchLiveArticles(): Promise<Article[]> {
  let last: unknown = new Error('no feeds');
  for (const feed of FEEDS) {
    try { return await fetchFeed(feed); } catch (e) { last = e; }
  }
  throw last;
}
