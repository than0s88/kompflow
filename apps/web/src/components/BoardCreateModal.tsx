import type { Board, CreateBoardDto } from '@kanban/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface Props {
  workspaceId: string;
  onClose: () => void;
}

export default function BoardCreateModal({ workspaceId, onClose }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const create = useMutation({
    mutationFn: async (dto: CreateBoardDto) => {
      const { data } = await api.post<Board>('/boards', dto);
      return data;
    },
    onSuccess: (board) => {
      void qc.invalidateQueries({ queryKey: ['boards'] });
      void qc.invalidateQueries({ queryKey: ['workspace', workspaceId] });
      onClose();
      navigate(`/boards/${board.id}`);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    create.mutate({
      workspaceId,
      title: title.trim(),
      description: description.trim() || undefined,
    });
  }

  return createPortal(
    <div
      className="kf-modal__backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kf-create-board-title"
      onClick={onClose}
    >
      <div className="kf-modal" onClick={(e) => e.stopPropagation()}>
        <header className="kf-modal__header">
          <h2 id="kf-create-board-title">Create a board</h2>
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
            <span className="kf-field__label">Board title</span>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Roadmap Q3"
              maxLength={120}
              className="kf-input"
              required
            />
          </label>
          <label className="kf-field">
            <span className="kf-field__label">Description (optional)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this board for?"
              maxLength={2000}
              className="kf-input"
              rows={3}
            />
          </label>

          {create.error ? (
            <p className="kf-modal__error" role="alert">
              {(create.error as Error).message || 'Could not create board.'}
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
              disabled={create.isPending || !title.trim()}
            >
              {create.isPending ? 'Creating…' : 'Create board'}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  );
}
