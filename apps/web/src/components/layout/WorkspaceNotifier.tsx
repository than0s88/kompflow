import type { ActivityRecord } from '@kanban/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useWorkspaces } from '../../hooks/useWorkspaces';
import { getPusher } from '../../lib/pusher';
import { useToast, type ToastVariant } from '../toast/ToastProvider';

/**
 * Subscribes to every workspace the current user belongs to and:
 *   1. surfaces a toast whenever someone *else* triggers an activity, and
 *   2. invalidates the relevant TanStack Query caches so any open view
 *      (Dashboard, Sidebar, WorkspaceView, BoardView, MembersPanel)
 *      re-fetches and reflects the change.
 *
 * Mounted once at the AppShell level so notifications and data sync
 * follow the user across every page in the authenticated experience.
 */
export default function WorkspaceNotifier() {
  const { user } = useAuth();
  const { data: workspaces } = useWorkspaces();
  const { push } = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user || !workspaces || workspaces.length === 0) return;

    let pusher: ReturnType<typeof getPusher>;
    try {
      pusher = getPusher();
    } catch {
      return; // Pusher not configured.
    }

    const subscriptions = workspaces.map((ws) => {
      const channelName = `private-workspace-${ws.id}`;
      const channel = pusher.subscribe(channelName);

      const handler = (record: ActivityRecord) => {
        const isSelf = record.actorId === user.id;

        // Always invalidate caches so the data syncs across tabs/users —
        // even for self-actor events (e.g., a board create from another tab).
        invalidateForActivity(qc, record);

        if (isSelf) return;
        const { title, body, variant } = formatActivityToast(record);
        push({ title, body, variant });
      };

      channel.bind('activity.created', handler);
      return { channelName, handler };
    });

    return () => {
      subscriptions.forEach(({ channelName, handler }) => {
        const channel = pusher.channel(channelName);
        if (channel) channel.unbind('activity.created', handler);
        pusher.unsubscribe(channelName);
      });
    };
  }, [user, workspaces, push, qc]);

  return null;
}

function invalidateForActivity(
  qc: ReturnType<typeof useQueryClient>,
  record: ActivityRecord,
): void {
  const { workspaceId, boardId, entityType } = record;

  // Anything that touches a board or its contents → refresh open BoardView.
  if (boardId && (entityType === 'card' || entityType === 'column' || entityType === 'board')) {
    void qc.invalidateQueries({ queryKey: ['board', boardId] });
  }

  // Board create/delete/transfer → workspace boards list + global "all boards".
  if (entityType === 'board') {
    void qc.invalidateQueries({ queryKey: ['workspace', workspaceId] });
    void qc.invalidateQueries({ queryKey: ['workspaces'] });
    void qc.invalidateQueries({ queryKey: ['boards'] });
  }

  // Member joined / left → workspace members list re-renders.
  if (entityType === 'member') {
    void qc.invalidateQueries({ queryKey: ['workspace', workspaceId] });
    void qc.invalidateQueries({ queryKey: ['workspaces'] });
  }

  // Invitation create/revoke → the workspace's pending invitations list.
  if (entityType === 'invitation') {
    void qc.invalidateQueries({
      queryKey: ['workspace', workspaceId, 'invitations'],
    });
  }

  // Workspace itself updated → its detail + the listing.
  if (entityType === 'workspace') {
    void qc.invalidateQueries({ queryKey: ['workspace', workspaceId] });
    void qc.invalidateQueries({ queryKey: ['workspaces'] });
  }
}

interface FormattedToast {
  title: string;
  body?: string;
  variant: ToastVariant;
}

function formatActivityToast(record: ActivityRecord): FormattedToast {
  const actor = record.actor.name;
  const workspace = record.workspace.name;
  const target = record.entityTitle;

  switch (record.entityType) {
    case 'invitation':
      if (record.verb === 'invited') {
        return {
          title: `${actor} invited ${target}`,
          body: `to ${workspace}`,
          variant: 'info',
        };
      }
      return {
        title: `${actor} revoked an invitation`,
        body: `${target} · ${workspace}`,
        variant: 'info',
      };
    case 'member':
      if (record.verb === 'joined') {
        return {
          title: `${target} joined ${workspace}`,
          body: `Invited by ${actor}`,
          variant: 'success',
        };
      }
      return {
        title: `${target} left ${workspace}`,
        variant: 'info',
      };
    case 'board':
      return {
        title: `${actor} ${verbLabel(record.verb)} board "${target}"`,
        body: workspace,
        variant: 'info',
      };
    case 'card':
      return {
        title: `${actor} ${verbLabel(record.verb)} card`,
        body: target,
        variant: 'info',
      };
    case 'column':
      return {
        title: `${actor} ${verbLabel(record.verb)} column "${target}"`,
        body: workspace,
        variant: 'info',
      };
    case 'workspace':
      return {
        title: `${actor} ${verbLabel(record.verb)} workspace`,
        body: target,
        variant: 'info',
      };
    default:
      return {
        title: `${actor} ${verbLabel(record.verb)} ${target}`,
        body: workspace,
        variant: 'info',
      };
  }
}

function verbLabel(verb: string): string {
  const map: Record<string, string> = {
    created: 'created',
    updated: 'updated',
    deleted: 'deleted',
    added: 'added',
    moved: 'moved',
    transferred: 'transferred',
    removed: 'removed',
    invited: 'invited',
    joined: 'joined',
  };
  return map[verb] ?? verb;
}
