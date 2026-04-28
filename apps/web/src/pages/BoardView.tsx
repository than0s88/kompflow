import type { Board, Card, Column, ReorderDto, UpdateBoardDto } from '@kanban/shared';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Link, useParams } from 'react-router-dom';
import AddColumn from '../components/Kanban/AddColumn';
import KanbanCard from '../components/Kanban/Card';
import CardModal from '../components/Kanban/CardModal';
import KanbanColumn from '../components/Kanban/Column';
import PassphraseGate from '../components/Kanban/PassphraseGate';
import { useAuth } from '../auth/AuthContext';
import { api } from '../lib/api';
import {
  clearStoredPassphrase,
  getStoredPassphrase,
} from '../lib/board-key';
import { deriveKey } from '../lib/crypto';
import { getPusher } from '../lib/pusher';
import '../styles/app.css';

type ActiveItem = { type: 'column'; column: Column } | { type: 'card'; card: Card } | null;

const AVATAR_PALETTE = [
  '#0079BF',
  '#61BD4F',
  '#FF9F1A',
  '#EB5A46',
  '#C377E0',
  '#00C2E0',
  '#FF78CB',
  '#344563',
];

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export default function BoardView() {
  const { boardId } = useParams<{ boardId: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: board, isLoading } = useQuery({
    queryKey: ['board', boardId],
    queryFn: async () => (await api.get<Board>(`/boards/${boardId}`)).data,
    enabled: !!boardId,
  });

  const [columns, setColumns] = useState<Column[]>([]);
  const [active, setActive] = useState<ActiveItem>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [keyAttempted, setKeyAttempted] = useState(false);

  useEffect(() => {
    if (board?.columns) setColumns(board.columns);
  }, [board]);

  useEffect(() => {
    if (board?.title) setTitleDraft(board.title);
  }, [board?.title]);

  // For encrypted boards, derive the key from a stashed passphrase if present.
  // If no passphrase is stashed, the gate renders below and prompts for it.
  useEffect(() => {
    if (!board) return;
    if (!board.encrypted) {
      setEncryptionKey(null);
      setKeyAttempted(true);
      return;
    }
    setKeyAttempted(false);
    const stored = getStoredPassphrase(board.id);
    if (!stored) {
      setEncryptionKey(null);
      setKeyAttempted(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const key = await deriveKey(stored, board.id);
        if (!cancelled) setEncryptionKey(key);
      } catch {
        if (!cancelled) clearStoredPassphrase(board.id);
      } finally {
        if (!cancelled) setKeyAttempted(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [board]);

  // Real-time: refetch when other users update the board
  useEffect(() => {
    if (!boardId || !user) return;
    const pusher = getPusher();
    const channel = pusher.subscribe(`private-board-${boardId}`);
    const handler = (e: { actor_user_id: string | null }) => {
      if (e.actor_user_id === user.id) return;
      qc.invalidateQueries({ queryKey: ['board', boardId] });
    };
    channel.bind('board.updated', handler);
    return () => {
      channel.unbind('board.updated', handler);
      pusher.unsubscribe(`private-board-${boardId}`);
    };
  }, [boardId, user, qc]);

  const reorderMutation = useMutation({
    mutationFn: async (dto: ReorderDto) =>
      api.post(`/boards/${boardId}/reorder`, dto),
    onError: () => qc.invalidateQueries({ queryKey: ['board', boardId] }),
  });

  const updateBoardMutation = useMutation({
    mutationFn: async (dto: UpdateBoardDto) =>
      (await api.patch<Board>(`/boards/${boardId}`, dto)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', boardId] }),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findColumnByCard = (cardId: string) =>
    columns.find((c) => c.cards.some((card) => card.id === cardId));

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    if (id.startsWith('column-')) {
      const colId = id.slice(7);
      const column = columns.find((c) => c.id === colId);
      if (column) setActive({ type: 'column', column });
    } else if (id.startsWith('card-')) {
      const cardId = id.slice(5);
      const col = findColumnByCard(cardId);
      const card = col?.cards.find((c) => c.id === cardId);
      if (card) setActive({ type: 'card', card });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActive(null);
    const { active: a, over } = event;
    if (!over) return;

    const activeId = String(a.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    if (activeId.startsWith('column-') && overId.startsWith('column-')) {
      const activeColId = activeId.slice(7);
      const overColId = overId.slice(7);
      const oldIdx = columns.findIndex((c) => c.id === activeColId);
      const newIdx = columns.findIndex((c) => c.id === overColId);
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;

      const next = arrayMove(columns, oldIdx, newIdx);
      setColumns(next);

      reorderMutation.mutate({
        columns: next.map((c, i) => ({ id: c.id, position: (i + 1) * 1024 })),
      });
      return;
    }

    if (activeId.startsWith('card-')) {
      const activeCardId = activeId.slice(5);
      const sourceCol = findColumnByCard(activeCardId);
      if (!sourceCol) return;

      let targetColId: string | null = null;
      let targetIndex = 0;

      if (overId.startsWith('column-')) {
        targetColId = overId.slice(7);
        const tc = columns.find((c) => c.id === targetColId);
        targetIndex = tc?.cards.length ?? 0;
      } else if (overId.startsWith('card-')) {
        const overCardId = overId.slice(5);
        const overCol = findColumnByCard(overCardId);
        if (!overCol) return;
        targetColId = overCol.id;
        targetIndex = overCol.cards.findIndex((c) => c.id === overCardId);
      } else {
        return;
      }
      if (!targetColId) return;

      const activeCard = sourceCol.cards.find((c) => c.id === activeCardId);
      if (!activeCard) return;

      const next: Column[] = columns.map((c) => ({ ...c, cards: [...c.cards] }));
      const sourceIdx = next.findIndex((c) => c.id === sourceCol.id);
      const targetIdx = next.findIndex((c) => c.id === targetColId);

      next[sourceIdx].cards = next[sourceIdx].cards.filter((c) => c.id !== activeCardId);
      const movedCard: Card = { ...activeCard, columnId: targetColId };
      next[targetIdx].cards.splice(targetIndex, 0, movedCard);

      setColumns(next);

      const cardUpdates: { id: string; position: number; columnId: string }[] = [];
      for (const col of next) {
        col.cards.forEach((c, i) => {
          cardUpdates.push({ id: c.id, position: (i + 1) * 1024, columnId: col.id });
        });
      }
      reorderMutation.mutate({ cards: cardUpdates });
    }
  };

  const commitTitle = () => {
    if (!board) return;
    const trimmed = titleDraft.trim();
    if (!trimmed) {
      setTitleDraft(board.title);
      return;
    }
    if (trimmed === board.title) return;
    updateBoardMutation.mutate({ title: trimmed });
  };

  const onTitleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      titleRef.current?.blur();
    }
    if (e.key === 'Escape' && board) {
      setTitleDraft(board.title);
      titleRef.current?.blur();
    }
  };

  if (isLoading) {
    return (
      <div className="app">
        <div
          style={{
            display: 'grid',
            placeItems: 'center',
            height: '100vh',
            color: 'white',
            fontWeight: 600,
          }}
        >
          Loading…
        </div>
      </div>
    );
  }
  if (!board) {
    return (
      <div className="app">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            gap: 12,
            color: 'white',
          }}
        >
          <p>Board not found.</p>
          <Link to="/" className="btn-secondary">
            Back to boards
          </Link>
        </div>
      </div>
    );
  }

  const userInitials = user ? initialsFor(user.name) : '?';
  const userColor = user ? colorFor(user.id) : AVATAR_PALETTE[0];

  // Locate the currently-open card from the live columns state so updates re-render.
  const openCardCtx = (() => {
    if (!openCardId) return null;
    for (const col of columns) {
      const found = col.cards.find((c) => c.id === openCardId);
      if (found) return { card: found, column: col };
    }
    return null;
  })();

  const needsPassphrase =
    !!board.encrypted && keyAttempted && !encryptionKey;

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="topbar-logo" style={{ textDecoration: 'none', color: 'white' }}>
          <span className="topbar-logo-mark">K</span>
          <span>Kompflow</span>
        </Link>
        <div className="topbar-divider" />
        <input
          ref={titleRef}
          className="topbar-board-name"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={onTitleKeyDown}
          aria-label="Board title"
          style={{
            background: 'transparent',
            border: 0,
            color: 'white',
            font: 'inherit',
          }}
        />
        <div className="topbar-spacer" />
        <div className="topbar-presence">
          {user && (
            <div
              className="avatar live"
              style={{ background: userColor }}
              title={user.name}
            >
              {userInitials}
            </div>
          )}
        </div>
        <button
          className="topbar-icon-btn"
          aria-label="Board settings"
          title="Board settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </header>

      {!needsPassphrase && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className={'board' + (active ? ' is-dragging' : '')}>
            <SortableContext
              items={columns.map((c) => `column-${c.id}`)}
              strategy={horizontalListSortingStrategy}
            >
              {columns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  boardId={board.id}
                  onOpenCard={setOpenCardId}
                />
              ))}
            </SortableContext>
            <AddColumn boardId={board.id} />
          </div>

          <DragOverlay>
            {active?.type === 'card' ? (
              <KanbanCard card={active.card} boardId={board.id} dragging />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {openCardCtx && !needsPassphrase && (
        <CardModal
          card={openCardCtx.card}
          boardId={board.id}
          columnTitle={openCardCtx.column.title}
          encryptionKey={encryptionKey}
          onClose={() => setOpenCardId(null)}
          onRequestPassphraseReset={() => {
            clearStoredPassphrase(board.id);
            setEncryptionKey(null);
            setKeyAttempted(true);
            setOpenCardId(null);
          }}
        />
      )}

      {needsPassphrase && (
        <PassphraseGate
          boardId={board.id}
          boardTitle={board.title}
          onUnlock={(key) => {
            setEncryptionKey(key);
            setKeyAttempted(true);
          }}
        />
      )}
    </div>
  );
}
