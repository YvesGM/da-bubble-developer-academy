export interface MessageReaction {
  emoji: string;
  userIds: string[];
}

export interface Message {
  id: string;
  authorId: string;
  text: string;
  reactions: MessageReaction[];
  createdAt?: unknown;
  updatedAt?: unknown;
}
