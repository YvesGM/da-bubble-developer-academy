export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string;
  avatarId: string;
  isGuest: boolean;
  recentEmojis: string[];
  workspaceName?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}
