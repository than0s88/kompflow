import { useEffect, useSyncExternalStore } from 'react';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type Theme = 'light' | 'dark';
export type MotionMultiplier = 0 | 0.5 | 1 | 1.5 | 2;
export type Density = 'compact' | 'comfy' | 'cozy';
export type CardSize = 'small' | 'default' | 'large';
export type Accent =
  | 'green'
  | 'blue'
  | 'purple'
  | 'red'
  | 'orange'
  | 'pink'
  | 'teal'
  | 'gray'
  | 'indigo'
  | 'lime'
  | 'amber'
  | 'midnight';

export interface AccentPalette {
  accent: string;
  accent600: string;
  accent100: string;
  boardBg: string;
}

export const ACCENT_PALETTES: Readonly<Record<Accent, AccentPalette>> = {
  green:    { accent: '#0E7C47', accent600: '#0A6238', accent100: '#E4F1EA', boardBg: '#0E7C47' },
  blue:     { accent: '#0079BF', accent600: '#055A8C', accent100: '#E4EFF8', boardBg: '#0079BF' },
  purple:   { accent: '#7C3AED', accent600: '#5B21B6', accent100: '#EFE7FD', boardBg: '#7C3AED' },
  red:      { accent: '#D9534F', accent600: '#A93732', accent100: '#FBE7E6', boardBg: '#B04632' },
  orange:   { accent: '#D97706', accent600: '#B45309', accent100: '#FCEAD0', boardBg: '#E2944C' },
  pink:     { accent: '#DB2777', accent600: '#9D174D', accent100: '#FCE4EF', boardBg: '#CD5A91' },
  teal:     { accent: '#0D9488', accent600: '#0F766E', accent100: '#D5F0EC', boardBg: '#0D9488' },
  gray:     { accent: '#475569', accent600: '#334155', accent100: '#E2E8F0', boardBg: '#344563' },
  indigo:   { accent: '#6366F1', accent600: '#4338CA', accent100: '#E0E2FE', boardBg: '#6366F1' },
  lime:     { accent: '#65A30D', accent600: '#4D7C0F', accent100: '#ECFCCB', boardBg: '#65A30D' },
  amber:    { accent: '#F59E0B', accent600: '#B45309', accent100: '#FEF3C7', boardBg: '#F59E0B' },
  midnight: { accent: '#1E3A8A', accent600: '#1E2C5A', accent100: '#DBE2F3', boardBg: '#1E3A8A' },
};

export interface Settings {
  theme: Theme;
  motion: MotionMultiplier;
  density: Density;
  cardSize: CardSize;
  accent: Accent;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  motion: 1,
  density: 'comfy',
  cardSize: 'default',
  accent: 'blue',
};

const STORAGE_KEY = 'kompflow.settings';

/* ------------------------------------------------------------------ */
/* Persistence                                                        */
/* ------------------------------------------------------------------ */

