import type { Card, CardOrnaments, WorkspaceMember } from '@kanban/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { useAuth } from '../../auth/AuthContext';
import { useWorkspace } from '../../hooks/useWorkspaces';
import RichTextEditor from '../RichTextEditor';
import { api } from '../../lib/api';
import {
  LABEL_PALETTE,
  colorName,
  dueDateTone,
  ornamentsOf,
  presetDates,
  shortDueLabel,
} from '../../lib/card-ornaments';
import { setStoredPassphrase } from '../../lib/board-key';
import { decryptString, deriveKey, encryptString, isCiphertext } from '../../lib/crypto';
import '../../styles/app.css';

type PopoverKind = 'members' | 'labels' | 'dates' | 'cover' | null;

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Trello-inspired palette used to deterministically color real-member avatars.
const MEMBER_AVATAR_PALETTE: readonly string[] = [
  'rgb(0, 121, 191)',
  'rgb(97, 189, 79)',
  'rgb(255, 159, 26)',
  'rgb(235, 90, 70)',
  'rgb(195, 119, 224)',
  'rgb(0, 194, 224)',
  'rgb(81, 232, 152)',
  'rgb(255, 120, 203)',
  'rgb(52, 69, 99)',
];

interface MemberOption {
  id: string;
  name: string;
  initials: string;
  color: string;
}

function colorForUserId(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i += 1) {
    h = (h + userId.charCodeAt(i)) | 0;
  }
  return MEMBER_AVATAR_PALETTE[Math.abs(h) % MEMBER_AVATAR_PALETTE.length];
}

function toMemberOption(
  member: WorkspaceMember,
  currentUserId: string | null,
): MemberOption | null {
  const u = member.user;
  if (!u) return null;
  return {
    id: u.id,
    name: u.id === currentUserId ? `${u.name} (you)` : u.name,
    initials: initialsFor(u.name),
    color: colorForUserId(u.id),
  };
}

