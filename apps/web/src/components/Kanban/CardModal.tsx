import type { Card } from '@kanban/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { api } from '../../lib/api';
import { decryptString, encryptString, isCiphertext } from '../../lib/crypto';
import '../../styles/app.css';

interface Props {
  card: Card;
  boardId: string;
  columnTitle?: string;
  encryptionKey: CryptoKey | null;
  onClose: () => void;
  onRequestPassphraseReset?: () => void;
}

// Allow only safe URL schemes for links and images. Data URLs are restricted
// to images so a sneaky `data:text/html` cannot become a clickable link.
function safeUrlTransform(url: string): string {
  const lower = url.trim().toLowerCase();
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('mailto:') ||
    lower.startsWith('data:image/')
  ) {
    return url;
  }
  return '';
}

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    img: [
      ...(defaultSchema.attributes?.img ?? []),
      ['src'],
      ['alt'],
      ['title'],
    ],
  },
  protocols: {
    ...defaultSchema.protocols,
    src: ['http', 'https', 'data'],
  },
};

export default function CardModal({
  card,
  boardId,
  columnTitle,
  encryptionKey,
  onClose,
  onRequestPassphraseReset,
}: Props) {
  const qc = useQueryClient();

  const [title, setTitle] = useState(card.title);
  const [editingDesc, setEditingDesc] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [decrypted, setDecrypted] = useState<string>('');
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [decrypting, setDecrypting] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stored = card.description ?? '';
  const isEncrypted = isCiphertext(stored);

  // Decrypt (or pass through plaintext) when card or key changes.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setDecryptError(null);
      if (!stored) {
        setDecrypted('');
        return;
      }
      if (!isEncrypted) {
        setDecrypted(stored);
        return;
      }
      if (!encryptionKey) {
        // Encrypted but we don't have the key — show the locked state.
        setDecrypted('');
        setDecryptError('locked');
        return;
      }
      setDecrypting(true);
      try {
        const plain = await decryptString(stored, encryptionKey);
        if (!cancelled) setDecrypted(plain);
      } catch {
        if (!cancelled) setDecryptError('wrong-passphrase');
      } finally {
        if (!cancelled) setDecrypting(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [stored, isEncrypted, encryptionKey]);

  useEffect(() => {
    setTitle(card.title);
  }, [card.title]);

  // ESC closes modal (handled at modal scope so it works even with focus inside).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingDesc) {
          setEditingDesc(false);
          return;
        }
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editingDesc, onClose]);

  const updateMutation = useMutation({
    mutationFn: async (dto: { title?: string; description?: string }) =>
      (await api.patch(`/cards/${card.id}`, dto)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', boardId] }),
  });

  const submitTitle = () => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === card.title) {
      setTitle(card.title);
      return;
    }
    updateMutation.mutate({ title: trimmed });
  };

  const onTitleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
    }
    if (e.key === 'Escape') {
      setTitle(card.title);
      e.currentTarget.blur();
    }
  };

  const startEditDescription = () => {
    setDescDraft(decrypted);
    setEditingDesc(true);
    setShowPreview(false);
  };

  const cancelEditDescription = () => {
    setEditingDesc(false);
    setDescDraft('');
  };

  const saveDescription = async () => {
    try {
      let payload = descDraft;
      if (encryptionKey) {
        payload = await encryptString(descDraft, encryptionKey);
      }
      updateMutation.mutate(
        { description: payload },
        {
          onSuccess: () => {
            setDecrypted(descDraft);
            setEditingDesc(false);
            setDescDraft('');
          },
        },
      );
    } catch {
      setDecryptError('encrypt-failed');
    }
  };

  const insertAtCursor = (text: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setDescDraft((d) => d + text);
      return;
    }
    const start = ta.selectionStart ?? descDraft.length;
    const end = ta.selectionEnd ?? descDraft.length;
    const next = descDraft.slice(0, start) + text + descDraft.slice(end);
    setDescDraft(next);
    // Restore caret after React updates the value.
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + text.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const handleImagePick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') return;
      const safeName = file.name.replace(/[\[\]()]/g, '');
      insertAtCursor(`\n![${safeName}](${result})\n`);
    };
    reader.readAsDataURL(file);
  };

  const remarkPlugins = useMemo(() => [remarkGfm], []);
  const rehypePlugins = useMemo(
    () => [[rehypeSanitize, sanitizeSchema] as [typeof rehypeSanitize, typeof sanitizeSchema]],
    [],
  );

  const renderDescription = () => {
    if (decryptError === 'locked' || decryptError === 'wrong-passphrase') {
      return (
        <div
          className="modal-desc-display"
          style={{
            background: '#FFF3F0',
            color: '#C9372C',
            cursor: 'default',
          }}
        >
          <div style={{ marginBottom: 8 }}>
            🔒 Cannot decrypt — wrong passphrase?
          </div>
          {onRequestPassphraseReset && (
            <button
              type="button"
              className="btn-secondary"
              onClick={onRequestPassphraseReset}
              style={{ fontSize: 12 }}
            >
              Re-enter passphrase
            </button>
          )}
        </div>
      );
    }
    if (decrypting) {
      return (
        <div className="modal-desc-display empty">Decrypting…</div>
      );
    }
    if (!decrypted) {
      return (
        <div
          className="modal-desc-display empty"
          onClick={startEditDescription}
        >
          Add a more detailed description…
        </div>
      );
    }
    return (
      <div className="modal-desc-display" onClick={startEditDescription}>
        <ReactMarkdown
          remarkPlugins={remarkPlugins}
          rehypePlugins={rehypePlugins}
          urlTransform={safeUrlTransform}
        >
          {decrypted}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Card detail"
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'relative' }}
      >
        <button
          type="button"
          aria-label="Close"
          className="modal-close-x"
          onClick={onClose}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="modal-body">
          <div className="modal-main">
            <div className="modal-header">
              <div className="modal-icon" aria-hidden="true">
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
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M3 10h18" />
                </svg>
              </div>
              <input
                className="modal-title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={submitTitle}
                onKeyDown={onTitleKeyDown}
                aria-label="Card title"
              />
            </div>
            {columnTitle && (
              <div className="modal-context">
                in list <strong>{columnTitle}</strong>
                {encryptionKey && (
                  <span style={{ marginLeft: 8 }} title="End-to-end encrypted">
                    🔒 encrypted
                  </span>
                )}
              </div>
            )}

            <div className="modal-section">
              <div className="modal-section-header">
                <div className="modal-section-icon" aria-hidden="true">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M4 6h16M4 12h16M4 18h10" />
                  </svg>
                </div>
                <h3 className="modal-section-title">Description</h3>
                {!editingDesc && decrypted && !decryptError && (
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ marginLeft: 'auto', fontSize: 12 }}
                    onClick={startEditDescription}
                  >
                    Edit
                  </button>
                )}
              </div>
              <div className="modal-desc-area">
                {editingDesc ? (
                  <div className="modal-desc-edit">
                    {showPreview ? (
                      <div className="modal-desc-display">
                        <ReactMarkdown
                          remarkPlugins={remarkPlugins}
                          rehypePlugins={rehypePlugins}
                          urlTransform={safeUrlTransform}
                        >
                          {descDraft || '_Nothing to preview yet._'}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <textarea
                        ref={textareaRef}
                        value={descDraft}
                        onChange={(e) => setDescDraft(e.target.value)}
                        rows={10}
                        placeholder="Markdown supported. Drop images via the button below."
                      />
                    )}
                    <div className="modal-desc-edit-actions">
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ padding: '7px 14px', fontSize: 13 }}
                        onClick={() => void saveDescription()}
                        disabled={updateMutation.isPending}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={cancelEditDescription}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '7px 12px', fontSize: 13 }}
                        onClick={() => setShowPreview((p) => !p)}
                      >
                        {showPreview ? 'Edit' : 'Preview'}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '7px 12px', fontSize: 13 }}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Insert image
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleImagePick}
                      />
                      <span className="modal-desc-hint">
                        Markdown · images embed as data URLs
                      </span>
                    </div>
                  </div>
                ) : (
                  renderDescription()
                )}
              </div>
            </div>
          </div>

          <aside className="modal-side">
            <div className="modal-side-label">Add to card</div>
            <button type="button" className="modal-side-btn" disabled>
              Members
            </button>
            <button type="button" className="modal-side-btn" disabled>
              Labels
            </button>
            <button type="button" className="modal-side-btn" disabled>
              Checklist
            </button>
            <div className="modal-side-label">Members</div>
            <div
              style={{
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                fontSize: 12,
                color: 'var(--fg-3)',
              }}
            >
              No members yet
            </div>
            <div className="modal-side-label">Labels</div>
            <div
              style={{
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                fontSize: 12,
                color: 'var(--fg-3)',
              }}
            >
              No labels yet
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
