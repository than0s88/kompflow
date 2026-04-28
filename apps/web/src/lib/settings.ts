import { useEffect, useSyncExternalStore } from 'react';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type Theme = 'light' | 'dark';
export type MotionMultiplier = 0 | 0.5 | 1 | 1.5 | 2;
export type Density = 'compact' | 'comfy' | 'cozy';
export type CardSize = 'small' | 'default' | 'large';

export interface Settings {
  theme: Theme;
  motion: MotionMultiplier;
  density: Density;
  cardSize: CardSize;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  motion: 1,
  density: 'comfy',
  cardSize: 'default',
};

const STORAGE_KEY = 'kompflow.settings';

/* ------------------------------------------------------------------ */
/* Persistence                                                        */
/* ------------------------------------------------------------------ */

const THEMES: ReadonlyArray<Theme> = ['light', 'dark'];
const MOTION_VALUES: ReadonlyArray<MotionMultiplier> = [0, 0.5, 1, 1.5, 2];
const DENSITIES: ReadonlyArray<Density> = ['compact', 'comfy', 'cozy'];
const CARD_SIZES: ReadonlyArray<CardSize> = ['small', 'default', 'large'];

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
  root.style.setProperty('--motion-mult', String(settings.motion));
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
    next.cardSize === currentSettings.cardSize
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
