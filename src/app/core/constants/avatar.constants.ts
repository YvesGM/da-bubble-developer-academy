/** Immutable identifiers of the six selectable built-in avatars. */
export const AVATAR_IDS = [
  'avatar-1',
  'avatar-2',
  'avatar-3',
  'avatar-4',
  'avatar-5',
  'avatar-6',
] as const;

/** Union of the built-in avatar identifiers accepted by profile settings. */
export type AvatarId = (typeof AVATAR_IDS)[number];
