import { Channel } from '../models/channel.model';
import { timestampToDate } from './timestamp.util';

/**
 * Sanitizes a channel name by removing a leading hash and normalizing whitespace.
 * @param name - Raw channel name.
 * @returns The cleaned channel name.
 */
export function cleanChannelName(name: string): string {
  return name.trim().replace(/^#+\s*/, '').replace(/\s+/g, ' ');
}

/**
 * Normalizes a channel name for case-insensitive duplicate detection.
 * @param name - Channel name to normalize.
 * @returns The lowercase sanitized channel name.
 */
export function normalizeChannelName(name: string): string {
  return cleanChannelName(name).toLowerCase();
}

/**
 * Encodes a normalized channel name for use as a Firestore document key.
 * @param name - Channel name to encode.
 * @returns The encoded unique-name registry key.
 */
export function channelNameKey(name: string): string {
  return encodeURIComponent(normalizeChannelName(name));
}

/**
 * Builds a unique member list for a channel.
 * @param creatorId - Identifier of the channel creator.
 * @param memberIds - Requested member identifiers.
 * @param creatorIsGuest - Whether the creator is an anonymous guest.
 * @returns A de-duplicated member identifier list.
 */
export function registeredChannelMembers(
  creatorId: string,
  memberIds: string[],
  creatorIsGuest: boolean,
): string[] {
  const ids = creatorIsGuest ? memberIds : [creatorId, ...memberIds];
  return [...new Set(ids.filter(Boolean))];
}

/**
 * Builds the payload stored in the unique channel-name registry.
 * @param channelId - Identifier of the channel that owns the name.
 * @param normalizedName - Normalized channel name.
 * @returns The channel-name registry payload.
 */
export function channelNameRegistry(channelId: string, normalizedName: string) {
  return { channelId, normalizedName };
}

/**
 * Sorts channels chronologically and then alphabetically for deterministic display.
 * @param channels - Channels to sort.
 * @returns A new sorted channel array.
 */
export function sortChannels(channels: Channel[]): Channel[] {
  return [...channels].sort((first, second) => {
    const timeDifference = channelTime(first) - channelTime(second);
    return timeDifference || first.name.localeCompare(second.name, 'de');
  });
}

/**
 * Converts a channel creation timestamp into a numeric sort value.
 * @param channel - Channel whose creation time should be read.
 * @returns The creation timestamp in milliseconds, or zero when unavailable.
 */
function channelTime(channel: Channel): number {
  return timestampToDate(channel.createdAt)?.getTime() ?? 0;
}
