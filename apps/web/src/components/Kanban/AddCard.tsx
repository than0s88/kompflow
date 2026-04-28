import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { api } from '../../lib/api';
import '../../styles/app.css';

interface Props {
  columnId: string;
  boardId: string;
}

export default function AddCard({ columnId, boardId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);

  const create = useMutation({
    mutationFn: async (t: string) =>
      (await api.post(`/columns/${columnId}/cards`, { title: t })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', boardId] }),
  });

  useEffect(() => {
    if (open) taRef.current?.focus();
  }, [open]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setOpen(false);
      return;
    }
    create.mutate(trimmed, {
      onSuccess: () => {
        setTitle('');
        // Stay open for rapid card entry, matching the design's pattern.
      },
    });
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
    if (e.key === 'Escape') {
      setTitle('');
      setOpen(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lane-add"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add a card
      </button>
    );
  }

  return (
    <div style={{ padding: '0 8px 8px' }}>
      <form onSubmit={submit} className="card-composer">
        <textarea
          ref={taRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Enter a title for this card…"
        />
        <div className="card-composer-actions">
          <button
            type="submit"
            disabled={create.isPending}
            className="btn-primary"
            style={{ padding: '7px 14px', fontSize: 13 }}
          >
            Add card
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setTitle('');
              setOpen(false);
            }}
            aria-label="Cancel"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
