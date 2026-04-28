// Board passphrase + key helpers. The passphrase is held in sessionStorage
// (per board id) so navigation doesn't force re-entry; the derived CryptoKey
// is held in memory by BoardView (non-extractable, can't be serialised).

const STORAGE_PREFIX = 'kompflow.passphrase.';

export function passphraseStorageKey(boardId: string): string {
  return `${STORAGE_PREFIX}${boardId}`;
}

export function getStoredPassphrase(boardId: string): string | null {
  try {
    return sessionStorage.getItem(passphraseStorageKey(boardId));
  } catch {
    return null;
  }
}

export function setStoredPassphrase(boardId: string, passphrase: string): void {
  try {
    sessionStorage.setItem(passphraseStorageKey(boardId), passphrase);
  } catch {
    // ignore storage failures (private mode, quota, etc.)
  }
}

export function clearStoredPassphrase(boardId: string): void {
  try {
    sessionStorage.removeItem(passphraseStorageKey(boardId));
  } catch {
    // ignore
  }
}
