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

export interface CreateBoardDto {
  title: string;
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
  cards?: { id: string; position: number; columnId: string }[];
}

export interface BoardUpdatedEvent {
  boardId: string;
  actorUserId: string | null;
}
