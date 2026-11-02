/**
 * Discriminates between a shared channel and a private direct conversation.
 *
 * The value selects both the Firestore collection and Angular route segment.
 */
export type ConversationType = 'channel' | 'directMessage';

/**
 * Identifies the conversation that owns a message, reaction, or thread.
 *
 * The type determines how consumers interpret the document ID.
 */
export interface ConversationTarget {
  /** Conversation kind used for collection and route selection. */
  type: ConversationType;
  /** Firestore document ID in the collection selected by `type`. */
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
