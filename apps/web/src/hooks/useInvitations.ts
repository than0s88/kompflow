import type { WorkspaceInvitation } from '@kanban/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface CreateInvitationResult {
  invitation: WorkspaceInvitation;
  mailDelivered: boolean;
  acceptUrl: string;
}

export function useWorkspaceInvitations(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['workspace', workspaceId, 'invitations'],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data } = await api.get<WorkspaceInvitation[]>(
        `/workspaces/${workspaceId}/invitations`,
      );
      return data;
    },
  });
}

export function useInviteMember(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      email: string;
      role?: 'admin' | 'member';
    }) => {
      const { data } = await api.post<CreateInvitationResult>(
        `/workspaces/${workspaceId}/invitations`,
        input,
      );
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ['workspace', workspaceId, 'invitations'],
      });
      // Activity feed picks up the invite via the existing Pusher
      // subscription, so no manual cache patch needed there.
    },
  });
}

export function useRevokeInvitation(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      await api.delete(`/invitations/${invitationId}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ['workspace', workspaceId, 'invitations'],
      });
    },
  });
}

export function useRemoveMember(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['workspace', workspaceId] });
      void qc.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}
