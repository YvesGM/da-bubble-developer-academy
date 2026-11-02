import { ConversationTarget } from './conversation.model';
import { Message } from './message.model';
import { UserProfile } from './user-profile.model';

/**
 * Discriminated search item emitted by workspace search.
 *
 * Each variant carries its navigation target and a label for display;
 * message results also contain the matched message and conversation context.
 */
export type SearchResult =
  | {
      /** Identifies an account search result. */
      type: 'user';
      /** Firebase UID used to open the user's profile or direct message. */
      id: string;
      /** Text shown in the search suggestion. */
      label: string;
      /** Matching account data. */
      user: UserProfile;
    }
  | {
      /** Identifies a channel search result. */
      type: 'channel';
      /** Search-result identifier for the channel. */
      id: string;
      /** Channel name shown in the suggestion. */
      label: string;
      /** Firestore channel ID used for navigation. */
      channelId: string;
    }
  | {
      /** Identifies a message-text search result. */
      type: 'message';
      /** Search-result identifier for the matched message. */
      id: string;
      /** Message preview shown in the suggestion. */
      label: string;
      /** Conversation containing the matched message. */
      target: ConversationTarget;
      /** Matched message with author and timestamp metadata. */
      message: Message;
    };
