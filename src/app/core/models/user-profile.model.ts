export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string;
  avatarId: string;
  isGuest: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}
