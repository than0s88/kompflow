import { useEffect, useSyncExternalStore } from 'react';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type Theme = 'light' | 'dark';
export type MotionMultiplier = 0 | 0.5 | 1 | 1.5 | 2;
export type Density = 'compact' | 'comfy' | 'cozy';
export type CardSize = 'small' | 'default' | 'large';
export type Accent =
  // Solid hues
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
  | 'midnight'
  // Gradient blends — set boardBgGradient on the palette so the canvas
  // shows the actual gradient while color math (sidebar tint, contrast)
  // still uses the solid boardBg endpoint.
  | 'sunset'
  | 'aurora'
  | 'cosmic'
  | 'ember'
  | 'ocean'
  | 'sakura'
  | 'mint'
  | 'twilight'
  | 'volcano'
  | 'glacier'
  | 'forest'
  | 'royal';

export interface AccentPalette {
  accent: string;
  accent600: string;
  accent100: string;
  boardBg: string;
  /** Optional CSS background value (linear-gradient(...)). When set, --bg-board
   *  is the gradient; the solid boardBg is still used for sidebar/canvas math. */
  boardBgGradient?: string;
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

  // Gradients — accent/accent600/accent100 use the *dominant* solid hue so
  // buttons + chips stay solid; boardBg picks the cooler endpoint so sidebar
  // mixing reads correctly. boardBgGradient paints the actual canvas.
  sunset: {
    accent: '#F59E0B', accent600: '#B45309', accent100: '#FCEAD0',
    boardBg: '#EC4899',
    boardBgGradient: 'linear-gradient(135deg, #F59E0B 0%, #EC4899 100%)',
  },
  aurora: {
    accent: '#10B981', accent600: '#047857', accent100: '#D1FAE5',
    boardBg: '#0EA5E9',
    boardBgGradient: 'linear-gradient(135deg, #10B981 0%, #0EA5E9 100%)',
  },
  cosmic: {
    accent: '#A855F7', accent600: '#7E22CE', accent100: '#F3E8FF',
    boardBg: '#6366F1',
    boardBgGradient: 'linear-gradient(135deg, #A855F7 0%, #6366F1 100%)',
  },
  ember: {
    accent: '#EF4444', accent600: '#B91C1C', accent100: '#FEE2E2',
    boardBg: '#F59E0B',
    boardBgGradient: 'linear-gradient(135deg, #EF4444 0%, #F59E0B 100%)',
  },
  ocean: {
    accent: '#1E40AF', accent600: '#1E3A8A', accent100: '#DBEAFE',
    boardBg: '#0D9488',
    boardBgGradient: 'linear-gradient(135deg, #1E40AF 0%, #0D9488 100%)',
  },
  sakura: {
    accent: '#F472B6', accent600: '#DB2777', accent100: '#FCE7F3',
    boardBg: '#DB2777',
    boardBgGradient: 'linear-gradient(135deg, #F472B6 0%, #DB2777 100%)',
  },
  mint: {
    accent: '#14B8A6', accent600: '#0F766E', accent100: '#CCFBF1',
    boardBg: '#84CC16',
    boardBgGradient: 'linear-gradient(135deg, #14B8A6 0%, #84CC16 100%)',
  },
  twilight: {
    accent: '#4338CA', accent600: '#3730A3', accent100: '#E0E7FF',
    boardBg: '#7E22CE',
    boardBgGradient: 'linear-gradient(135deg, #4338CA 0%, #7E22CE 100%)',
  },
  volcano: {
    accent: '#DC2626', accent600: '#991B1B', accent100: '#FEE2E2',
    boardBg: '#44403C',
    boardBgGradient: 'linear-gradient(135deg, #44403C 0%, #DC2626 100%)',
  },
  glacier: {
    accent: '#0EA5E9', accent600: '#0369A1', accent100: '#E0F2FE',
    boardBg: '#4338CA',
    boardBgGradient: 'linear-gradient(135deg, #0EA5E9 0%, #4338CA 100%)',
  },
  forest: {
    accent: '#166534', accent600: '#14532D', accent100: '#DCFCE7',
    boardBg: '#0F766E',
    boardBgGradient: 'linear-gradient(135deg, #166534 0%, #0F766E 100%)',
  },
  royal: {
    accent: '#7C3AED', accent600: '#5B21B6', accent100: '#EDE9FE',
    boardBg: '#7C3AED',
    boardBgGradient: 'linear-gradient(135deg, #7C3AED 0%, #F59E0B 100%)',
  },
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
  accent: 'royal',
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
  'green', 'blue', 'purple', 'red', 'orange', 'pink',
  'teal', 'gray', 'indigo', 'lime', 'amber', 'midnight',
  'sunset', 'aurora', 'cosmic', 'ember', 'ocean', 'sakura',
  'mint', 'twilight', 'volcano', 'glacier', 'forest', 'royal',
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
  // --bg-board is the canvas background. For gradient palettes use the gradient
  // string; otherwise the solid hex. Sidebar mixing below always uses the solid
  // boardBg so it stays a clean tinted hue.
  root.style.setProperty('--bg-board', palette.boardBgGradient ?? palette.boardBg);

  // Trello-classic canvas: in light mode the canvas IS the accent at full
  // saturation; the sidebar is a deeper variant of the same hue. In dark mode
  // both are tinted toward black for a "dusk" feel. Text contrast is then
  // computed from the actual canvas luminance.
  const isDark = settings.theme === 'dark';
  // Solid canvas color used for contrast math (pickContrastFg, sidebar mix).
  const canvasBgSolid = isDark
    ? mixHex(palette.boardBg, '#000000', 0.45)
    : palette.boardBg;
  // The actually-rendered canvas background — solid in normal palettes, the
  // gradient when one is defined. Dark mode tints the gradient with a black
  // overlay layered behind it to keep the "dusk" feel.
  const canvasBg = palette.boardBgGradient
    ? isDark
      ? `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), ${palette.boardBgGradient}`
      : palette.boardBgGradient
    : canvasBgSolid;
  // Sidebar surface = the accent canvas tinted slightly darker. Lower mix
  // ratios = lighter sidebar. Tuned so it reads as "darker than canvas but
  // not heavy" in both themes.
  const sidebarBg = mixHex(palette.boardBg, '#000000', isDark ? 0.35 : 0.1);
  root.style.setProperty('--canvas-bg', canvasBg);
  root.style.setProperty('--canvas-bg-sidebar', sidebarBg);

  // Always derive contrast from the solid canvas color — pickContrastFg
   //expects a hex string and would choke on a gradient.
  const canvasFg = pickContrastFg(canvasBgSolid);
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
