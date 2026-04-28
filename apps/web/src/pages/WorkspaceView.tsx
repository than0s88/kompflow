import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import BoardCard from '../components/BoardCard';
import BoardCreateModal from '../components/BoardCreateModal';
import MembersPanel from '../components/workspace/MembersPanel';
import { useWorkspace } from '../hooks/useWorkspaces';
import { api } from '../lib/api';

export default function WorkspaceView() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: workspace, isLoading, error } = useWorkspace(workspaceId);
  const [creating, setCreating] = useState(false);
  const qc = useQueryClient();

  const deleteBoard = useMutation({
    mutationFn: async (id: string) => api.delete(`/boards/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['workspace', workspaceId] });
      void qc.invalidateQueries({ queryKey: ['boards'] });
    },
  });

  if (isLoading) {
    return (
      <div className="kf-page">
        <header className="kf-page__head">
          <h1>Loading workspace…</h1>
        </header>
        <div className="kf-board-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="kf-board-card kf-board-card--skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="kf-page">
        <p className="kf-error">Couldn't load this workspace.</p>
      </div>
    );
  }

  const boards = workspace.boards ?? [];
  const memberCount = workspace.members?.length ?? 1;

  return (
    <div className="kf-page">
      <header className="kf-page__head">
        <div>
          <h1>
            <span className="kf-icon" aria-hidden>
              👥
            </span>{' '}
            {workspace.name}
          </h1>
          <p className="kf-page__sub">
            {memberCount} {memberCount === 1 ? 'member' : 'members'} ·{' '}
            <Link
              to={`/workspaces/${workspace.id}/activity`}
              className="kf-link"
            >
              View activity
            </Link>
          </p>
        </div>
        <button
          type="button"
          className="kf-btn kf-btn--primary"
          onClick={() => setCreating(true)}
        >
          + New board
        </button>
      </header>

      {boards.length === 0 ? (
        <div className="kf-empty">
          <p>No boards yet.</p>
          <p className="kf-empty__hint">
            Click <strong>+ New board</strong> to start your first one.
          </p>
        </div>
      ) : (
        <div className="kf-board-grid">
          {boards.map((b) => (
            <BoardCard
              key={b.id}
              board={b}
              onDelete={(id) => deleteBoard.mutate(id)}
            />
          ))}
        </div>
      )}

      <MembersPanel workspace={workspace} />

      {creating ? (
        <BoardCreateModal
          workspaceId={workspace.id}
          onClose={() => setCreating(false)}
        />
      ) : null}
    </div>
  );
}
