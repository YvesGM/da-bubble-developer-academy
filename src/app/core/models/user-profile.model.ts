/**
 * Firestore user profile associated with a Firebase Authentication account.
 *
 * This record supplies display and preference data that are not represented
 * by the Firebase Auth identity alone.
 */
export interface UserProfile {
  /** Firebase Authentication UID and Firestore profile document ID. */
  uid: string;
  /** Email address when the user has one; guests may have none. */
  email: string | null;
  /** Name shown in conversations, search, and profile cards. */
  displayName: string;
  /** Selected preset SVG avatar identifier. */
  avatarId: string;
  /** Anonymous sessions have different feature and presence permissions. */
  isGuest: boolean;
  /** Recently used reactions shown in the quick-access emoji picker. */
  recentEmojis: string[];
  /** Optional user preference for the displayed workspace name. */
  workspaceName?: string;
  /** Timestamp-like values supplied by Cloud Firestore. */
  createdAt?: unknown;
  /** Last saved profile change timestamp, if available. */
  updatedAt?: unknown;
}
