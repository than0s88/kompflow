import { afterEach, describe, it, expect } from 'vitest';
import {
  clearStoredPassphrase,
  getStoredPassphrase,
  passphraseStorageKey,
  setStoredPassphrase,
} from './board-key';

describe('board-key passphrase storage', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('returns null when no passphrase is stored for the board', () => {
    expect(getStoredPassphrase('board-unknown')).toBeNull();
  });

  it('round-trips: store then retrieve returns the same value', () => {
    setStoredPassphrase('board-1', 'super-secret');
    expect(getStoredPassphrase('board-1')).toBe('super-secret');
  });

  it('isolates passphrases per board', () => {
    setStoredPassphrase('board-A', 'pass-A');
    setStoredPassphrase('board-B', 'pass-B');
    expect(getStoredPassphrase('board-A')).toBe('pass-A');
    expect(getStoredPassphrase('board-B')).toBe('pass-B');
  });

  it('clearStoredPassphrase removes only the targeted board entry', () => {
    setStoredPassphrase('board-A', 'pass-A');
    setStoredPassphrase('board-B', 'pass-B');
    clearStoredPassphrase('board-A');
    expect(getStoredPassphrase('board-A')).toBeNull();
    expect(getStoredPassphrase('board-B')).toBe('pass-B');
  });

  it('storage key is prefixed and includes the boardId', () => {
    expect(passphraseStorageKey('xyz')).toContain('xyz');
    expect(passphraseStorageKey('xyz')).toMatch(/^kompflow\.passphrase\./);
  });
});
