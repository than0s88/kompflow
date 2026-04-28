import type { Workspace, WorkspaceMember } from '@kanban/shared';
import { useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/AuthContext';
import {
  useInviteMember,
  useRemoveMember,
  useRevokeInvitation,
  useWorkspaceInvitations,
} from '../../hooks/useInvitations';
import { useToast } from '../toast/ToastProvider';

interface Props {
  workspace: Workspace;
}

const ROLE_OPTIONS: ReadonlyArray<{ value: 'member' | 'admin'; label: string }> = [
  { value: 'member', label: 'Member' },
  { value: 'admin', label: 'Admin' },
];

export default function MembersPanel({ workspace }: Props) {
  const { user } = useAuth();
  const { push } = useToast();
  const { data: invitations = [] } = useWorkspaceInvitations(workspace.id);
  const invite = useInviteMember(workspace.id);
  const revoke = useRevokeInvitation(workspace.id);
  const remove = useRemoveMember(workspace.id);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [error, setError] = useState<string | null>(null);

  const members = workspace.members ?? [];
  const isAdmin = useMemo(
    () => isWorkspaceAdmin(workspace, user?.id),
    [workspace, user?.id],
  );

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) return;
    try {
      const result = await invite.mutateAsync({ email: trimmed, role });
      setEmail('');
      setRole('member');
      if (result.mailDelivered) {
        push({
          variant: 'success',
          title: 'Invitation sent',
          body: `${trimmed} will get an email shortly.`,
        });
      } else {
        push({
          variant: 'info',
          title: 'Invitation created',
          body: 'SMTP failed — copy the link from the pending list to share manually.',
          durationMs: 8000,
        });
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Failed to send invitation';
      setError(typeof msg === 'string' ? msg : 'Failed to send invitation');
    }
  };

  const handleRevoke = (id: string, target: string) => {
    revoke.mutate(id, {
      onSuccess: () =>
        push({
          variant: 'info',
          title: 'Invitation revoked',
          body: target,
        }),
      onError: () =>
        push({
          variant: 'error',
          title: 'Could not revoke invitation',
        }),
    });
  };

  return (
    <section className="kf-page__section kf-members">
      <div className="kf-page__section-head">
        <h2 className="kf-page__section-title">Members</h2>
      </div>

      <ul className="kf-members__list">
        {members.map((m) => {
          const isOwner = m.userId === workspace.ownerId;
          const isYou = m.userId === user?.id;
          // Admins can remove anyone except the owner. Anyone (incl.
          // non-admins) can remove themselves to leave the workspace.
          const canRemove = !isOwner && (isAdmin || isYou);
          const onRemove = canRemove
            ? () => {
                const confirmMsg = isYou
                  ? `Leave "${workspace.name}"? You'll lose access to its boards.`
                  : `Remove ${m.user?.name ?? 'this member'} from "${workspace.name}"?`;
                if (!window.confirm(confirmMsg)) return;
                remove.mutate(m.userId, {
                  onSuccess: () =>
                    push({
                      variant: 'success',
                      title: isYou ? 'Left workspace' : 'Member removed',
                      body: isYou ? workspace.name : (m.user?.name ?? ''),
                    }),
                  onError: (err: unknown) => {
                    const msg =
                      (err as { response?: { data?: { message?: string } } })
                        ?.response?.data?.message ?? 'Could not remove member';
                    push({ variant: 'error', title: msg });
                  },
                });
              }
            : undefined;
          return (
            <MemberRow
              key={m.id}
              member={m}
              isOwner={isOwner}
              isYou={isYou}
              onRemove={onRemove}
              removeLabel={isYou ? 'Leave' : 'Remove'}
              removing={remove.isPending}
            />
          );
        })}
      </ul>

      {isAdmin ? (
        <>
          <form className="kf-invite-form" onSubmit={handleInvite}>
            <div className="kf-invite-form__row">
              <input
                type="email"
                className="kf-input"
                placeholder="teammate@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                aria-label="Email to invite"
              />
              <select
                className="kf-input kf-invite-form__role"
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as 'admin' | 'member')
                }
                aria-label="Role"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="kf-btn kf-btn--primary"
                disabled={invite.isPending}
              >
                {invite.isPending ? 'Sending…' : 'Invite'}
              </button>
            </div>
            {error ? <p className="kf-invite-form__error">{error}</p> : null}
          </form>

          {invitations.length > 0 ? (
            <div className="kf-invites">
              <div className="kf-invites__title">Pending invitations</div>
              <ul className="kf-invites__list">
                {invitations.map((inv) => (
                  <li key={inv.id} className="kf-invites__row">
                    <div className="kf-invites__email">{inv.email}</div>
                    <span className="kf-invites__role">{inv.role}</span>
                    <button
                      type="button"
                      className="kf-btn kf-btn--ghost kf-btn--sm"
                      onClick={() => handleRevoke(inv.id, inv.email)}
                      disabled={revoke.isPending}
                    >
                      Revoke
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <p className="kf-empty__hint">Only workspace admins can invite members.</p>
      )}
    </section>
  );
}

function MemberRow({
  member,
  isOwner,
  isYou,
  onRemove,
  removeLabel,
  removing,
}: {
  member: WorkspaceMember;
  isOwner: boolean;
  isYou: boolean;
  onRemove?: () => void;
  removeLabel: string;
  removing: boolean;
}) {
  const name = member.user?.name ?? 'Unknown user';
  const email = member.user?.email ?? '';
  const roleLabel = isOwner ? 'owner' : member.role;
  return (
    <li className="kf-members__row">
      <div className="kf-members__avatar" aria-hidden>
        {initials(name)}
      </div>
      <div className="kf-members__name">
        {name}
        {isYou ? <span className="kf-members__you"> (you)</span> : null}
        <div className="kf-members__email">{email}</div>
      </div>
      <span className={`kf-members__role kf-members__role--${roleLabel}`}>
        {roleLabel}
      </span>
      {onRemove ? (
        <button
          type="button"
          className="kf-btn kf-btn--ghost kf-btn--sm kf-members__remove"
          onClick={onRemove}
          disabled={removing}
          aria-label={`${removeLabel} ${name}`}
        >
          {removeLabel}
        </button>
      ) : (
        // Keeps grid columns aligned with rows that DO show a button.
        <span className="kf-members__remove-spacer" aria-hidden />
      )}
    </li>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function isWorkspaceAdmin(
  workspace: Workspace,
  userId: string | undefined,
): boolean {
  if (!userId) return false;
  if (workspace.ownerId === userId) return true;
  const me = workspace.members?.find((m) => m.userId === userId);
  return me?.role === 'admin';
}
