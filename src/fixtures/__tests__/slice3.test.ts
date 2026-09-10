import glyphMap from '../../assets/remixicon.glyphmap.json';
import { ARTICLES } from '../articles';
import { CANNED_REPLY, CHAT_SCRIPT } from '../chat';
import { LIGHTS } from '../lights';
import { ACTIVITY, PLANS, USER } from '../profile';
import { HISTORY, LIVE_RECALL, REASONS, STATE_META } from '../recalls';
import { SVC_CENTER, SVC_DATES, SVC_METHODS, SVC_TIMES, TRACKER } from '../service';
import { color, dur, ease, layout } from '../../theme/tokens';

const glyphs = glyphMap as Record<string, number>;

describe('Slice 3 fixtures', () => {
  it('has four articles with washes, kickers and bodies', () => {
    expect(ARTICLES.map((a) => a.id)).toEqual(['a1', 'a2', 'a3', 'a4']);
    expect(ARTICLES[0].wash).toEqual(['#2E93C4', '#0B4E73']);
    expect(ARTICLES[1].title).toBe('Oil intervals: why the sticker and the manual disagree');
    expect(ARTICLES[2].body).toHaveLength(5);
    expect(ARTICLES[3].body[0].heading).toBeUndefined();
    expect(ARTICLES[3].body[1].heading).toBe('What accelerates it');
  });
  it('has twenty lights: 5 critical, 9 warning, 6 info; ABS is glyph-only', () => {
    expect(LIGHTS).toHaveLength(20);
    expect(LIGHTS.filter((l) => l.group === 'critical')).toHaveLength(5);
    expect(LIGHTS.filter((l) => l.group === 'warning')).toHaveLength(9);
    expect(LIGHTS.filter((l) => l.group === 'info')).toHaveLength(6);
    const abs = LIGHTS.find((l) => l.id === 'l8')!;
    expect(abs).toMatchObject({ icon: '', glyph: 'ABS', short: 'ABS', tone: '#C98A1F' });
    expect(LIGHTS.find((l) => l.id === 'l3')!.glyph).toBe('');
    expect(LIGHTS.find((l) => l.id === 'l18')!.tone).toBe('#D0021B');
  });
  it('every icon name used by the fixtures exists in the Remixicon glyph map', () => {
    const names = [
      ...ARTICLES.map((a) => a.icon), ...LIGHTS.map((l) => l.icon).filter(Boolean), ...SVC_METHODS.map((m) => m.icon),
      ...Object.values(STATE_META).map((m) => m.icon),
    ];
    for (const n of names) expect(glyphs[n]).toBeDefined();
  });
  it('keeps the chat script and canned reply verbatim', () => {
    expect(CHAT_SCRIPT).toHaveLength(7);
    expect(CHAT_SCRIPT.map((m) => m.from)).toEqual(['them', 'me', 'them', 'me', 'them', 'me', 'them']);
    expect(CHAT_SCRIPT[3].content).toBe("Can someone collect the car? I can't take the morning off.");
    expect(CANNED_REPLY.content.startsWith('Noted. A specialist')).toBe(true);
  });
  it('profile: user, activity, three plans with Plus recommended', () => {
    expect(USER.initials).toBe('AV');
    expect(ACTIVITY).toHaveLength(3);
    expect(PLANS.map((p) => p.id)).toEqual(['standard', 'plus', 'pro']);
    expect(PLANS[1].recommend).toBe(true);
    expect(PLANS[2].features).toHaveLength(4);
    expect(PLANS[0].features[2]).toEqual(['Real-time alerts', 0]);
  });
  it('service: five dates, six times, the centre, two methods, three tracker steps', () => {
    expect(SVC_DATES.map((d) => d.date)).toEqual(['12', '13', '14', '15', '16']);
    expect(SVC_TIMES).toHaveLength(6);
    expect(SVC_CENTER.coords).toBe('37.7749° N, 122.4194° W');
    expect(SVC_METHODS[1]).toEqual({ key: 'concierge', label: 'Concierge', icon: 'home-4-line' });
    expect(TRACKER.map((t) => t.state)).toEqual(['done', 'active', 'pending']);
  });
  it('recalls: three history rows, four reasons, state meta', () => {
    expect(HISTORY.map((h) => h.vid)).toEqual([1, 2, 3]);
    expect(Object.keys(REASONS)).toEqual(['NHTSA 24V-137', 'NHTSA 23V-742', 'NHTSA 22V-118', 'NHTSA 21V-905']);
    expect(REASONS['NHTSA 24V-137'].facts[1]).toEqual(['UNITS AFFECTED', '125,227']);
    expect(REASONS['NHTSA 21V-905'].steps).toHaveLength(3);
    expect(STATE_META.scheduled).toEqual({ label: 'SCHEDULED', chipBg: '#0F638F', chipFg: '#EAF7FF', icon: 'calendar-check-fill', status: 'REPAIR SCHEDULED' });
    expect(LIVE_RECALL.dealer).toBe('Tesla Service — 6.2 mi');
  });
  it('tokens exist', () => {
    expect(color.infoBg).toBe('#E7F1F7');
    expect(color.chatBubble).toBe('rgba(39,39,42,0.9)');
    expect(ease.swipe).toEqual([0.22, 1, 0.36, 1]);
    expect(dur.hubAuto).toBe(5000);
    expect(layout.shineBaked).toBe(1024);
  });
  it('shine assets are present', () => {
    expect(require('../../assets/images/shine-plus.png')).toBeDefined();
    expect(require('../../assets/images/shine-caution.png')).toBeDefined();
  });
});
