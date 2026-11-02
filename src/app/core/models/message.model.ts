/** Persisted channel or direct-message entry with author and deletion metadata. */
export interface Message {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarId: string;
  /** Whether the author used an anonymous Firebase session. */
  authorIsGuest: boolean;
  text: string;
  /** Soft-deletion flag; deletion clears text without removing the document. */
  deleted: boolean;
  /** Timestamp-like values supplied by Cloud Firestore. */
  createdAt?: unknown;
  updatedAt?: unknown;
}

/** Content and author presentation metadata required for a new message. */
export interface CreateMessageInput {
  text: string;
  authorName: string;
  authorAvatarId: string;
}
