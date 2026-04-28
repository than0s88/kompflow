export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Card {
  id: string;
  columnId: string;
  title: string;
  description: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  boardId: string;
  title: string;
  position: number;
  cards: Card[];
  createdAt: string;
  updatedAt: string;
}

export interface Board {
  id: string;
  workspaceId: string;
  ownerId: string;
  title: string;
  description: string | null;
  position: number;
  columns?: Column[];
  createdAt: string;
  updatedAt: string;
}

export type BoardMemberRole = 'owner' | 'editor' | 'viewer';

export interface BoardMember {
  id: string;
  boardId: string;
  userId: string;
  role: BoardMemberRole;
  user?: Pick<User, 'id' | 'name' | 'email'>;
}

export type WorkspaceVisibility = 'private' | 'workspace';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  visibility: WorkspaceVisibility;
  createdAt: string;
  updatedAt: string;
  boards?: Board[];
  members?: WorkspaceMember[];
  _count?: { boards: number; members: number };
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'admin' | 'member';
  user?: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'>;
}

export type ActivityVerb =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'added'
  | 'moved'
  | 'transferred'
  | 'removed';

export interface ActivityRecord {
  id: string;
  workspaceId: string;
  boardId: string | null;
  actorId: string;
  verb: ActivityVerb;
  entityType: 'workspace' | 'board' | 'column' | 'card';
  entityId: string;
  entityTitle: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  board: { id: string; title: string } | null;
  workspace: {
    id: string;
    name: string;
    visibility: WorkspaceVisibility;
  };
}

// API request/response DTOs

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface CreateWorkspaceDto {
  name: string;
  visibility?: WorkspaceVisibility;
}

export interface UpdateWorkspaceDto {
  name?: string;
  visibility?: WorkspaceVisibility;
}

export interface CreateBoardDto {
  title: string;
  workspaceId: string;
  description?: string;
}

export interface UpdateBoardDto {
  title?: string;
  description?: string;
}

export interface CreateColumnDto {
  title: string;
}

export interface UpdateColumnDto {
  title?: string;
}

export interface CreateCardDto {
  title: string;
  description?: string;
}

export interface UpdateCardDto {
  title?: string;
  description?: string;
}

export interface ReorderDto {
  columns?: { id: string; position: number }[];
  cards?: {
    id: string;
    position: number;
    columnId: string;
    targetBoardId?: string;
  }[];
}

export interface BoardUpdatedEvent {
  boardId: string;
  actorUserId: string | null;
}

export interface ActivityCreatedEvent {
  activity: ActivityRecord;
}
