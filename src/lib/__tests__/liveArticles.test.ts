import { ARTICLES } from '../../fixtures/articles';
import { fetchLiveArticles, FEED, MAX_LIVE, parseFeed } from '../liveArticles';

const item = (title: string, link: string, date: string, source: string) =>
  `<item><title>${title}</title><link>${link}</link><guid isPermaLink="false">x</guid><pubDate>${date}</pubDate><description>&lt;a href="${link}"&gt;${title}&lt;/a&gt;</description><source url="https://example.com">${source}</source></item>`;
const feed = (items: string) => `<?xml version="1.0"?><rss version="2.0"><channel><title>t</title>${items}</channel></rss>`;

describe('parseFeed', () => {
  it('maps Google News items to articles: source-suffixed titles, dates, topics, a rotating wash and the story link', () => {
    const xml = feed(
      item('Volkswagen to recall 208,700 US vehicles over steering bolt, NHTSA says - Reuters', 'https://news.google.com/rss/articles/abc?oc=5', 'Fri, 18 Sep 2026 19:17:51 GMT', 'Reuters') +
      item('How often should you really change your oil? - The Drive', 'https://news.google.com/rss/articles/def?oc=5', 'Thu, 17 Sep 2026 08:00:00 GMT', 'The Drive') +
      item('Reading a tire&#39;s sidewall &amp; date code - Car and Driver', 'https://news.google.com/rss/articles/ghi?oc=5', 'not a date', 'Car and Driver'),
    );
    const [a, b, c] = parseFeed(xml);
    expect(a).toMatchObject({ id: 'live-0', kicker: 'RECALL', icon: 'alarm-warning-line', read: 'REUTERS', date: 'SEP 18, 2026', source: 'Reuters', url: 'https://news.google.com/rss/articles/abc?oc=5' });
    expect(a.title).toBe('Volkswagen to recall 208,700 US vehicles over steering bolt, NHTSA says');
    expect(a.dek).toBe('Reuters · Fri, Sep 18');
    expect(a.wash).toEqual(ARTICLES[0].wash);
    expect(a.body[0].text).toContain('Reuters');
    expect(b).toMatchObject({ kicker: 'MAINTENANCE', icon: 'oil-line', title: 'How often should you really change your oil?' });
    expect(b.wash).toEqual(ARTICLES[1].wash);
    expect(c).toMatchObject({ kicker: 'TIRES', icon: 'loader-2-line', title: "Reading a tire's sidewall & date code", date: 'TODAY' });
  });
  it('caps the list and drops items without a title or link', () => {
    const many = Array.from({ length: MAX_LIVE + 3 }, (_, i) => item(`Story ${i} - S`, `https://x/${i}`, 'Fri, 18 Sep 2026 00:00:00 GMT', 'S')).join('');
    expect(parseFeed(feed(many))).toHaveLength(MAX_LIVE);
    expect(parseFeed(feed(item('', 'https://x/1', '', 'S') + item('No link - S', '', '', 'S')))).toHaveLength(0);
  });
});

describe('fetchLiveArticles', () => {
  it('fetches the feed and returns its articles', async () => {
    const xml = feed(item('A recall - S', 'https://x/1', 'Fri, 18 Sep 2026 00:00:00 GMT', 'S'));
    globalThis.fetch = jest.fn(async () => ({ ok: true, text: async () => xml })) as unknown as typeof fetch;
    const live = await fetchLiveArticles();
    expect(fetch).toHaveBeenCalledWith(FEED, expect.anything());
    expect(live.map((a) => a.title)).toEqual(['A recall']);
  });
  it('throws on a bad status or an empty feed, so the store keeps the fixtures', async () => {
    globalThis.fetch = jest.fn(async () => ({ ok: false, status: 503, text: async () => '' })) as unknown as typeof fetch;
    await expect(fetchLiveArticles()).rejects.toThrow('feed 503');
    globalThis.fetch = jest.fn(async () => ({ ok: true, text: async () => feed('') })) as unknown as typeof fetch;
    await expect(fetchLiveArticles()).rejects.toThrow('feed empty');
  });
});
