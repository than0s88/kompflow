import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import BoardCard from '../components/BoardCard';
import BoardCreateModal from '../components/BoardCreateModal';
import { useAllBoards } from '../hooks/useAllBoards';
import { api } from '../lib/api';

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading, error } = useAllBoards();
  const [createForWorkspace, setCreateForWorkspace] = useState<string | null>(
    null,
  );
  const qc = useQueryClient();

  const deleteBoard = useMutation({
    mutationFn: async (id: string) => api.delete(`/boards/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['boards'] });
    },
  });

  if (isLoading) {
    return (
      <div className="kf-page">
        <header className="kf-page__head">
          <h1>Boards</h1>
        </header>
        <div className="kf-board-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="kf-board-card kf-board-card--skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="kf-page">
        <header className="kf-page__head">
          <h1>Boards</h1>
        </header>
        <p className="kf-error">Couldn't load your boards. Try refreshing.</p>
      </div>
    );
  }

  const workspaces = data ?? [];
  const totalBoards = workspaces.reduce(
    (sum, ws) => sum + (ws.boards?.length ?? 0),
    0,
  );

  return (
    <div className="kf-page">
      <header className="kf-page__head">
        <div>
          <h1>{user ? `Hi ${user.name.split(' ')[0]}` : 'Boards'} 👋</h1>
          <p className="kf-page__sub">
            {totalBoards === 0
              ? 'No boards yet — start by creating one in any workspace.'
              : `You have ${totalBoards} board${totalBoards === 1 ? '' : 's'} across ${workspaces.length} workspace${workspaces.length === 1 ? '' : 's'}.`}
          </p>
        </div>
      </header>

      {workspaces.length === 0 ? (
        <div className="kf-empty">
          <p>No workspaces yet.</p>
          <p className="kf-empty__hint">
            Use the “Create workspace” button in the sidebar to get started.
          </p>
        </div>
      ) : (
        workspaces.map((ws) => (
          <section key={ws.id} className="kf-page__section">
            <header className="kf-page__section-head">
              <Link to={`/workspaces/${ws.id}`} className="kf-page__section-title">
                <span className="kf-icon" aria-hidden>
                  {ws.visibility === 'private' ? '🔒' : '🌐'}
                </span>
                {ws.name}
              </Link>
              <button
                type="button"
                onClick={() => setCreateForWorkspace(ws.id)}
                className="kf-btn kf-btn--ghost"
              >
                + New board
              </button>
            </header>
            {(ws.boards ?? []).length === 0 ? (
              <p className="kf-empty kf-empty--inline">
                No boards in this workspace yet.
              </p>
            ) : (
              <div className="kf-board-grid">
                {(ws.boards ?? []).map((b) => (
                  <BoardCard
                    key={b.id}
                    board={b}
                    onDelete={(id) => deleteBoard.mutate(id)}
                  />
                ))}
              </div>
            )}
          </section>
        ))
      )}

      {createForWorkspace ? (
        <BoardCreateModal
          workspaceId={createForWorkspace}
          onClose={() => setCreateForWorkspace(null)}
        />
      ) : null}
    </div>
  );
}
