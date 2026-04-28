// Browser-native AES-GCM + PBKDF2 helpers for per-board E2E encryption.
//
// Wire format (stored verbatim in Card.description on the server):
//   { "v": 1, "iv": "<base64>", "ct": "<base64>" }
// The server treats this as opaque — only the user with the passphrase
// can derive the key (PBKDF2-SHA256, 200k iters, board id as salt) and
// decrypt the ciphertext.

const PBKDF2_ITERATIONS = 200_000;
const ENVELOPE_VERSION = 1 as const;

interface CipherEnvelope {
  v: typeof ENVELOPE_VERSION;
  iv: string;
  ct: string;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const buf = new ArrayBuffer(binary.length);
  const out = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

export async function deriveKey(
  passphrase: string,
  boardId: string,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: textEncoder.encode(boardId),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptString(
  plaintext: string,
  key: CryptoKey,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ctBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    textEncoder.encode(plaintext),
  );
  const envelope: CipherEnvelope = {
    v: ENVELOPE_VERSION,
    iv: bytesToBase64(iv),
    ct: bytesToBase64(new Uint8Array(ctBuf)),
  };
  return JSON.stringify(envelope);
}

export async function decryptString(
  payload: string,
  key: CryptoKey,
): Promise<string> {
  const parsed: unknown = JSON.parse(payload);
  if (!isEnvelope(parsed)) {
    throw new Error('Invalid ciphertext envelope');
  }
  const iv = base64ToBytes(parsed.iv);
  const ct = base64ToBytes(parsed.ct);
  const ptBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ct,
  );
  return textDecoder.decode(ptBuf);
}

function isEnvelope(value: unknown): value is CipherEnvelope {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.v === ENVELOPE_VERSION &&
    typeof v.iv === 'string' &&
    typeof v.ct === 'string'
  );
}

export function isCiphertext(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed.startsWith('{')) return false;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    return isEnvelope(parsed);
  } catch {
    return false;
  }
}
