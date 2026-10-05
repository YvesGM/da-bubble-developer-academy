export type ConversationType = 'channel' | 'directMessage';

export interface ConversationTarget {
  type: ConversationType;
  id: string;
}

/**
 * Builds the Firestore document path for a channel or direct-message conversation.
 *
 * @param target - Conversation target containing its type and identifier.
 * @returns The Firestore document path for the conversation.
 */
export function conversationDocumentPath(target: ConversationTarget): string {
  const collectionName = target.type === 'channel' ? 'channels' : 'directMessages';
  return `${collectionName}/${target.id}`;
}

/**
 * Builds the Angular router command array for a conversation target.
 *
 * @param target - Conversation target containing its type and identifier.
 * @returns Router commands that navigate to the requested conversation.
 */
export function conversationRoute(target: ConversationTarget): string[] {
  const segment = target.type === 'channel' ? 'channel' : 'dm';
  return ['/workspace', segment, target.id];
}
