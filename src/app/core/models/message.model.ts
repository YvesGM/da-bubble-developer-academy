/**
 * Chat message persisted under a channel or direct-message conversation.
 *
 * Author metadata is stored with the message so historical messages continue
 * to render consistently; deleting a message retains the document as a tombstone.
 */
export interface Message {
  /** Firestore message document ID. */
  id: string;
  /** Firebase UID of the author at send time. */
  authorId: string;
  /** Author display name captured for message rendering. */
  authorName: string;
  /** Avatar preset selected by the author when the message was sent. */
  authorAvatarId: string;
  /** Whether the author used an anonymous Firebase session. */
  authorIsGuest: boolean;
  /** Message body, potentially containing user mentions and multiple lines. */
  text: string;
  /** Soft-deletion flag; deletion clears text without removing the document. */
  deleted: boolean;
  /** Timestamp-like values supplied by Cloud Firestore. */
  createdAt?: unknown;
  /** Last message edit timestamp, if present. */
  updatedAt?: unknown;
}

/** Author snapshot and body required to compose a new Firestore message. */
export interface CreateMessageInput {
  /** Body text submitted by the composer. */
  text: string;
  /** Display name stored with the new message. */
  authorName: string;
  /** Avatar preset stored with the new message. */
  authorAvatarId: string;
}
