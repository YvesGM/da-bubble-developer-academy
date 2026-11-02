/** Persisted private conversation shared by its registered participants. */
export interface DirectMessage {
  id: string;
  /** Firebase UIDs permitted to read and write conversation messages. */
  participantIds: string[];
  /** Timestamp-like values supplied by Cloud Firestore. */
  createdAt?: unknown;
  updatedAt?: unknown;
}