const THEMES: ReadonlyArray<Theme> = ['light', 'dark'];
const MOTION_VALUES: ReadonlyArray<MotionMultiplier> = [0, 0.5, 1, 1.5, 2];
const DENSITIES: ReadonlyArray<Density> = ['compact', 'comfy', 'cozy'];
const CARD_SIZES: ReadonlyArray<CardSize> = ['small', 'default', 'large'];
const ACCENTS: ReadonlyArray<Accent> = [
  'green',
  'blue',
  'purple',
  'red',
  'orange',
  'pink',
  'teal',
  'gray',
  'indigo',
  'lime',
  'amber',
  'midnight',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function coerce<T extends string | number>(
  value: unknown,
  allowed: ReadonlyArray<T>,
  fallback: T,
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function loadSettings(): Settings {
  if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return DEFAULT_SETTINGS;
    return {
      theme: coerce(parsed.theme, THEMES, DEFAULT_SETTINGS.theme),
      motion: coerce(parsed.motion, MOTION_VALUES, DEFAULT_SETTINGS.motion),
      density: coerce(parsed.density, DENSITIES, DEFAULT_SETTINGS.density),
      cardSize: coerce(parsed.cardSize, CARD_SIZES, DEFAULT_SETTINGS.cardSize),
      accent: coerce(parsed.accent, ACCENTS, DEFAULT_SETTINGS.accent),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: Settings): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* quota / disabled storage — ignored */
  }
}

/* ------------------------------------------------------------------ */
/* DOM application                                                    */
/* ------------------------------------------------------------------ */

export function applySettings(settings: Settings): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = settings.theme;
  root.dataset.density = settings.density;
  root.dataset.cardSize = settings.cardSize;
  root.dataset.accent = settings.accent;
  root.style.setProperty('--motion-mult', String(settings.motion));

  const palette = ACCENT_PALETTES[settings.accent];
  root.style.setProperty('--accent', palette.accent);
  root.style.setProperty('--accent-600', palette.accent600);
  root.style.setProperty('--accent-100', palette.accent100);
  root.style.setProperty('--bg-board', palette.boardBg);

  // Trello-classic canvas: in light mode the canvas IS the accent at full
  // saturation; the sidebar is a deeper variant of the same hue. In dark mode
  // both are tinted toward black for a "dusk" feel. Text contrast is then
  // computed from the actual canvas luminance.
  const isDark = settings.theme === 'dark';
  const canvasBg = isDark
    ? mixHex(palette.boardBg, '#000000', 0.45)
    : palette.boardBg;
  const sidebarBg = mixHex(palette.boardBg, '#000000', isDark ? 0.5 : 0.2);
  root.style.setProperty('--canvas-bg', canvasBg);
  root.style.setProperty('--canvas-bg-sidebar', sidebarBg);

  const canvasFg = pickContrastFg(canvasBg);
  // Sidebar always uses white text — its background is darkened from the
  // accent specifically to keep this contrast in both themes.
  const sidebarFg: '#FFFFFF' = '#FFFFFF';
  root.style.setProperty('--canvas-fg', canvasFg);
  root.style.setProperty('--canvas-fg-sidebar', sidebarFg);
  root.style.setProperty('--canvas-fg-soft', withAlpha(canvasFg, 0.72));
  root.style.setProperty('--canvas-fg-faint', withAlpha(canvasFg, 0.5));
  root.style.setProperty('--canvas-fg-sidebar-soft', withAlpha(sidebarFg, 0.78));
  root.style.setProperty('--canvas-fg-sidebar-faint', withAlpha(sidebarFg, 0.55));
  root.style.setProperty(
    '--canvas-overlay',
    canvasFg === '#FFFFFF' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
  );
  root.style.setProperty(
    '--canvas-overlay-strong',
    canvasFg === '#FFFFFF' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
  );
  root.style.setProperty(
    '--canvas-hairline',
    canvasFg === '#FFFFFF' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
  );
  root.style.setProperty(
    '--canvas-overlay-sidebar',
    sidebarFg === '#FFFFFF' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)',
  );
  root.style.setProperty(
    '--canvas-overlay-sidebar-strong',
    sidebarFg === '#FFFFFF' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)',
  );
  root.style.setProperty(
    '--canvas-hairline-sidebar',
    sidebarFg === '#FFFFFF' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
  );
}

/* Color math — local to settings, no deps. */

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function toHex(rgb: [number, number, number]): string {
  return (
    '#' +
    rgb
      .map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

/** Mix `a` with `b` by `ratio` of `b`. ratio=0 → a, ratio=1 → b. */
function mixHex(a: string, b: string, ratio: number): string {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  const r = ar * (1 - ratio) + br * ratio;
  const g = ag * (1 - ratio) + bg * ratio;
  const bl = ab * (1 - ratio) + bb * ratio;
  return toHex([r, g, bl]);
}

/** WCAG relative luminance (0–1). */
function relLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((v) => v / 255);
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Pick the foreground (white/dark) with higher contrast against `bg`. */
function pickContrastFg(bg: string): '#FFFFFF' | '#172B4D' {
  const lum = relLuminance(bg);
  // Luminance above 0.45 → bg is light enough that dark text wins.
  return lum > 0.45 ? '#172B4D' : '#FFFFFF';
}

function withAlpha(hex: '#FFFFFF' | '#172B4D', alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ------------------------------------------------------------------ */
/* Tiny store + hook                                                  */
/* ------------------------------------------------------------------ */

let currentSettings: Settings = DEFAULT_SETTINGS;
const listeners = new Set<() => void>();

function emit(): void {
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function getSnapshot(): Settings {
  return currentSettings;
}

/** Initialise the store from localStorage and apply to the document. */
export function initSettings(): Settings {
  currentSettings = loadSettings();
  applySettings(currentSettings);
  return currentSettings;
}

export function setSettings(patch: Partial<Settings>): void {
  const next: Settings = { ...currentSettings, ...patch };
  if (
    next.theme === currentSettings.theme &&
    next.motion === currentSettings.motion &&
    next.density === currentSettings.density &&
    next.cardSize === currentSettings.cardSize &&
    next.accent === currentSettings.accent
  ) {
    return;
  }
  currentSettings = next;
  applySettings(next);
  saveSettings(next);
  emit();
}

export function resetSettings(): void {
  setSettings(DEFAULT_SETTINGS);
}

export interface UseSettingsResult {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
}

export function useSettings(): UseSettingsResult {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Re-sync across tabs.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = loadSettings();
      currentSettings = next;
      applySettings(next);
      emit();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return { settings, update: setSettings, reset: resetSettings };
}
