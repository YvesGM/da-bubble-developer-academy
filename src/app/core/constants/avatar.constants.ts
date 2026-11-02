/**
 * Lists the six SVG avatar identifiers offered in registration and profile editing.
 *
 * IDs are persisted in user profiles; keep existing identifiers stable so saved
 * profiles continue to resolve the corresponding image assets.
 */
export const AVATAR_IDS = [
  'avatar-1',
  'avatar-2',
  'avatar-3',
  'avatar-4',
  'avatar-5',
  'avatar-6',
] as const;

/** Restricts avatar selection to identifiers available in the built-in asset set. */
export type AvatarId = (typeof AVATAR_IDS)[number];
