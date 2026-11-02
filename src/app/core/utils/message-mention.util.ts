import { UserProfile } from '../models/user-profile.model';

/** Represents a plain-text span or a recognized user mention inside a message. */
export interface MessageTextPart {
  text: string;
  userId?: string;
}

/**
 * Splits message text into displayable spans while preserving the original content.
 *
 * @param source - Stored message text to examine.
 * @param users - Profiles whose display names can be recognized as mentions.
 * @returns Text spans with user identifiers for recognized mentions.
 */
export function splitMessageMentions(source: string, users: UserProfile[]): MessageTextPart[] {
  const names = [...users].sort((a, b) => b.displayName.length - a.displayName.length);
  const parts: MessageTextPart[] = [];
  let cursor = 0;
  let plainStart = 0;
  while (cursor < source.length) {
    const user = names.find((item) => isMentionAt(source, cursor, item.displayName));
    if (!user) { cursor++; continue; }
    if (cursor > plainStart) parts.push({ text: source.slice(plainStart, cursor) });
    plainStart = cursor = appendMention(parts, source, cursor, user);
  }
  if (plainStart < source.length) parts.push({ text: source.slice(plainStart) });
  return parts.length ? parts : [{ text: source }];
}

/**
 * Adds the matched mention to the display spans.
 *
 * @param parts - Accumulated text and mention spans.
 * @param source - Original message text.
 * @param at - Index of the leading @ character.
 * @param user - Profile matched by the mention.
 * @returns Index immediately after the mention.
 */
function appendMention(parts: MessageTextPart[], source: string, at: number, user: UserProfile): number {
  const end = at + user.displayName.length + 1;
  parts.push({ text: source.slice(at, end), userId: user.uid });
  return end;
}

/**
 * Checks mention boundaries so substrings inside words remain plain text.
 *
 * @param text - Original message text.
 * @param index - Candidate position of the @ character.
 * @param name - Display name to match, case-insensitively.
 * @returns Whether this position starts a complete mention.
 */
function isMentionAt(text: string, index: number, name: string): boolean {
  const token = '@' + name;
  if (!name || text.slice(index, index + token.length).toLowerCase() !== token.toLowerCase()) return false;
  return (index === 0 || /\s/.test(text[index - 1]))
    && (index + token.length === text.length || /[\s.,!?;:]/.test(text[index + token.length]));
}
