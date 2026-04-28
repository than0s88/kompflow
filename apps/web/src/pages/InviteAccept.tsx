import type { InvitationPreview } from '@kanban/shared';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../lib/api';

type Status =
  | { kind: 'loading' }
  | { kind: 'preview'; preview: InvitationPreview }
  | { kind: 'accepting' }
  | { kind: 'accepted'; workspaceId: string }
  | { kind: 'error'; message: string };

export default function InviteAccept() {
  const { token } = useParams<{ token: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>({ kind: 'loading' });

  useEffect(() => {
    if (!token) {
      setStatus({ kind: 'error', message: 'Missing invitation token' });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<InvitationPreview>(
          `/invitations/preview/${token}`,
        );
        if (!cancelled) setStatus({ kind: 'preview', preview: data });
      } catch (err: unknown) {
        if (cancelled) return;
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? 'Invitation could not be loaded';
        setStatus({ kind: 'error', message: msg });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Once we have user + a valid pending preview, accept automatically.
  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (status.kind !== 'preview') return;
    if (status.preview.status !== 'pending') return;
    if (status.preview.email.toLowerCase() !== user.email.toLowerCase()) return;
    void acceptNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, status]);

  const acceptNow = async () => {
    if (!token) return;
    setStatus({ kind: 'accepting' });
    try {
      const { data } = await api.post<{ workspaceId: string }>(
        '/invitations/accept',
        { token },
      );
      setStatus({ kind: 'accepted', workspaceId: data.workspaceId });
      navigate(`/workspaces/${data.workspaceId}`, { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Could not accept invitation';
      setStatus({ kind: 'error', message: msg });
    }
  };

  if (status.kind === 'loading' || loading) {
    return (
      <div className="kf-invite-page">
        <div className="kf-invite-card">
          <p>Loading invitation…</p>
        </div>
      </div>
    );
  }

  if (status.kind === 'error') {
    return (
      <div className="kf-invite-page">
        <div className="kf-invite-card">
          <h1>Invitation unavailable</h1>
          <p className="kf-invite-card__sub">{status.message}</p>
          <Link to="/" className="kf-btn kf-btn--primary">
            Back home
          </Link>
        </div>
      </div>
    );
  }

  if (status.kind === 'accepting' || status.kind === 'accepted') {
    return (
      <div className="kf-invite-page">
        <div className="kf-invite-card">
          <p>Joining workspace…</p>
        </div>
      </div>
    );
  }

  const { preview } = status;

  if (preview.status === 'expired') {
    return (
      <div className="kf-invite-page">
        <div className="kf-invite-card">
          <h1>This invitation has expired</h1>
          <p className="kf-invite-card__sub">
            Ask {preview.inviterName} to send you a fresh invite.
          </p>
        </div>
      </div>
    );
  }
  if (preview.status === 'revoked') {
    return (
      <div className="kf-invite-page">
        <div className="kf-invite-card">
          <h1>This invitation was revoked</h1>
          <p className="kf-invite-card__sub">
            Reach out to {preview.inviterName} if you still need access.
          </p>
        </div>
      </div>
    );
  }
  if (preview.status === 'accepted') {
    return (
      <div className="kf-invite-page">
        <div className="kf-invite-card">
          <h1>Already accepted</h1>
          <Link
            to={user ? '/dashboard' : '/login'}
            className="kf-btn kf-btn--primary"
          >
            {user ? 'Open Kompflow' : 'Sign in'}
          </Link>
        </div>
      </div>
    );
  }

  // Pending. Either prompt for sign-in/sign-up or accept-on-load (handled above).
  if (!user) {
    return (
      <div className="kf-invite-page">
        <div className="kf-invite-card">
          <div className="kf-invite-card__eyebrow">Workspace invitation</div>
          <h1>
            Join <strong>{preview.workspaceName}</strong>
          </h1>
          <p className="kf-invite-card__sub">
            <strong>{preview.inviterName}</strong> invited{' '}
            <span className="kf-invite-card__email">{preview.email}</span> as{' '}
            <em>{preview.role}</em>.
          </p>
          <div className="kf-invite-card__actions">
            <Link
              to={`/register?invite=${encodeURIComponent(token ?? '')}&email=${encodeURIComponent(preview.email)}`}
              className="kf-btn kf-btn--primary"
            >
              Create account
            </Link>
            <Link
              to={`/login?invite=${encodeURIComponent(token ?? '')}`}
              className="kf-btn kf-btn--ghost"
            >
              I already have one
            </Link>
          </div>
          <p className="kf-invite-card__hint">
            Your account email must match {preview.email} to accept.
          </p>
        </div>
      </div>
    );
  }

  // Logged in but email mismatch — block accept.
  if (preview.email.toLowerCase() !== user.email.toLowerCase()) {
    return (
      <div className="kf-invite-page">
        <div className="kf-invite-card">
          <h1>Wrong account</h1>
          <p className="kf-invite-card__sub">
            This invitation was sent to <strong>{preview.email}</strong> but
            you're signed in as <strong>{user.email}</strong>. Sign out and
            sign in with the matching account, or ask {preview.inviterName}{' '}
            to re-invite the right address.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="kf-invite-page">
      <div className="kf-invite-card">
        <p>Joining workspace…</p>
      </div>
    </div>
  );
}
