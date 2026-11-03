import type { User } from '@angular/fire/auth';

import type { CreateMessageInput, Message } from '../models/message.model';
import type { UserProfile } from '../models/user-profile.model';

/**
 * Creates a message payload using the same author identity as the Firestore profile.
 *
 * Firestore security rules require registered messages to match the stored
 * display name and avatar. Anonymous sessions use their fixed guest identity.
 *
 * @param text - Content of the message or thread reply.
 * @param user - Currently authenticated Firebase user.
 * @param profile - Registered user's Firestore profile, if it has loaded.
 * @returns Message text and the validated author snapshot.
 * @throws If authentication is missing or a registered profile is not yet loaded.
 */
export function createMessageInput(
  text: string,
  user: User | null,
  profile: UserProfile | undefined,
): CreateMessageInput {
  if (!user) throw new Error('auth-required');
  if (user.isAnonymous) return { text, authorName: 'Guest', authorAvatarId: 'avatar-1' };
  if (!profile) throw new Error('profile-not-ready');
  return { text, authorName: profile.displayName, authorAvatarId: profile.avatarId };
}

/**
 * Resolves the current name of a message author for live workspace displays.
 *
 * @param message - Persisted message with author ID and fallback name.
 * @param users - Registered workspace profiles available for display.
 * @returns Renamed user's current name, or the original snapshot for missing/guest profiles.
 */
export function resolveMessageAuthorName(message: Message, users: UserProfile[]): string {
  if (message.authorIsGuest) return message.authorName;
  return users.find((user) => user.uid === message.authorId)?.displayName ?? message.authorName;
}
