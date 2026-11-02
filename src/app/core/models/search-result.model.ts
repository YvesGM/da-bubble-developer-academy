import { ConversationTarget } from './conversation.model';
import { Message } from './message.model';
import { UserProfile } from './user-profile.model';

/** Search entry for a user, channel, or accessible message. */
export type SearchResult =
  | {
      type: 'user';
      id: string;
      label: string;
      user: UserProfile;
    }
  | {
      type: 'channel';
      id: string;
      label: string;
      channelId: string;
    }
  | {
      type: 'message';
      id: string;
      label: string;
      target: ConversationTarget;
      message: Message;
    };
