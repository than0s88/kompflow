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
import { api } from '../../lib/api';
import '../../styles/app.css';

interface Props {
  card: Card;
  boardId: string;
  dragging?: boolean;
  onOpen?: (cardId: string) => void;
}

export default function KanbanCard({ card, boardId, dragging = false, onOpen }: Props) {
  const qc = useQueryClient();
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

  const dragClass = dragging || sortable.isDragging ? ' is-dragging' : '';

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
              // Don't open the modal if a child (edit/delete button) handled the click.
              if (e.defaultPrevented) return;
              onOpen?.(card.id);
            }
      }
    >
      <div className="card-title">{card.title}</div>
      {!dragging && (
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
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleDelete}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Delete card"
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
            className="card-delete-btn"
          >
            ×
          </button>
        </>
      )}
    </div>
  );
}
