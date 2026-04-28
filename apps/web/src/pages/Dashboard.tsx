import type { Board, CreateBoardDto } from '@kanban/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../lib/api';
import '../styles/app.css';

interface BoardListResponse {
  owned: Board[];
  shared: Board[];
}

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

export default function Dashboard() {
  const { user, logout } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['boards'],
    queryFn: async () => (await api.get<BoardListResponse>('/boards')).data,
  });

  const createMutation = useMutation({
    mutationFn: async (dto: CreateBoardDto) => (await api.post<Board>('/boards', dto)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boards'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/boards/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boards'] }),
  });

  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createMutation.mutate(
      { title: title.trim() },
      {
        onSuccess: () => {
          setTitle('');
          setCreating(false);
        },
      },
    );
  };

  const userInitials = user ? initialsFor(user.name) : '?';
  const userColor = user ? colorFor(user.id) : AVATAR_PALETTE[0];

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-logo">
          <span className="topbar-logo-mark">K</span>
          <span>Kompflow</span>
        </div>
        <div className="topbar-divider" />
        <span style={{ fontWeight: 600, fontSize: 14, opacity: 0.92 }}>
          {user?.name ?? 'Boards'}
        </span>
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
          onClick={() => void logout()}
          className="topbar-icon-btn"
          aria-label="Sign out"
          title="Sign out"
          style={{ width: 'auto', padding: '0 12px', fontSize: 13, fontWeight: 600 }}
        >
          Sign out
        </button>
      </header>

      <main
        style={{
          overflowY: 'auto',
          padding: '28px 24px 40px',
          color: 'white',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <section style={{ marginBottom: 36 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 18,
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: '-0.01em',
                  margin: 0,
                  color: 'white',
                }}
              >
                Your boards
              </h2>
              <button
                onClick={() => setCreating((c) => !c)}
                className="btn-primary"
                style={{ background: 'white', color: 'var(--accent)' }}
              >
                {creating ? 'Cancel' : '+ New board'}
              </button>
            </div>

            {creating && (
              <form
                onSubmit={submit}
                style={{
                  marginBottom: 18,
                  display: 'flex',
                  gap: 8,
                  background: 'var(--bg-app)',
                  padding: 12,
                  borderRadius: 'var(--r-lane)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Board title"
                  className="auth-input"
                  style={{ flex: 1 }}
                />
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-primary"
                >
                  Create
                </button>
              </form>
            )}

            {isLoading ? (
              <p style={{ opacity: 0.85 }}>Loading…</p>
            ) : data?.owned.length === 0 ? (
              <div className="board-empty" style={{ margin: '24px 0' }}>
                <h3>No boards yet</h3>
                <p>Click "+ New board" to start your first board.</p>
              </div>
            ) : (
              <BoardGrid
                boards={data?.owned ?? []}
                onDelete={(id) => {
                  if (confirm('Delete this board?')) deleteMutation.mutate(id);
                }}
              />
            )}
          </section>

          {data && data.shared.length > 0 && (
            <section>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  margin: '0 0 14px',
                  color: 'white',
                }}
              >
                Shared with you
              </h2>
              <BoardGrid boards={data.shared} />
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function BoardGrid({
  boards,
  onDelete,
}: {
  boards: Board[];
  onDelete?: (id: string) => void;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 14,
      }}
    >
      {boards.map((board) => (
        <BoardTile key={board.id} board={board} onDelete={onDelete} />
      ))}
    </div>
  );
}

function BoardTile({
  board,
  onDelete,
}: {
  board: Board;
  onDelete?: (id: string) => void;
}) {
  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--bg-app)',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--r-lane)',
        boxShadow: 'var(--shadow-card)',
        transition: 'box-shadow var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-card)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <Link
        to={`/boards/${board.id}`}
        style={{
          display: 'block',
          padding: '16px 18px',
          textDecoration: 'none',
          color: 'var(--fg-1)',
        }}
      >
        <div
          style={{
            height: 6,
            borderRadius: 6,
            background: `linear-gradient(90deg, ${colorFor(board.id)}, var(--accent))`,
            marginBottom: 12,
          }}
        />
        <h3
          style={{
            fontSize: 15,
            fontWeight: 700,
            margin: '0 0 6px',
            color: 'var(--fg-1)',
            letterSpacing: '-0.01em',
          }}
        >
          {board.title}
        </h3>
        {board.description && (
          <p
            style={{
              fontSize: 13,
              color: 'var(--fg-3)',
              margin: 0,
              lineHeight: 1.45,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {board.description}
          </p>
        )}
      </Link>
      {onDelete && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(board.id);
          }}
          aria-label="Delete board"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 26,
            height: 26,
            borderRadius: 6,
            display: 'grid',
            placeItems: 'center',
            color: 'var(--fg-3)',
            background: 'transparent',
            transition: 'background var(--dur-fast), color var(--dur-fast)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#FFEBE6';
            e.currentTarget.style.color = '#C9372C';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--fg-3)';
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
