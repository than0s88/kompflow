import type { Workspace } from '@kanban/shared';
import { useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useCreateWorkspace } from '../../hooks/useWorkspaces';

interface Props {
  onClose: () => void;
  onCreated?: (workspace: Workspace) => void;
}

export default function WorkspaceCreateModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const create = useCreateWorkspace();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const ws = await create.mutateAsync({ name: name.trim() });
    onCreated?.(ws);
    navigate(`/workspaces/${ws.id}`);
    onClose();
  }

  return createPortal(
    <div
      className="kf-modal__backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kf-create-ws-title"
      onClick={onClose}
    >
      <div className="kf-modal" onClick={(e) => e.stopPropagation()}>
        <header className="kf-modal__header">
          <h2 id="kf-create-ws-title">Create a workspace</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="kf-modal__close"
          >
            ×
          </button>
        </header>

        <form className="kf-modal__body" onSubmit={handleSubmit}>
          <label className="kf-field">
            <span className="kf-field__label">Workspace name</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Marketing Team"
              maxLength={80}
              className="kf-input"
              required
            />
          </label>
          <p className="kf-field__hint">
            You can invite teammates after creating the workspace.
          </p>

          {create.error ? (
            <p className="kf-modal__error" role="alert">
              {(create.error as Error).message ||
                'Could not create workspace.'}
            </p>
          ) : null}

          <footer className="kf-modal__footer">
            <button
              type="button"
              onClick={onClose}
              className="kf-btn kf-btn--ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="kf-btn kf-btn--primary"
              disabled={create.isPending || !name.trim()}
            >
              {create.isPending ? 'Creating…' : 'Create workspace'}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  );
}
