import {
  useActivityFeed,
  type ActivityScope,
} from '../../hooks/useActivityFeed';
import ActivityItem from './ActivityItem';

interface Props {
  scope: ActivityScope;
  id: string | undefined;
}

export default function ActivityFeed({ scope, id }: Props) {
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useActivityFeed(scope, id);

  if (isLoading) {
    return (
      <div className="kf-feed">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="kf-act kf-act--skeleton">
            <span className="kf-act__avatar kf-act__avatar--skeleton" />
            <div className="kf-act__body">
              <span className="kf-act__line-skel" />
              <span className="kf-act__meta-skel" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="kf-feed kf-feed--error">
        <p>Couldn't load activity.</p>
        <button
          type="button"
          className="kf-btn kf-btn--ghost"
          onClick={() => void refetch()}
        >
          Try again
        </button>
      </div>
    );
  }

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  if (items.length === 0) {
    return (
      <div className="kf-feed kf-feed--empty">
        <p className="kf-empty__title">No activity yet.</p>
        <p className="kf-empty__hint">
          Create a board or move a card and you'll see the trail here.
        </p>
      </div>
    );
  }

  return (
    <div className="kf-feed">
      <ul className="kf-feed__list">
        {items.map((it) => (
          <ActivityItem key={it.id} activity={it} />
        ))}
      </ul>
      {hasNextPage ? (
        <button
          type="button"
          className="kf-btn kf-btn--ghost kf-feed__more"
          onClick={() => void fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading…' : 'Load more activity'}
        </button>
      ) : null}
    </div>
  );
}
