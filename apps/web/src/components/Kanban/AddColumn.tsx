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
  boardId: string;
}

export default function AddColumn({ boardId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const create = useMutation({
    mutationFn: async (t: string) =>
      (await api.post(`/boards/${boardId}/columns`, { title: t })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', boardId] }),
  });

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    create.mutate(trimmed, {
      onSuccess: () => {
        setTitle('');
        setOpen(false);
      },
    });
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
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
        className="lane-new"
        onClick={() => setOpen(true)}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add another list
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="lane-composer">
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Enter list title…"
      />
      <div className="lane-composer-actions">
        <button
          type="submit"
          disabled={create.isPending}
          className="btn-primary"
          style={{ padding: '7px 14px', fontSize: 13 }}
        >
          Add list
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            setTitle('');
            setOpen(false);
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