interface Props {
  card: Card;
  boardId: string;
  workspaceId: string;
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
  workspaceId,
  columnTitle,
  encryptionKey,
  onClose,
  onRequestPassphraseReset,
}: Props) {
  const qc = useQueryClient();
  const { data: workspace } = useWorkspace(workspaceId);

  const [title, setTitle] = useState(card.title);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [decrypted, setDecrypted] = useState<string>('');
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [decrypting, setDecrypting] = useState(false);


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

  const { user } = useAuth();
  const ornaments = ornamentsOf(card);
  const [popover, setPopover] = useState<PopoverKind>(null);

  const updateMutation = useMutation({
    mutationFn: async (dto: {
      title?: string;
      description?: string;
      ornaments?: CardOrnaments;
    }) => (await api.patch(`/cards/${card.id}`, dto)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', boardId] }),
  });

  const ornamentsMutation = useMutation({
    mutationFn: async (next: CardOrnaments) =>
      (await api.patch(`/cards/${card.id}`, { ornaments: next })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', boardId] }),
  });

  const updateOrnaments = (next: CardOrnaments) => {
    ornamentsMutation.mutate(next);
  };

  const deleteMutation = useMutation({
    mutationFn: async () => api.delete(`/cards/${card.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board', boardId] });
      onClose();
    },
  });

  // Members for the popover are real workspace members. Each option is keyed
  // by `user.id` so toggling persists a real id into ornaments.memberIds.
  const memberOptions = useMemo<MemberOption[]>(() => {
    const members = workspace?.members ?? [];
    const currentUserId = user?.id ?? null;
    return members
      .map((m) => toMemberOption(m, currentUserId))
      .filter((m): m is MemberOption => m !== null);
  }, [workspace?.members, user?.id]);

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

  // Encrypt the card's current description with a user-supplied passphrase.
  // The derived key never leaves the browser; we persist the passphrase in
  // sessionStorage so the modal can decrypt on next open without re-prompting.
  const encryptCard = async () => {
    const passphrase = window.prompt('Set a passphrase to encrypt this card');
    if (!passphrase) return;
    try {
      const key = await deriveKey(passphrase, boardId);
      const ciphertext = await encryptString(decrypted, key);
      setStoredPassphrase(boardId, passphrase);
      updateMutation.mutate(
        { description: ciphertext },
        {
          onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ['board', boardId] });
          },
        },
      );
    } catch {
      setDecryptError('encrypt-failed');
    }
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
    // Detect rich-text (HTML) vs legacy markdown content. Anything that
    // starts with a tag is rendered as HTML so saves from the rich editor
    // round-trip. Older markdown notes still render via ReactMarkdown.
    const isHtml = /^\s*</.test(decrypted);
    return (
      <div className="modal-desc-display" onClick={startEditDescription}>
        {isHtml ? (
          <div
            className="rte-rendered"
            // Tiptap output is constrained to our extension set; safe to inline.
            dangerouslySetInnerHTML={{ __html: decrypted }}
          />
        ) : (
          <ReactMarkdown
            remarkPlugins={remarkPlugins}
            rehypePlugins={rehypePlugins}
            urlTransform={safeUrlTransform}
          >
            {decrypted}
          </ReactMarkdown>
        )}
      </div>
    );
  };

  return createPortal(
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
        {ornaments.cover ? (
          <div
            className="modal-cover"
            style={{ background: ornaments.cover }}
          />
        ) : null}
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

            {ornaments.labels.length > 0 ? (
              <div className="modal-section">
                <div
                  className="modal-section-title"
                  style={{
                    marginLeft: 38,
                    fontSize: 11,
                    color: 'var(--fg-3)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    marginBottom: 6,
                  }}
                >
                  Labels
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    marginLeft: 38,
                  }}
                >
                  {ornaments.labels.map((color, i) => (
                    <span
                      key={i}
                      style={{
                        background: color,
                        color: 'rgba(0,0,0,0.78)',
                        fontSize: 12,
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 4,
                        letterSpacing: '0.02em',
                      }}
                    >
                      {colorName(color) || ''}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {(() => {
              // Resolve real members; unknown ids (legacy 'me' / 'tm-*' or
              // members who left the workspace) are skipped silently.
              const resolved = ornaments.memberIds
                .map((id) => memberOptions.find((o) => o.id === id))
                .filter((m): m is MemberOption => Boolean(m));
              if (resolved.length === 0) return null;
              return (
                <div className="modal-section">
                  <div
                    className="modal-section-title"
                    style={{
                      marginLeft: 38,
                      fontSize: 11,
                      color: 'var(--fg-3)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      marginBottom: 6,
                    }}
                  >
                    Members
                  </div>
                  <div style={{ display: 'flex', marginLeft: 38 }}>
                    {resolved.map((m) => (
                      <div
                        key={m.id}
                        className="avatar"
                        title={m.name}
                        style={{
                          background: m.color,
                          width: 32,
                          height: 32,
                          fontSize: 12,
                        }}
                      >
                        {m.initials}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {ornaments.dueDate ? (
              <div className="modal-section">
                <div
                  className="modal-section-title"
                  style={{
                    marginLeft: 38,
                    fontSize: 11,
                    color: 'var(--fg-3)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    marginBottom: 6,
                  }}
                >
                  Due date
                </div>
                <div style={{ marginLeft: 38 }}>
                  <span
                    className={
                      'card-meta-icon due ' + dueDateTone(ornaments.dueDate)
                    }
                    style={{ fontSize: 13, padding: '4px 10px' }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="3" y="5" width="18" height="16" rx="2" />
                      <path d="M3 10h18M8 3v4M16 3v4" />
                    </svg>
                    {shortDueLabel(ornaments.dueDate)}
                  </span>
                </div>
              </div>
            ) : null}

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
                    <RichTextEditor
                      value={descDraft}
                      onChange={setDescDraft}
                      placeholder="Add a more detailed description…"
                      autoFocus
                    />
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
            <button
              type="button"
              className="modal-side-btn"
              onClick={() => setPopover('members')}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
              </svg>
              Members
            </button>
            <button
              type="button"
              className="modal-side-btn"
              onClick={() => setPopover('labels')}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 12V5a2 2 0 012-2h7l9 9-9 9-9-9z" />
                <circle cx="8" cy="8" r="1.5" />
              </svg>
              Labels
            </button>
            <button
              type="button"
              className="modal-side-btn"
              onClick={() => setPopover('dates')}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M3 10h18M8 3v4M16 3v4" />
              </svg>
              Dates
            </button>
            <button
              type="button"
              className="modal-side-btn"
              onClick={() => setPopover('cover')}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M3 12l5-3 5 4 4-3 4 4" />
              </svg>
              Cover
            </button>
            <div className="modal-side-label" style={{ marginTop: 12 }}>
              Actions
            </div>
            <button
              type="button"
              className="modal-side-btn"
              onClick={() => {
                if (isEncrypted) {
                  onRequestPassphraseReset?.();
                  return;
                }
                void encryptCard();
              }}
              disabled={updateMutation.isPending}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V7a4 4 0 018 0v4" />
              </svg>
              {isEncrypted ? 'Re-enter passphrase' : 'Encrypt card'}
            </button>
            <button
              type="button"
              className="modal-side-btn danger"
              onClick={() => {
                if (confirm('Delete this card?')) deleteMutation.mutate();
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
              </svg>
              Delete card
            </button>
          </aside>
        </div>

        {popover ? (
          <>
            <div
              className="popover-overlay"
              onClick={() => setPopover(null)}
            />
            <div
              className="popover"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              {popover === 'dates' ? (
                <>
                  <div className="popover-title">Due date</div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    {presetDates().map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        className="modal-side-btn"
                        onClick={() => {
                          updateOrnaments({
                            ...ornaments,
                            dueDate: p.iso,
                          });
                          setPopover(null);
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="modal-side-btn danger"
                      onClick={() => {
                        updateOrnaments({ ...ornaments, dueDate: null });
                        setPopover(null);
                      }}
                    >
                      Remove date
                    </button>
                  </div>
                </>
              ) : null}
              {popover === 'cover' ? (
                <>
                  <div className="popover-title">Cover</div>
                  <div className="label-picker">
                    {LABEL_PALETTE.map((l) => (
                      <div
                        key={l.name}
                        className={
                          'label-swatch' +
                          (ornaments.cover === l.color ? ' selected' : '')
                        }
                        style={{ background: l.color }}
                        onClick={() =>
                          updateOrnaments({ ...ornaments, cover: l.color })
                        }
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ width: '100%', marginTop: 10, fontSize: 13 }}
                    onClick={() => {
                      updateOrnaments({ ...ornaments, cover: null });
                      setPopover(null);
                    }}
                  >
                    Remove cover
                  </button>
                </>
              ) : null}
              {popover === 'labels' ? (
                <>
                  <div className="popover-title">Labels</div>
                  <div className="label-picker">
                    {LABEL_PALETTE.map((l) => {
                      const selected = ornaments.labels.includes(l.color);
                      return (
                        <div
                          key={l.name}
                          className={
                            'label-swatch' + (selected ? ' selected' : '')
                          }
                          title={l.name}
                          style={{ background: l.color }}
                          onClick={() => {
                            const next = selected
                              ? ornaments.labels.filter((c) => c !== l.color)
                              : [...ornaments.labels, l.color];
                            updateOrnaments({ ...ornaments, labels: next });
                          }}
                        />
                      );
                    })}
                  </div>
                </>
              ) : null}
              {popover === 'members' ? (
                <>
                  <div className="popover-title">Members</div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    {memberOptions.map((m) => {
                      const selected = ornaments.memberIds.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          className="modal-side-btn"
                          style={{
                            background: selected
                              ? 'var(--bg-chip)'
                              : 'var(--bg-input-soft)',
                          }}
                          onClick={() => {
                            const next = selected
                              ? ornaments.memberIds.filter((x) => x !== m.id)
                              : [...ornaments.memberIds, m.id];
                            updateOrnaments({
                              ...ornaments,
                              memberIds: next,
                            });
                          }}
                        >
                          <div
                            className="avatar"
                            style={{
                              background: m.color,
                              width: 24,
                              height: 24,
                              fontSize: 10,
                              marginLeft: 0,
                            }}
                          >
                            {m.initials}
                          </div>
                          <span style={{ flex: 1 }}>{m.name}</span>
                          {selected ? (
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              <path d="M5 12l5 5L20 7" />
                            </svg>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
