/**
 * Private conversation persisted in Firestore and shared by registered users.
 *
 * The participant list is the authority for who belongs to this conversation.
 */
export interface DirectMessage {
  /** Firestore document ID of the direct-message conversation. */
  id: string;
  /** Firebase UIDs permitted to read and write conversation messages. */
  participantIds: string[];
  /** Timestamp-like values supplied by Cloud Firestore. */
  createdAt?: unknown;
  /** Last conversation activity or metadata update, when available. */
  updatedAt?: unknown;
}
