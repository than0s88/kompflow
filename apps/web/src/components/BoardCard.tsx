import type { Board } from '@kanban/shared';
import { Link } from 'react-router-dom';
import { gradientFor } from './layout/Sidebar';

interface Props {
  board: Board;
  onDelete?: (id: string) => void;
}

export default function BoardCard({ board, onDelete }: Props) {
  return (
    <article
      className="kf-board-card"
      style={{ ['--card-gradient' as string]: gradientFor(board.id) }}
    >
      <Link to={`/boards/${board.id}`} className="kf-board-card__link">
        <div className="kf-board-card__cover" aria-hidden />
        <div className="kf-board-card__body">
          <h3 className="kf-board-card__title">{board.title}</h3>
          {board.description ? (
            <p className="kf-board-card__desc">{board.description}</p>
          ) : null}
        </div>
      </Link>
      {onDelete ? (
        <button
          type="button"
          className="kf-board-card__delete"
          aria-label={`Delete ${board.title}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirm(`Delete board "${board.title}"?`)) onDelete(board.id);
          }}
        >
          ×
        </button>
      ) : null}
    </article>
  );
}
