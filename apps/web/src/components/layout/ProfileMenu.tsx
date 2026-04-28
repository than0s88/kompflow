import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';

export default function ProfileMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div ref={wrapRef} className="kf-profile">
      <button
        type="button"
        className={'kf-profile__btn' + (open ? ' is-active' : '')}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={user.name}
      >
        <span className="kf-avatar" aria-hidden>
          {initials}
        </span>
      </button>
      {open ? (
        <div role="menu" className="kf-profile__menu">
          <div className="kf-profile__meta">
            <div className="kf-profile__name">{user.name}</div>
            <div className="kf-profile__email">{user.email}</div>
          </div>
          <button
            type="button"
            role="menuitem"
            className="kf-profile__item"
            onClick={() => {
              setOpen(false);
              void logout();
            }}
          >
            <span aria-hidden>↪</span> Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
