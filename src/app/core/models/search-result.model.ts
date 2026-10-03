import { ConversationTarget } from './conversation.model';
import { Message } from './message.model';

export interface MessageSearchResult {
  target: ConversationTarget;
  conversationLabel: string;
  message: Message;
}
