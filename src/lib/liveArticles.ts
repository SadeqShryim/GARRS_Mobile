// Live articles for the Hub (user request, 2026-09-20): Google News' RSS search for vehicle recalls, car maintenance and
// NHTSA, parsed into the fixtures' Article shape so the rail, the peeks and the reader need no second code path. The feed
// carries a headline, link, date and source — no summary — so the reader shows the story itself in a WebView, and the
// card's dek names the source and day. The fixtures stay as the offline fallback: on any failure the store keeps them.
import { ARTICLES } from '../fixtures/articles';
import type { Article } from '../fixtures/types';

export const FEED = 'https://news.google.com/rss/search?q=vehicle+recall+OR+car+maintenance+OR+NHTSA&hl=en-US&gl=US&ceid=US:en';
export const MAX_LIVE = 8;

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TOPICS: [RegExp, string, string][] = [
  [/recall|nhtsa|defect|safety/i, 'RECALL', 'alarm-warning-line'],
  [/tire|tyre|wheel|tpms/i, 'TIRES', 'loader-2-line'],
  [/oil|maintenance|service|mechanic|repair/i, 'MAINTENANCE', 'oil-line'],
  [/battery|electric|\bev\b|charging/i, 'EV', 'battery-2-charge-fill'],
];

const tag = (xml: string, name: string) => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? m[1].trim() : '';
};
const unescape = (s: string) => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ');

export function parseFeed(xml: string): Article[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items.slice(0, MAX_LIVE).map((item, i) => {
    const source = unescape(tag(item, 'source')) || 'News';
    // Google News titles end in " - Source"; the source tag is authoritative, so the suffix goes.
    const raw = unescape(tag(item, 'title'));
    const title = raw.endsWith(' - ' + source) ? raw.slice(0, -(source.length + 3)) : raw.replace(/\s+-\s+[^-]+$/, '');
    const when = new Date(tag(item, 'pubDate'));
    const dated = !Number.isNaN(when.getTime());
    const date = dated ? `${MONTHS[when.getUTCMonth()]} ${when.getUTCDate()}, ${when.getUTCFullYear()}` : 'TODAY';
    const day = dated ? `${DAYS[when.getUTCDay()]}, ${MONTHS[when.getUTCMonth()][0]}${MONTHS[when.getUTCMonth()].slice(1).toLowerCase()} ${when.getUTCDate()}` : 'today';
    const topic = TOPICS.find(([re]) => re.test(title)) ?? [null, 'NEWS', 'car-line'];
    return {
      id: `live-${i}`,
      kicker: topic[1], icon: topic[2],
      read: source.toUpperCase(), date,
      wash: ARTICLES[i % ARTICLES.length].wash,
      title,
      dek: `${source} · ${day}`,
      body: [{ text: `Live from ${source}. The full story opens below.` }],
      url: unescape(tag(item, 'link')),
      source,
    };
  }).filter((a) => a.title && a.url);
}

export async function fetchLiveArticles(): Promise<Article[]> {
  const res = await fetch(FEED, { headers: { Accept: 'application/rss+xml, application/xml, text/xml' } });
  if (!res.ok) throw new Error(`feed ${res.status}`);
  const articles = parseFeed(await res.text());
  if (articles.length === 0) throw new Error('feed empty');
  return articles;
}
