import type { ActivityRecord } from '@kanban/shared';
import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '../lib/api';
import { getPusher } from '../lib/pusher';

export type ActivityScope = 'workspace' | 'board';

interface ActivityPage {
  items: ActivityRecord[];
  nextCursor: string | null;
}

const PAGE_SIZE = 25;

function endpointFor(scope: ActivityScope, id: string): string {
  return scope === 'workspace'
    ? `/workspaces/${id}/activity`
    : `/boards/${id}/activity`;
}

export function useActivityFeed(scope: ActivityScope, id: string | undefined) {
  const qc = useQueryClient();
  const queryKey = ['activity', scope, id];

  const query = useInfiniteQuery<ActivityPage>({
    queryKey,
    enabled: Boolean(id),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string> = { limit: String(PAGE_SIZE) };
      if (typeof pageParam === 'string') params.before = pageParam;
      const { data } = await api.get<ActivityPage>(endpointFor(scope, id!), {
        params,
      });
      return data;
    },
  });

  // Live updates — subscribe to the relevant Pusher channel and prepend new items.
  useEffect(() => {
    if (!id) return;
    let pusher;
    try {
      pusher = getPusher();
    } catch {
      // Pusher not configured (e.g. dev without VITE_PUSHER_KEY) — skip realtime.
      return;
    }

    const channelName =
      scope === 'workspace'
        ? `private-workspace-${id}`
        : `private-board-${id}`;
    const channel = pusher.subscribe(channelName);

    const handler = (record: ActivityRecord) => {
      qc.setQueryData<InfiniteData<ActivityPage>>(queryKey, (prev) => {
        if (!prev) return prev;
        const [first, ...rest] = prev.pages;
        if (!first) return prev;
        if (first.items.some((it) => it.id === record.id)) return prev;
        return {
          ...prev,
          pages: [
            { ...first, items: [record, ...first.items] },
            ...rest,
          ],
        };
      });
    };

    channel.bind('activity.created', handler);
    return () => {
      channel.unbind('activity.created', handler);
      pusher.unsubscribe(channelName);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, id]);

  return query;
}
