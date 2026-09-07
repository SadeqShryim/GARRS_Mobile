import type { TabId } from './types';
export type TabDef = { id: TabId; label: string; on: string; off: string };
export const TABS: TabDef[] = [
  { id: 'garage', label: 'GARAGE', on: 'inbox-fill', off: 'inbox-line' },
  { id: 'recalls', label: 'RECALLS', on: 'error-warning-fill', off: 'error-warning-line' },
  { id: 'service', label: 'SERVICE', on: 'tools-fill', off: 'tools-line' },
  { id: 'hub', label: 'HUB', on: 'book-2-fill', off: 'book-2-line' },
  { id: 'profile', label: 'PROFILE', on: 'user-fill', off: 'user-line' },
];
