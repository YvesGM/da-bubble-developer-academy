/**
 * Single user's emoji reaction stored under a message or thread reply.
 *
 * Each record identifies both the chosen emoji and its owning user.
 */
export interface MessageReaction {
  /** Reaction document ID used to update or remove this choice. */
  id: string;
  /** Unicode emoji associated with the reaction. */
  emoji: string;
  /** Firebase UID of the user who reacted. */
  userId: string;
  /** Firestore timestamp of the reaction, when available. */
  createdAt?: unknown;
}

/** Aggregates reaction user IDs for one emoji in the message footer. */
export interface ReactionGroup {
  /** Emoji shown on the aggregate reaction chip. */
  emoji: string;
  /** Firebase UIDs of users who selected the emoji. */
  userIds: string[];
}
