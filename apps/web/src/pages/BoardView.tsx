import type {
  ActivityRecord,
  Board,
  Card,
  Column,
  ReorderDto,
  UpdateBoardDto,
} from '@kanban/shared';
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
import { useAuth } from '../auth/AuthContext';
import ActivityFeed from '../components/activity/ActivityFeed';
import AddColumn from '../components/Kanban/AddColumn';
import KanbanCard from '../components/Kanban/Card';
import CardModal from '../components/Kanban/CardModal';
import KanbanColumn from '../components/Kanban/Column';
import { api } from '../lib/api';
import { getPusher } from '../lib/pusher';

type ActiveItem =
  | { type: 'column'; column: Column }
  | { type: 'card'; card: Card }
  | null;

export default function BoardView() {
  const { boardId } = useParams<{ boardId: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: board, isLoading } = useQuery({
    queryKey: ['board', boardId],
    queryFn: async () => (await api.get<Board>(`/boards/${boardId}`)).data,
    enabled: Boolean(boardId),
  });

  const [columns, setColumns] = useState<Column[]>([]);
  const [active, setActive] = useState<ActiveItem>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);

  useEffect(() => {
    if (board?.columns) setColumns(board.columns);
  }, [board]);

  useEffect(() => {
    if (board?.title) setTitleDraft(board.title);
  }, [board?.title]);

  // Real-time: refetch the board whenever another user moves/edits/creates
  // anything on it. We listen to two events on `private-board-{id}`:
  //  • `board.updated` — explicit board-level updates (title, settings)
  //  • `activity.created` — every card/column/board mutation logs an activity,
  //    so this is our universal "the board changed" signal.
  // Both handlers suppress events whose actor is the current user (their UI
  // already reflects the change via optimistic update / mutation onSuccess).
  useEffect(() => {
    if (!boardId || !user) return;
    let pusher;
    try {
      pusher = getPusher();
    } catch {
      return;
    }
    const channelName = `private-board-${boardId}`;
    const channel = pusher.subscribe(channelName);

    const refetchBoard = () => {
      void qc.invalidateQueries({ queryKey: ['board', boardId] });
    };

    const onBoardUpdated = (e: {
      actor_user_id?: string | null;
      actorUserId?: string | null;
    }) => {
      const actor = e.actor_user_id ?? e.actorUserId ?? null;
      if (actor === user.id) return;
      refetchBoard();
    };

    const onActivity = (record: ActivityRecord) => {
      if (record.actorId === user.id) return;
      const refetchEntities: ReadonlyArray<ActivityRecord['entityType']> = [
        'card',
        'column',
        'board',
      ];
      if (!refetchEntities.includes(record.entityType)) return;
      refetchBoard();
    };

    channel.bind('board.updated', onBoardUpdated);
    channel.bind('activity.created', onActivity);
    return () => {
      channel.unbind('board.updated', onBoardUpdated);
      channel.unbind('activity.created', onActivity);
      pusher.unsubscribe(channelName);
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
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
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

      const next: Column[] = columns.map((c) => ({
        ...c,
        cards: [...c.cards],
      }));
      const sourceIdx = next.findIndex((c) => c.id === sourceCol.id);
      const targetIdx = next.findIndex((c) => c.id === targetColId);

      next[sourceIdx].cards = next[sourceIdx].cards.filter(
        (c) => c.id !== activeCardId,
      );
      const movedCard: Card = { ...activeCard, columnId: targetColId };
      next[targetIdx].cards.splice(targetIndex, 0, movedCard);

      setColumns(next);

      const cardUpdates: { id: string; position: number; columnId: string }[] =
        [];
      for (const col of next) {
        col.cards.forEach((c, i) => {
          cardUpdates.push({
            id: c.id,
            position: (i + 1) * 1024,
            columnId: col.id,
          });
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
      <div className="kf-board-page">
        <div className="kf-board-page__loading">Loading board…</div>
      </div>
    );
  }
  if (!board) {
    return (
      <div className="kf-board-page">
        <div className="kf-board-page__missing">
          <p>Board not found.</p>
          <Link to="/dashboard" className="kf-btn kf-btn--ghost">
            Back to boards
          </Link>
        </div>
      </div>
    );
  }

  // Locate the currently-open card so updates re-render.
  const openCardCtx = (() => {
    if (!openCardId) return null;
    for (const col of columns) {
      const found = col.cards.find((c) => c.id === openCardId);
      if (found) return { card: found, column: col };
    }
    return null;
  })();

  return (
    <div className="kf-board-page">
      <header className="kf-board-page__head">
        <input
          ref={titleRef}
          className="kf-board-page__title"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={onTitleKeyDown}
          aria-label="Board title"
        />
        <div className="kf-board-page__actions">
          <button
            type="button"
            className={
              'kf-btn kf-btn--ghost' + (activityOpen ? ' is-active' : '')
            }
            onClick={() => setActivityOpen((v) => !v)}
            aria-expanded={activityOpen}
            aria-controls="kf-board-activity"
          >
            🕒 Activity
          </button>
        </div>
      </header>

      <div className="kf-board-page__body">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          /* Cancel handlers prevent a stuck active card (Esc, escape-key,
             drop outside any droppable). Without these, the DragOverlay
             keeps rendering a floating clone of the card. */
          onDragCancel={() => setActive(null)}
          onDragAbort={() => setActive(null)}
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

        {activityOpen ? (
          <aside
            id="kf-board-activity"
            className="kf-board-page__activity"
            aria-label="Board activity"
          >
            <header className="kf-board-page__activity-head">
              <h2>Activity</h2>
              <button
                type="button"
                className="kf-board-page__activity-close"
                onClick={() => setActivityOpen(false)}
                aria-label="Close activity"
              >
                ×
              </button>
            </header>
            <ActivityFeed scope="board" id={boardId} />
          </aside>
        ) : null}
      </div>

      {openCardCtx ? (
        <CardModal
          card={openCardCtx.card}
          boardId={board.id}
          workspaceId={board.workspaceId}
          columnTitle={openCardCtx.column.title}
          encryptionKey={null}
          onClose={() => setOpenCardId(null)}
          onRequestPassphraseReset={() => setOpenCardId(null)}
        />
      ) : null}
    </div>
  );
}
