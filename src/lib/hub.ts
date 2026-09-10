import { ARTICLES } from '../fixtures/articles';
import { LIGHTS } from '../fixtures/lights';
import type { Article, LightFilter, LightGroup } from '../fixtures/types';

export const GROUPS: LightFilter[] = ['all', 'critical', 'warning', 'info'];
export const GROUP_META: Record<LightFilter, { label: string; dot: string }> = {
  all: { label: 'ALL', dot: '#17161A' },
  critical: { label: 'STOP NOW', dot: '#D0021B' },
  warning: { label: 'CAUTION', dot: '#C98A1F' },
  info: { label: 'STATUS', dot: '#01a08c' },
};
export const BADGE: Record<LightGroup, [string, string, string]> = {
  critical: ['STOP DRIVING', '#D0021B', '#FFFFFF'],
  warning: ['GET IT CHECKED', '#FBE9CB', '#7A5307'],
  info: ['STATUS ONLY', '#E7F1F7', '#0B4E73'],
};
export const HUB_COPY = {
  title: 'Hub',
  featured: 'FEATURED READING',
  lights: 'DASHBOARD LIGHTS',
  lightsSub: 'Tap any warning light to read what it means and what to do next.',
  note: "Symbols vary by manufacturer. Your owner's manual is the final word for your vehicle.",
  whatToDo: 'WHAT TO DO',
  gotIt: 'Got it',
  swipeHint: 'SWIPE FOR THE NEXT ARTICLE',
  nextArticle: 'NEXT ARTICLE',
} as const;

export const hubHeadline = () => ARTICLES.length + ' ARTICLES · ' + LIGHTS.length + ' DASHBOARD LIGHTS';
export const hubCounter = (i: number) => String(i + 1).padStart(2, '0') + ' / ' + String(ARTICLES.length).padStart(2, '0');
export const visibleLights = (g: LightFilter) => LIGHTS.filter((l) => g === 'all' || l.group === g);
export const lightById = (id: string | null) => (id ? LIGHTS.find((l) => l.id === id) ?? null : null);

export type GroupChip = { key: LightFilter; label: string; dot: string; bg: string; edge: string; fg: string; on: boolean };
export function groupChip(k: LightFilter, hubGroup: LightFilter): GroupChip {
  const on = hubGroup === k;
  return {
    key: k, label: GROUP_META[k].label, dot: GROUP_META[k].dot, on,
    bg: on ? '#F2F1EE' : '#FFFFFF',
    edge: on ? 'rgba(0,0,0,0.14)' : 'rgba(0,0,0,0.08)',
    fg: on ? '#17161A' : '#63626a',
  };
}

export const articleIndex = (id: string) => ARTICLES.findIndex((a) => a.id === id);
export const articleById = (id: string | null): Article | null => (id ? ARTICLES.find((a) => a.id === id) ?? null : null);
export function neighbour(id: string, dir: 1 | -1): Article {
  const i = Math.max(0, articleIndex(id));
  const n = ARTICLES.length;
  return ARTICLES[(i + dir + n) % n];
}
export const nextTitle = (id: string) => neighbour(id, 1).title;
