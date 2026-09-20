import { ARTICLES } from '../../fixtures/articles';
import { FEEDS, fetchLiveArticles, MAX_LIVE, parseFeed } from '../liveArticles';

const gItem = (title: string, link: string, date: string, source: string) =>
  `<item><title>${title}</title><link>${link}</link><guid isPermaLink="false">x</guid><pubDate>${date}</pubDate><description>&lt;a href="${link}"&gt;${title}&lt;/a&gt;</description><source url="https://example.com">${source}</source></item>`;
const mItem = (title: string, desc: string, link: string, date: string, img: string) =>
  `<item>\n  <title>${title}</title>\n  <description><![CDATA[${desc}]]></description>\n  <pubDate>${date}</pubDate>\n  <link>${link}</link>\n  <guid>${link}</guid>\n  <enclosure type="image/jpeg" length="27458" url="${img}"/>\n</item>`;
const feed = (items: string) => `<?xml version="1.0"?><rss version="2.0"><channel><title>t</title>${items}</channel></rss>`;

describe('parseFeed', () => {
  it('maps a Motor1 recalls item: summary, direct link, photo, topic, the feed as source', () => {
    const xml = feed(mItem('223,472 Ford F-150s Could Lose Their Fuel Tank On The Road', 'NHTSA campaign 26V578 covers Ford F-150 trucks built from January 2023 through August 2026, outlining the tank strap defect and free dealer inspections.', 'https://www.motor1.com/news/808476/ford-f-150-fuel-tank/', 'Wed, 16 Sep 2026 10:09:06 +0000', 'https://cdn.motor1.com/images/mgl/8A36WJ/s3/ford-f-150-xlt-2026.jpg'));
    const [a] = parseFeed(xml, FEEDS[0]);
    expect(a).toMatchObject({ id: 'live-0', kicker: 'RECALL', icon: 'alarm-warning-line', read: 'MOTOR1', date: 'SEP 16, 2026', source: 'Motor1', url: 'https://www.motor1.com/news/808476/ford-f-150-fuel-tank/', image: 'https://cdn.motor1.com/images/mgl/8A36WJ/s3/ford-f-150-xlt-2026.jpg' });
    expect(a.title).toBe('223,472 Ford F-150s Could Lose Their Fuel Tank On The Road');
    expect(a.dek).toBe('NHTSA campaign 26V578 covers Ford F-150 trucks built from January 2023 through August 2026, outlining the tank strap defect and free dealer…');
    expect(a.body[0].text).toContain('Motor1, Wed, Sep 16');
    expect(a.wash).toEqual(ARTICLES[0].wash);
  });
  it('maps Google News items: source-suffixed titles trimmed, no image, the source and day as the dek', () => {
    const xml = feed(
      gItem('Volkswagen to recall 208,700 US vehicles over steering bolt, NHTSA says - Reuters', 'https://news.google.com/rss/articles/abc?oc=5', 'Fri, 18 Sep 2026 19:17:51 GMT', 'Reuters') +
      gItem('How often should you really change your oil? - The Drive', 'https://news.google.com/rss/articles/def?oc=5', 'Thu, 17 Sep 2026 08:00:00 GMT', 'The Drive') +
      gItem('Reading a tire&#39;s sidewall &amp; date code - Car and Driver', 'https://news.google.com/rss/articles/ghi?oc=5', 'not a date', 'Car and Driver'),
    );
    const [a, b, c] = parseFeed(xml);
    expect(a).toMatchObject({ kicker: 'RECALL', read: 'REUTERS', date: 'SEP 18, 2026', source: 'Reuters', url: 'https://news.google.com/rss/articles/abc?oc=5' });
    expect(a.image).toBeUndefined();
    expect(a.title).toBe('Volkswagen to recall 208,700 US vehicles over steering bolt, NHTSA says');
    expect(a.dek).toBe('Reuters · Fri, Sep 18');
    expect(b).toMatchObject({ kicker: 'MAINTENANCE', icon: 'oil-line', title: 'How often should you really change your oil?' });
    expect(b.wash).toEqual(ARTICLES[1].wash);
    expect(c).toMatchObject({ kicker: 'TIRES', title: "Reading a tire's sidewall & date code", date: 'TODAY' });
  });
  it('caps the list and drops items without a title or link', () => {
    const many = Array.from({ length: MAX_LIVE + 3 }, (_, i) => gItem(`Story ${i} - S`, `https://x/${i}`, 'Fri, 18 Sep 2026 00:00:00 GMT', 'S')).join('');
    expect(parseFeed(feed(many))).toHaveLength(MAX_LIVE);
    expect(parseFeed(feed(gItem('', 'https://x/1', '', 'S') + gItem('No link - S', '', '', 'S')))).toHaveLength(0);
  });
});

describe('fetchLiveArticles', () => {
  const ok = (xml: string) => ({ ok: true, text: async (): Promise<string> => xml });
  it('uses the first feed that answers — Motor1 with its photos', async () => {
    const xml = feed(mItem('A recall', 'Summary.', 'https://www.motor1.com/news/1/', 'Wed, 16 Sep 2026 10:09:06 +0000', 'https://cdn/x.jpg'));
    globalThis.fetch = jest.fn(async () => ok(xml)) as unknown as typeof fetch;
    const live = await fetchLiveArticles();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(FEEDS[0].url, expect.anything());
    expect(live[0]).toMatchObject({ title: 'A recall', source: 'Motor1', image: 'https://cdn/x.jpg' });
  });
  it('falls back to Google News when Motor1 fails, and throws when every feed does', async () => {
    const gxml = feed(gItem('A recall - S', 'https://x/1', 'Fri, 18 Sep 2026 00:00:00 GMT', 'S'));
    globalThis.fetch = jest.fn(async (url: string) => (url === FEEDS[0].url ? { ok: false, status: 503, text: async (): Promise<string> => '' } : ok(gxml))) as unknown as typeof fetch;
    expect((await fetchLiveArticles()).map((a) => a.title)).toEqual(['A recall']);
    globalThis.fetch = jest.fn(async () => ok(feed(''))) as unknown as typeof fetch;
    await expect(fetchLiveArticles()).rejects.toThrow('feed empty');
  });
});
