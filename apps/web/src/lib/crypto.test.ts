import { describe, it, expect } from 'vitest';
import {
  decryptString,
  deriveKey,
  encryptString,
  isCiphertext,
} from './crypto';

describe('crypto', () => {
  describe('encrypt/decrypt round-trip', () => {
    it('encrypts and decrypts the same plaintext with the same key', async () => {
      const key = await deriveKey('correct horse battery staple', 'board-1');
      const plaintext = 'this is a sensitive description';

      const ciphertext = await encryptString(plaintext, key);
      const decrypted = await decryptString(ciphertext, key);

      expect(decrypted).toBe(plaintext);
      // Sanity: ciphertext is not the plaintext itself
      expect(ciphertext).not.toContain(plaintext);
    });

    it('produces different ciphertexts for the same plaintext (random IV)', async () => {
      const key = await deriveKey('passphrase', 'board-1');
      const a = await encryptString('hello', key);
      const b = await encryptString('hello', key);
      expect(a).not.toBe(b);
    });
  });

  describe('wrong-key decryption', () => {
    it('throws when decrypting with the WRONG passphrase', async () => {
      const correct = await deriveKey('passphrase-A', 'board-1');
      const wrong = await deriveKey('passphrase-B', 'board-1');

      const ciphertext = await encryptString('top secret', correct);

      // Wrong passphrase must NEVER silently succeed.
      await expect(decryptString(ciphertext, wrong)).rejects.toThrow();
    });

    it('throws when decrypting with the same passphrase but a different boardId', async () => {
      // Important: boardId is the salt, so the derived keys should differ.
      const k1 = await deriveKey('shared-passphrase', 'board-1');
      const k2 = await deriveKey('shared-passphrase', 'board-2');

      const ciphertext = await encryptString('payload', k1);
      await expect(decryptString(ciphertext, k2)).rejects.toThrow();
    });
  });

  describe('isCiphertext', () => {
    it('returns true for a valid envelope', async () => {
      const key = await deriveKey('p', 'b');
      const ct = await encryptString('hello', key);
      expect(isCiphertext(ct)).toBe(true);
    });

    it('returns false for plain strings', () => {
      expect(isCiphertext('hello world')).toBe(false);
      expect(isCiphertext('')).toBe(false);
      expect(isCiphertext(null)).toBe(false);
      expect(isCiphertext(undefined)).toBe(false);
    });

    it('returns false for malformed JSON that starts with {', () => {
      expect(isCiphertext('{not json')).toBe(false);
    });

    it('returns false for valid JSON that is not an envelope', () => {
      expect(isCiphertext('{"foo":"bar"}')).toBe(false);
      // Wrong version
      expect(isCiphertext('{"v":2,"iv":"x","ct":"y"}')).toBe(false);
      // Missing fields
      expect(isCiphertext('{"v":1,"iv":"x"}')).toBe(false);
    });
  });

  describe('key derivation determinism', () => {
    it('same passphrase + same boardId yields keys that are interoperable', async () => {
      const a = await deriveKey('same-passphrase', 'board-X');
      const b = await deriveKey('same-passphrase', 'board-X');
      // CryptoKey objects are not equal by reference; the proof is that
      // ciphertext from one decrypts under the other.
      const ct = await encryptString('round-trip via twin key', a);
      const pt = await decryptString(ct, b);
      expect(pt).toBe('round-trip via twin key');
    });

    it('different boardIds with same passphrase produce DIFFERENT keys', async () => {
      const k1 = await deriveKey('same-passphrase', 'board-A');
      const k2 = await deriveKey('same-passphrase', 'board-B');

      const ct = await encryptString('only-A', k1);
      // If boardId did not actually salt the derivation, this would succeed
      // and silently leak data across boards.
      await expect(decryptString(ct, k2)).rejects.toThrow();
    });
  });
});
