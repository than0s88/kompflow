import type { Column } from '@kanban/shared';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
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
import AddCard from './AddCard';
import KanbanCard from './Card';
import '../../styles/app.css';

interface Props {
  column: Column;
  boardId: string;
  onOpenCard?: (cardId: string) => void;
}

export default function KanbanColumn({ column, boardId, onOpenCard }: Props) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(column.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sortable = useSortable({ id: `column-${column.id}` });
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `column-${column.id}`,
  });

  useEffect(() => {
    setTitle(column.title);
  }, [column.title]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const updateMutation = useMutation({
    mutationFn: async (newTitle: string) =>
      (await api.patch(`/columns/${column.id}`, { title: newTitle })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', boardId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => api.delete(`/columns/${column.id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', boardId] }),
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.5 : 1,
  };

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(column.title);
      setEditing(false);
      return;
    }
    if (trimmed === column.title) {
      setEditing(false);
      return;
    }
    updateMutation.mutate(trimmed, { onSuccess: () => setEditing(false) });
  };

  const onTitleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
    if (e.key === 'Escape') {
      setTitle(column.title);
      setEditing(false);
    }
  };

  const handleDelete = (e: MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (!confirm(`Delete "${column.title}" and all its cards?`)) return;
    deleteMutation.mutate();
  };

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className={'lane' + (isOver ? ' is-dropping' : '')}
    >
      <div
        {...sortable.attributes}
        {...sortable.listeners}
        className="lane-header"
        style={{ cursor: 'grab' }}
      >
        {editing ? (
          <form
            onSubmit={submit}
            style={{ flex: 1 }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              className="lane-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => submit()}
              onKeyDown={onTitleKeyDown}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                background: 'var(--bg-app)',
                boxShadow: '0 0 0 2px var(--accent)',
                border: 0,
              }}
            />
          </form>
        ) : (
          <div
            className="lane-title"
            tabIndex={0}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
          >
            {column.title}
          </div>
        )}
        <span className="lane-count">{column.cards.length}</span>
        <div
          style={{ position: 'relative' }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            className="lane-menu"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((m) => !m);
            }}
            aria-label="Column menu"
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="19" cy="12" r="1.5" />
            </svg>
          </button>
          {menuOpen && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 30 }}
                onClick={() => setMenuOpen(false)}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 4,
                  background: 'var(--bg-app)',
                  border: '1px solid var(--hairline)',
                  borderRadius: 8,
                  padding: 6,
                  minWidth: 180,
                  zIndex: 31,
                  boxShadow: 'var(--shadow-modal)',
                }}
              >
                <button
                  type="button"
                  className="modal-side-btn"
                  style={{ width: '100%' }}
                  onClick={() => {
                    setEditing(true);
                    setMenuOpen(false);
                  }}
                >
                  Rename list
                </button>
                <button
                  type="button"
                  className="modal-side-btn danger"
                  style={{ width: '100%' }}
                  onClick={handleDelete}
                >
                  Delete list
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <SortableContext
        items={column.cards.map((c) => `card-${c.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setDroppableRef} className="lane-cards">
          {column.cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              boardId={boardId}
              onOpen={onOpenCard}
            />
          ))}
        </div>
      </SortableContext>

      <AddCard columnId={column.id} boardId={boardId} />
    </div>
  );
}
