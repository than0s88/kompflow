import type { CreateWorkspaceDto, Workspace } from '@kanban/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export type WorkspaceListItem = Workspace & {
  _count: { boards: number; members: number };
};

export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const { data } = await api.get<WorkspaceListItem[]>('/workspaces');
      return data;
    },
  });
}

export function useWorkspace(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['workspace', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data } = await api.get<Workspace>(`/workspaces/${workspaceId}`);
      return data;
    },
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateWorkspaceDto) => {
      const { data } = await api.post<Workspace>('/workspaces', dto);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['workspaces'] });
      void qc.invalidateQueries({ queryKey: ['boards'] });
    },
  });
}

export function useDeleteWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (workspaceId: string) => {
      await api.delete(`/workspaces/${workspaceId}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['workspaces'] });
      void qc.invalidateQueries({ queryKey: ['boards'] });
    },
  });
}
