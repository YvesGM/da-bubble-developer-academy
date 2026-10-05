import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionData,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';

import { ConversationTarget, conversationDocumentPath } from '../models/conversation.model';
import { MessageReaction, ReactionGroup } from '../models/reaction.model';

@Injectable({ providedIn: 'root' })
export class ReactionService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(EnvironmentInjector);


  /**
   * Observes and groups emoji reactions for a message or thread reply.
   *
   * @param target - Conversation containing the message.
   * @param messageId - Identifier of the parent message.
   * @param replyId - Optional thread-reply identifier.
   * @returns An observable of reactions grouped by emoji.

   */
  observeReactions(
    target: ConversationTarget,
    messageId: string,
    replyId?: string,
  ): Observable<ReactionGroup[]> {
    const reference = this.reactionsCollection(target, messageId, replyId);
    const items = this.runSync(() => collectionData(reference, { idField: 'id' }));
    return (items as Observable<MessageReaction[]>).pipe(map((items) => this.groupReactions(items)));
  }


  /**
   * Adds the current user's reaction when absent and removes it when already present.
   *
   * @param target - Conversation containing the message.
   * @param messageId - Identifier of the parent message.
   * @param emoji - Emoji to toggle.
   * @param replyId - Optional thread-reply identifier.
   * @throws If no user is authenticated or Firestore access fails.

   */
  async toggleReaction(
    target: ConversationTarget,
    messageId: string,
    emoji: string,
    replyId?: string,
  ): Promise<void> {
    const reference = this.reactionReference(target, messageId, emoji, replyId);
    const snapshot = await this.run(() => getDoc(reference));
    if (snapshot.exists()) return this.run(() => deleteDoc(reference));
    await this.run(() => setDoc(reference, this.reactionData(emoji)));
  }

  /**
   * Groups individual reaction documents by emoji and aggregates their user identifiers.
   *
   * @param reactions - Reaction documents to group.
   * @returns Grouped reactions suitable for rendering.

   */
  private groupReactions(reactions: MessageReaction[]): ReactionGroup[] {
    const groups = new Map<string, string[]>();
    reactions.forEach((reaction) => this.addReaction(groups, reaction));
    return [...groups].map(([emoji, userIds]) => ({ emoji, userIds }));
  }

  /**
   * Adds one reaction document to an in-memory emoji grouping map.
   *
   * @param groups - Mutable map keyed by emoji.
   * @param reaction - Reaction document to append.

   */
  private addReaction(groups: Map<string, string[]>, reaction: MessageReaction): void {
    const users = groups.get(reaction.emoji) ?? [];
    groups.set(reaction.emoji, [...users, reaction.userId]);
  }

  /**
   * Builds the Firestore payload for the current user's emoji reaction.
   *
   * @param emoji - Emoji being added.
   * @returns The reaction document payload.
   * @throws If no Firebase user is authenticated.

   */
  private reactionData(emoji: string) {
    return { emoji, userId: this.currentUserId(), createdAt: serverTimestamp() };
  }

  /**
   * Builds the Firestore document reference for the current user's reaction to an emoji.
   *
   * @param target - Conversation containing the message.
   * @param messageId - Identifier of the parent message.
   * @param emoji - Emoji being referenced.
   * @param replyId - Optional thread-reply identifier.
   * @returns The deterministic reaction document reference.

   */
  private reactionReference(
    target: ConversationTarget,
    messageId: string,
    emoji: string,
    replyId?: string,
  ) {
    const id = `${this.currentUserId()}__${emoji}`;
    return this.runSync(() => doc(this.firestore, `${this.reactionsPath(target, messageId, replyId)}/${id}`));
  }

  /**
   * Returns the reaction collection for a message or thread reply.
   *
   * @param target - Conversation containing the message.
   * @param messageId - Identifier of the parent message.
   * @param replyId - Optional thread-reply identifier.
   * @returns The Firestore reaction collection reference.

   */
  private reactionsCollection(target: ConversationTarget, messageId: string, replyId?: string) {
    return this.runSync(() => collection(this.firestore, this.reactionsPath(target, messageId, replyId)));
  }

  /**
   * Builds the Firestore path that stores reactions for a message or reply.
   *
   * @param target - Conversation containing the message.
   * @param messageId - Identifier of the parent message.
   * @param replyId - Optional thread-reply identifier.
   * @returns The reaction collection path.

   */
  private reactionsPath(target: ConversationTarget, messageId: string, replyId?: string): string {
    const base = `${conversationDocumentPath(target)}/messages/${messageId}`;
    return replyId ? `${base}/replies/${replyId}/reactions` : `${base}/reactions`;
  }

  /**
   * Returns the active Firebase user identifier.
   *
   * @returns The authenticated user identifier.
   * @throws If no Firebase user is authenticated.
   */
  private currentUserId(): string {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('auth-required');
    return uid;
  }

  /**
   * Executes an asynchronous Firestore operation inside the service injection context.
   *
   * @param action - Asynchronous Firestore operation.
   * @returns The promise returned by the supplied operation.
   */
  private run<T>(action: () => Promise<T>): Promise<T> {
    return runInInjectionContext(this.injector, action);
  }

  /**
   * Executes a synchronous Firestore operation inside the service injection context.
   *
   * @param action - Synchronous Firestore operation.
   * @returns The value returned by the supplied operation.
   */
  private runSync<T>(action: () => T): T {
    return runInInjectionContext(this.injector, action);
  }
}
