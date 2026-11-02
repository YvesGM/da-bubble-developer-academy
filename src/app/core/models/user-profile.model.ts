/** Application profile linked to a Firebase Authentication identity. */
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string;
  avatarId: string;
  /** Anonymous sessions have different feature and presence permissions. */
  isGuest: boolean;
  /** Recently used reactions shown in the quick-access emoji picker. */
  recentEmojis: string[];
  /** Optional user preference for the displayed workspace name. */
  workspaceName?: string;
  /** Timestamp-like values supplied by Cloud Firestore. */
  createdAt?: unknown;
  updatedAt?: unknown;
}
