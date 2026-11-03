/**
 * Channel metadata persisted in Firestore, including access and membership.
 *
 * Channel names are unique by their normalized registry key; membership is
 * recorded by user UID, while guest access uses a separate boolean.
 */
export interface Channel {
  /** Firestore document ID of the channel. */
  id: string;
  /** Display name shown in headings and the channel sidebar. */
  name: string;
  /** Case-insensitive name used for duplicate detection. */
  normalizedName: string;
  /** Encoded key of the unique channel-name registry entry. */
  nameKey: string;
  /** Optional human-readable purpose and guidelines for the channel. */
  description: string;
  /** Firebase UID of the account that created the channel. */
  creatorId: string;
  /** Firebase UIDs of registered users granted channel access. */
  memberIds: string[];
  /** Whether anonymous guests may access the channel. */
  guestAccess: boolean;
  /** Whether every registered user automatically belongs to this public channel. */
  autoJoin?: boolean;
  /** Timestamp-like Firestore values are normalized by the timestamp utilities. */
  createdAt?: unknown;
  /** Timestamp-like value of the most recent channel metadata change. */
  updatedAt?: unknown;
}

/** New-channel values submitted to the channel creation service. */
export interface CreateChannelInput {
  /** Requested display name, validated for uniqueness before persistence. */
  name: string;
  /** Channel purpose entered during creation. */
  description: string;
  /** Registered user IDs invited when the channel is created. */
  memberIds: string[];
  /** Whether anonymous guests are included in the new channel. */
  guestAccess: boolean;
  /** Whether the channel is shared automatically with all registered users. */
  autoJoin: boolean;
}

/** Metadata editable after creation; membership changes follow a separate flow. */
export interface UpdateChannelInput {
  /** New channel display name; renaming also updates its uniqueness key. */
  name: string;
  /** Updated channel description. */
  description: string;
}
