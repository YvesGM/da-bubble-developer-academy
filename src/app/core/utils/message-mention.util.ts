import { Channel } from '../models/channel.model';
import { UserProfile } from '../models/user-profile.model';

/** Represents a plain-text span, a user mention, or a linked channel reference. */
export interface MessageTextPart {
  text: string;
  userId?: string;
  channelId?: string;
}

/** Searchable text and destination for one resolvable message reference. */
interface MessageReference {
  token: string;
  userId?: string;
  channelId?: string;
}

/**
 * Splits message text into plain spans, user mentions, and channel links.
 *
 * Only channels available to the current viewer are linked; unknown references
 * remain literal message text. Longest names take precedence to avoid partial
 * matches such as #Team in #Team Updates.
 *
 * @param source - Original persisted message text.
 * @param users - Profiles whose @displayName mentions can be opened.
 * @param channels - Channels whose #name references can be navigated to.
 * @returns Ordered spans preserving every character of the original message.
 */
export function splitMessageMentions(
  source: string,
  users: UserProfile[],
  channels: Channel[] = [],
): MessageTextPart[] {
  const references = buildReferences(users, channels);
  const parts: MessageTextPart[] = [];
  let cursor = 0;
  let plainStart = 0;
  while (cursor < source.length) {
    const found = references.find((reference) => isReferenceAt(source, cursor, reference.token));
    if (!found) { cursor++; continue; }
    if (cursor > plainStart) parts.push({ text: source.slice(plainStart, cursor) });
    const end = cursor + found.token.length;
    parts.push({ text: source.slice(cursor, end), userId: found.userId, channelId: found.channelId });
    plainStart = cursor = end;
  }
  if (plainStart < source.length) parts.push({ text: source.slice(plainStart) });
  return parts.length ? parts : [{ text: source }];
}

/**
 * Builds a longest-first catalog of references that the viewer can resolve.
 *
 * @param users - Visible registered profiles.
 * @param channels - Accessible channels.
 * @returns Ordered reference tokens and their destination identifiers.
 */
function buildReferences(users: UserProfile[], channels: Channel[]): MessageReference[] {
  const userRefs = users.filter((user) => user.displayName).map((user) => ({
    token: '@' + user.displayName, userId: user.uid,
  }));
  const channelRefs = channels.filter((channel) => channel.name).map((channel) => ({
    token: '#' + channel.name, channelId: channel.id,
  }));
  return [...userRefs, ...channelRefs].sort((a, b) => b.token.length - a.token.length);
}

/**
 * Matches a complete mention at a word boundary, regardless of letter case.
 *
 * @param source - Original message text.
 * @param index - Index to inspect for a reference token.
 * @param token - User or channel reference, including its @ or # prefix.
 * @returns Whether a complete recognized reference begins at the index.
 */
function isReferenceAt(source: string, index: number, token: string): boolean {
  if (source.slice(index, index + token.length).toLowerCase() !== token.toLowerCase()) return false;
  const before = index === 0 || /\s/.test(source[index - 1]);
  const after = index + token.length === source.length
    || /[\s.,!?;:]/.test(source[index + token.length]);
  return before && after;
}
