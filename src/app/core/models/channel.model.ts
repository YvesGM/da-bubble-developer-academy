/** Persisted channel metadata and access settings stored in Cloud Firestore. */
export interface Channel {
  id: string;
  name: string;
  /** Case-insensitive name used for duplicate detection. */
  normalizedName: string;
  /** Encoded key of the unique channel-name registry entry. */
  nameKey: string;
  description: string;
  creatorId: string;
  memberIds: string[];
  /** Whether anonymous guests may access the channel. */
  guestAccess: boolean;
  /** Timestamp-like Firestore values are normalized by the timestamp utilities. */
  createdAt?: unknown;
  updatedAt?: unknown;
}

/** Input collected when a user creates a new channel. */
export interface CreateChannelInput {
  name: string;
  description: string;
  memberIds: string[];
  guestAccess: boolean;
}

/** Editable channel metadata; membership is managed separately. */
export interface UpdateChannelInput {
  name: string;
  description: string;
}
