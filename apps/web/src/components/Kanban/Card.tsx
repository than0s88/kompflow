import type { Card } from '@kanban/shared';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
} from 'react';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import {
  TEAMMATE_POOL,
  dueDateTone,
  ornamentsOf,
  shortDueLabel,
} from '../../lib/card-ornaments';
import { isCiphertext } from '../../lib/crypto';

interface Props {
  card: Card;
  boardId: string;
  dragging?: boolean;
  onOpen?: (cardId: string) => void;
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function KanbanCard({
  card,
  boardId,
  dragging = false,
  onOpen,
}: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const sortable = useSortable({ id: `card-${card.id}` });

  useEffect(() => {
    setTitle(card.title);
  }, [card.title]);

  useEffect(() => {
    if (editing) {
      const el = inputRef.current;
      if (el) {
        el.focus();
        el.select();
      }
    }
  }, [editing]);

  const updateMutation = useMutation({
    mutationFn: async (newTitle: string) =>
      (await api.patch(`/cards/${card.id}`, { title: newTitle })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', boardId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => api.delete(`/cards/${card.id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', boardId] }),
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(card.title);
      setEditing(false);
      return;
    }
    if (trimmed === card.title) {
      setEditing(false);
      return;
    }
    updateMutation.mutate(trimmed, { onSuccess: () => setEditing(false) });
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
    if (e.key === 'Escape') {
      setTitle(card.title);
      setEditing(false);
    }
  };

  const handleDelete = (e: MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this card?')) return;
    deleteMutation.mutate();
  };

  if (editing && !dragging) {
    return (
      <div className="card-composer">
        <form onSubmit={submit} onClick={(e) => e.stopPropagation()}>
          <textarea
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => submit()}
            onKeyDown={onKeyDown}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="Card title…"
          />
          <div className="card-composer-actions">
            <button
              type="submit"
              className="btn-primary"
              style={{ padding: '7px 14px', fontSize: 13 }}
            >
              Save
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setTitle(card.title);
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  // `dragging` = this is the floating DragOverlay clone (show it crisply).
  // `sortable.isDragging` = this is the original card being dragged (hide it,
  // otherwise we'd have two copies on screen at once).
  const dragClass = dragging
    ? ' is-dragging'
    : sortable.isDragging
      ? ' is-drag-source'
      : '';
  const orn = ornamentsOf(card);
  const description = card.description ?? '';
  const hasDescription = description.length > 0;
  const isEncrypted = hasDescription && isCiphertext(description);
  const dueTone = orn.dueDate ? dueDateTone(orn.dueDate) : null;
  const dueLabel = orn.dueDate ? shortDueLabel(orn.dueDate) : null;
  const meTeammates = orn.memberIds
    .map((id) =>
      id === 'me'
        ? null
        : TEAMMATE_POOL.find((t) => t.id === id) ?? null,
    )
    .filter((t): t is (typeof TEAMMATE_POOL)[number] => t !== null);
  const includeMe = orn.memberIds.includes('me');

  return (
    <div
      ref={dragging ? undefined : sortable.setNodeRef}
      style={dragging ? undefined : style}
      {...(dragging ? {} : sortable.attributes)}
      {...(dragging ? {} : sortable.listeners)}
      className={'card' + dragClass}
      onClick={
        dragging || sortable.isDragging
          ? undefined
          : (e) => {
              if (e.defaultPrevented) return;
              onOpen?.(card.id);
            }
      }
    >
      {orn.cover ? (
        <div className="card-cover" style={{ background: orn.cover }} />
      ) : null}

      {orn.labels.length > 0 ? (
        <div className="card-labels">
          {orn.labels.map((color, i) => (
            <div
              key={i}
              className="card-label"
              style={{ background: color }}
            />
          ))}
        </div>
      ) : null}

      <div className="card-title">{card.title}</div>

      <div className="card-meta">
        {isEncrypted ? (
          <span className="card-meta-icon" title="Encrypted">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V7a4 4 0 018 0v4" />
            </svg>
          </span>
        ) : null}

        {dueTone && dueLabel ? (
          <span
            className={'card-meta-icon due ' + dueTone}
            title={`Due ${dueLabel}`}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
            {dueLabel}
          </span>
        ) : null}

        {hasDescription && !isEncrypted ? (
          <span
            className="card-meta-icon has-desc"
            title="This card has a description"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="14" y2="17" />
            </svg>
          </span>
        ) : null}

        {(meTeammates.length > 0 || (includeMe && user)) ? (
          <div className="card-assignees">
            {meTeammates.map((t) => (
              <div
                key={t.id}
                className="avatar"
                title={t.name}
                style={{ background: t.color }}
              >
                {t.initials}
              </div>
            ))}
            {includeMe && user ? (
              <div
                className="avatar"
                title="You"
                style={{ background: 'rgb(0, 121, 191)' }}
              >
                {initialsFor(user.name)}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {!dragging ? (
        <>
          <button
            type="button"
            className="card-edit-btn"
            aria-label="Edit card"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleDelete}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Delete card"
            className="card-delete-btn"
            style={{
              position: 'absolute',
              bottom: 4,
              right: 4,
              width: 22,
              height: 22,
              borderRadius: 5,
              display: 'none',
              placeItems: 'center',
              color: 'var(--fg-3)',
              background: 'rgba(255,255,255,0.92)',
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </>
      ) : null}
    </div>
  );
}
