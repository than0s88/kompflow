import type { ActivityRecord } from '@kanban/shared';
import { Link } from 'react-router-dom';
import { gradientFor } from '../layout/Sidebar';
import RelativeTime from './RelativeTime';

interface Props {
  activity: ActivityRecord;
}

/**
 * Renders one activity row matching the Trello-style screenshot:
 *
 *   {Avatar}  {Actor} {verbCopy} {entity-link} {prepCopy} {target}
 *             {time} • on board {board-link} 👥  • on Workspace {ws-link} 🔒
 */
export default function ActivityItem({ activity }: Props) {
  const initials = initialsOf(activity.actor.name);
  const avatarBg = gradientFor(activity.actor.id);

  return (
    <li className="kf-act">
      <span
        className="kf-act__avatar"
        style={{ background: avatarBg }}
        aria-hidden
        title={activity.actor.name}
      >
        {initials}
      </span>
      <div className="kf-act__body">
        <p className="kf-act__line">{renderLine(activity)}</p>
        <p className="kf-act__meta">
          <RelativeTime iso={activity.createdAt} />
          {activity.board ? (
            <>
              <span className="kf-act__sep">·</span>
              on board{' '}
              <Link
                to={`/boards/${activity.board.id}`}
                className="kf-act__link"
              >
                {activity.board.title}
              </Link>{' '}
              <span aria-hidden>👥</span>
            </>
          ) : null}
          <span className="kf-act__sep">·</span>
          on Workspace{' '}
          <Link
            to={`/workspaces/${activity.workspace.id}`}
            className="kf-act__link"
          >
            {activity.workspace.name}
          </Link>{' '}
          {activity.workspace.visibility === 'private' ? (
            <span aria-hidden>🔒</span>
          ) : (
            <span aria-hidden>🌐</span>
          )}
        </p>
      </div>
    </li>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function renderLine(a: ActivityRecord) {
  const actor = <strong>{a.actor.name}</strong>;
  const subject = <em className="kf-act__subject">{a.entityTitle}</em>;
  const meta = a.metadata ?? {};
  const fromColumn = (meta.fromColumnTitle as string | undefined) ?? '';
  const toColumn = (meta.toColumnTitle as string | undefined) ?? '';
  const fromBoard = (meta.fromBoardTitle as string | undefined) ?? '';
  const toBoard = (meta.toBoardTitle as string | undefined) ?? '';
  const columnTitle = (meta.columnTitle as string | undefined) ?? '';

  switch (a.verb) {
    case 'created':
      return (
        <>
          {actor} created {subject}
        </>
      );
    case 'updated':
      return (
        <>
          {actor} updated {subject}
        </>
      );
    case 'deleted':
      return (
        <>
          {actor} deleted {subject}
        </>
      );
    case 'added':
      return (
        <>
          {actor} added {subject}
          {columnTitle ? ` to ${columnTitle}` : ''}
        </>
      );
    case 'removed':
      return (
        <>
          {actor} removed {subject}
        </>
      );
    case 'moved':
      return (
        <>
          {actor} moved {subject}
          {fromColumn && toColumn ? ` from ${fromColumn} to ${toColumn}` : ''}
        </>
      );
    case 'transferred':
      return (
        <>
          {actor} transferred {subject}
          {fromBoard ? ` from ${fromBoard}` : ''}
          {toBoard ? ` to ${toBoard}` : ''}
        </>
      );
    default:
      return (
        <>
          {actor} {a.verb} {subject}
        </>
      );
  }
}
