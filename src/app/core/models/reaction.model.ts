/** One user's persisted emoji reaction to a message or thread reply. */
export interface MessageReaction {
  id: string;
  emoji: string;
  userId: string;
  createdAt?: unknown;
}

/** Groups users by emoji for compact reaction rendering. */
export interface ReactionGroup {
  emoji: string;
  userIds: string[];
}
