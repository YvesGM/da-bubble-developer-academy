export const AVATAR_IDS = [
  'avatar-1',
  'avatar-2',
  'avatar-3',
  'avatar-4',
  'avatar-5',
  'avatar-6',
] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];
