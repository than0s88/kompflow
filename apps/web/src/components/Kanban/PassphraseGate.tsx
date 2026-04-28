import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { deriveKey } from '../../lib/crypto';
import { setStoredPassphrase } from '../../lib/board-key';
import '../../styles/app.css';

interface Props {
  boardId: string;
  boardTitle: string;
  initialError?: string | null;
  onUnlock: (key: CryptoKey) => void;
}

export default function PassphraseGate({
  boardId,
  boardTitle,
  initialError,
  onUnlock,
}: Props) {
  const [passphrase, setPassphrase] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!passphrase || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const key = await deriveKey(passphrase, boardId);
      setStoredPassphrase(boardId, passphrase);
      onUnlock(key);
    } catch {
      setError('Could not derive key from that passphrase.');
      setSubmitting(false);
    }
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{ placeItems: 'center', alignItems: 'center' }}
    >
      <form
        onSubmit={(e) => void submit(e)}
        className="modal"
        style={{ width: 'min(420px, 100%)', padding: 0 }}
      >
        <div style={{ padding: '28px 28px 24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'var(--accent-100)',
                color: 'var(--accent)',
                display: 'grid',
                placeItems: 'center',
              }}
              aria-hidden="true"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  margin: 0,
                  color: 'var(--fg-1)',
                  letterSpacing: '-0.01em',
                }}
              >
                Passphrase required
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--fg-3)',
                  margin: '2px 0 0',
                }}
              >
                {boardTitle} is end-to-end encrypted.
              </p>
            </div>
          </div>

          <label
            className="auth-label"
            htmlFor="board-passphrase"
            style={{ display: 'block', marginBottom: 6 }}
          >
            Passphrase
          </label>
          <input
            id="board-passphrase"
            ref={inputRef}
            type="password"
            className="auth-input"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            onKeyDown={onKeyDown}
            autoComplete="off"
            placeholder="Enter the board passphrase"
          />
          {error && (
            <div className="auth-error" style={{ marginTop: 10 }}>
              {error}
            </div>
          )}

          <p
            style={{
              fontSize: 12,
              color: 'var(--fg-3)',
              margin: '12px 0 0',
              lineHeight: 1.5,
            }}
          >
            The passphrase never leaves this device. If you don't have it, ask
            another member of the board out-of-band.
          </p>
        </div>

        <div
          style={{
            padding: '12px 20px 20px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <button
            type="submit"
            className="btn-primary"
            disabled={!passphrase || submitting}
          >
            {submitting ? 'Unlocking…' : 'Unlock'}
          </button>
        </div>
      </form>
    </div>
  );
}
