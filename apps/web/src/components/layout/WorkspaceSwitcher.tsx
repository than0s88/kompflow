import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { WorkspaceListItem } from '../../hooks/useWorkspaces';

interface Props {
  workspaces: WorkspaceListItem[];
  activeId: string | null;
  onChange: (id: string) => void;
  onCreate: () => void;
}

export default function WorkspaceSwitcher({
  workspaces,
  activeId,
  onChange,
  onCreate,
}: Props) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const active = workspaces.find((w) => w.id === activeId) ?? null;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escHandler);
    };
  }, [open]);

  return (
    <div className="kf-wsswitch" ref={ref}>
      <button
        type="button"
        className="kf-wsswitch__btn"
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="kf-wsswitch__icon" aria-hidden>
          {active?.visibility === 'private' ? '🔒' : '🌐'}
        </span>
        <span className="kf-wsswitch__name">
          {active?.name ?? 'Choose a workspace'}
        </span>
        <span className="kf-wsswitch__chevron" aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <div className="kf-wsswitch__menu" role="menu">
          {workspaces.length === 0 ? (
            <div className="kf-wsswitch__empty">No workspaces yet.</div>
          ) : (
            <ul className="kf-wsswitch__list">
              {workspaces.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    className={
                      'kf-wsswitch__item' +
                      (w.id === activeId ? ' is-active' : '')
                    }
                    role="menuitem"
                    onClick={() => {
                      onChange(w.id);
                      navigate(`/workspaces/${w.id}`);
                      setOpen(false);
                    }}
                  >
                    <span className="kf-wsswitch__icon" aria-hidden>
                      {w.visibility === 'private' ? '🔒' : '🌐'}
                    </span>
                    <span className="kf-wsswitch__name">{w.name}</span>
                    <span className="kf-wsswitch__count">
                      {w._count?.boards ?? 0}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            className="kf-wsswitch__create"
            onClick={() => {
              setOpen(false);
              onCreate();
            }}
          >
            <span aria-hidden>＋</span> Create workspace
          </button>
        </div>
      ) : null}
    </div>
  );
}
