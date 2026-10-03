export type ConversationType = 'channel' | 'directMessage';

export interface ConversationTarget {
  type: ConversationType;
  id: string;
}

export function conversationDocumentPath(target: ConversationTarget): string {
  const collectionName = target.type === 'channel' ? 'channels' : 'directMessages';
  return `${collectionName}/${target.id}`;
}

export function conversationRoute(target: ConversationTarget): string[] {
  const segment = target.type === 'channel' ? 'channel' : 'dm';
  return ['/workspace', segment, target.id];
}
