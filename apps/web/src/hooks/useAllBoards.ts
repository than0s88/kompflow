import type { Board, Workspace } from '@kanban/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export type WorkspaceWithBoards = Workspace & { boards: Board[] };

/**
 * Fetches every accessible board across every workspace, grouped by workspace.
 * Used by the Dashboard "all boards" view.
 */
export function useAllBoards() {
  return useQuery({
    queryKey: ['boards', { all: true }],
    queryFn: async () => {
      const { data } = await api.get<WorkspaceWithBoards[]>(
        '/boards?all=true',
      );
      return data;
    },
  });
}
