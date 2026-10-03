export interface Message {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarId: string;
  authorIsGuest: boolean;
  text: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CreateMessageInput {
  text: string;
  authorName: string;
  authorAvatarId: string;
}
