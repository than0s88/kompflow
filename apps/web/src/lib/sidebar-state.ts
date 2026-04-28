import { useEffect, useSyncExternalStore } from 'react';

/**
 * Tiny store for "is the left sidebar collapsed?" with localStorage persistence
 * + cross-tab sync. Modeled after lib/settings.ts so the pattern matches.
 */

const STORAGE_KEY = 'kompflow.sidebar.collapsed';

let collapsed: boolean = readInitial();
const listeners = new Set<() => void>();

function readInitial(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function persist(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  } catch {
    /* quota / disabled — ignore */
  }
}

function emit(): void {
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function getSnapshot(): boolean {
  return collapsed;
}

export function setSidebarCollapsed(next: boolean): void {
  if (next === collapsed) return;
  collapsed = next;
  persist();
  emit();
}

export function toggleSidebar(): void {
  setSidebarCollapsed(!collapsed);
}

export function useSidebarCollapsed(): [boolean, (next: boolean) => void] {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = e.newValue === 'true';
      if (next !== collapsed) {
        collapsed = next;
        emit();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return [value, setSidebarCollapsed];
}
