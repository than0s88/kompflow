import type { Card, CardOrnaments } from '@kanban/shared';

/**
 * Card visual + tracking metadata: cover, labels, due date, members.
 * Persisted server-side on Card.ornaments (Json column). On first read for a
 * given card the server may return null — in that case we seed deterministic
 * defaults from the cardId so the board doesn't look empty pre-edit.
 */

export const LABEL_PALETTE: ReadonlyArray<{ name: string; color: string }> = [
  { name: 'green', color: 'rgb(97, 189, 79)' },
  { name: 'yellow', color: 'rgb(242, 214, 0)' },
  { name: 'orange', color: 'rgb(255, 159, 26)' },
  { name: 'red', color: 'rgb(235, 90, 70)' },
  { name: 'purple', color: 'rgb(195, 119, 224)' },
  { name: 'blue', color: 'rgb(0, 121, 191)' },
  { name: 'sky', color: 'rgb(0, 194, 224)' },
  { name: 'lime', color: 'rgb(81, 232, 152)' },
  { name: 'pink', color: 'rgb(255, 120, 203)' },
  { name: 'black', color: 'rgb(52, 69, 99)' },
];

export const TEAMMATE_POOL: ReadonlyArray<{
  id: string;
  name: string;
  initials: string;
  color: string;
}> = [
  { id: 'tm-dp', name: 'Devon Park', initials: 'DP', color: 'rgb(97, 189, 79)' },
  { id: 'tm-sr', name: 'Sam Reyes', initials: 'SR', color: 'rgb(255, 159, 26)' },
  { id: 'tm-ms', name: 'Maya Singh', initials: 'MS', color: 'rgb(235, 90, 70)' },
  { id: 'tm-lz', name: 'Lin Zhao', initials: 'LZ', color: 'rgb(195, 119, 224)' },
  { id: 'tm-ak', name: 'Ari Kim', initials: 'AK', color: 'rgb(0, 194, 224)' },
];

export type { CardOrnaments } from '@kanban/shared';

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function defaultsFor(cardId: string): CardOrnaments {
  const h = hash(cardId);
  const showCover = h % 3 === 0;
  const cover = showCover ? LABEL_PALETTE[h % LABEL_PALETTE.length].color : null;
  const numLabels = (h % 2) + 1;
  const labels: string[] = [];
  for (let i = 0; i < numLabels; i += 1) {
    labels.push(LABEL_PALETTE[(h + i * 7) % LABEL_PALETTE.length].color);
  }
  let dueDate: string | null = null;
  if (h % 10 < 7) {
    const daysAhead = ((h >> 3) % 14) + 1;
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    dueDate = d.toISOString();
  }
  const memberIds: string[] = ['me'];
  if ((h >> 5) % 2 === 0) {
    memberIds.push(TEAMMATE_POOL[(h >> 7) % TEAMMATE_POOL.length].id);
  }
  return { cover, labels, dueDate, memberIds };
}

/**
 * Read ornaments from a Card object. Falls back to deterministic defaults if
 * the server hasn't seen this card yet.
 */
export function ornamentsOf(card: Pick<Card, 'id' | 'ornaments'>): CardOrnaments {
  const o = card.ornaments;
  if (o && typeof o === 'object') {
    return {
      cover: typeof o.cover === 'string' ? o.cover : null,
      labels: Array.isArray(o.labels)
        ? o.labels.filter((x): x is string => typeof x === 'string')
        : [],
      dueDate: typeof o.dueDate === 'string' ? o.dueDate : null,
      memberIds: Array.isArray(o.memberIds)
        ? o.memberIds.filter((x): x is string => typeof x === 'string')
        : [],
    };
  }
  return defaultsFor(card.id);
}

export function dueDateTone(iso: string): 'overdue' | 'soon' | 'normal' {
  const due = new Date(iso).getTime();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  if (due < now) return 'overdue';
  if (due - now < 3 * dayMs) return 'soon';
  return 'normal';
}

export function shortDueLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((d.getTime() - now.getTime()) / dayMs);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays >= -1 && diffDays <= 6) {
    return d.toLocaleDateString('en', { weekday: 'short' });
  }
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

export function presetDates(): Array<{ label: string; iso: string }> {
  const today = new Date();
  today.setHours(17, 0, 0, 0);
  const make = (offsetDays: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString();
  };
  return [
    { label: 'Today', iso: make(0) },
    { label: 'Tomorrow', iso: make(1) },
    { label: 'In 3 days', iso: make(3) },
    { label: 'Next week', iso: make(7) },
    { label: 'Next month', iso: make(30) },
  ];
}

export function colorName(color: string): string {
  return LABEL_PALETTE.find((l) => l.color === color)?.name ?? '';
}
