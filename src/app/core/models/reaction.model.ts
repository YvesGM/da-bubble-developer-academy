export interface MessageReaction {
  id: string;
  emoji: string;
  userId: string;
  createdAt?: unknown;
}

export interface ReactionGroup {
  emoji: string;
  userIds: string[];
}
