import '@testing-library/jest-dom/vitest';
import { webcrypto } from 'node:crypto';

// jsdom does not implement SubtleCrypto. Patch in Node's WebCrypto so the
// AES-GCM/PBKDF2 helpers in lib/crypto.ts run unmodified during tests.
if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
}
