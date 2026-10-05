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

  /** Observes grouped emoji reactions for a message or thread reply. */
  observeReactions(
    target: ConversationTarget,
    messageId: string,
    replyId?: string,
  ): Observable<ReactionGroup[]> {
    const reference = this.reactionsCollection(target, messageId, replyId);
    const items = this.runSync(() => collectionData(reference, { idField: 'id' }));
    return (items as Observable<MessageReaction[]>).pipe(map((items) => this.groupReactions(items)));
  }

  /** Adds or removes the current user's reaction for the selected emoji. */
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

  private groupReactions(reactions: MessageReaction[]): ReactionGroup[] {
    const groups = new Map<string, string[]>();
    reactions.forEach((reaction) => this.addReaction(groups, reaction));
    return [...groups].map(([emoji, userIds]) => ({ emoji, userIds }));
  }

  private addReaction(groups: Map<string, string[]>, reaction: MessageReaction): void {
    const users = groups.get(reaction.emoji) ?? [];
    groups.set(reaction.emoji, [...users, reaction.userId]);
  }

  private reactionData(emoji: string) {
    return { emoji, userId: this.currentUserId(), createdAt: serverTimestamp() };
  }

  private reactionReference(
    target: ConversationTarget,
    messageId: string,
    emoji: string,
    replyId?: string,
  ) {
    const id = `${this.currentUserId()}__${emoji}`;
    return this.runSync(() => doc(this.firestore, `${this.reactionsPath(target, messageId, replyId)}/${id}`));
  }

  private reactionsCollection(target: ConversationTarget, messageId: string, replyId?: string) {
    return this.runSync(() => collection(this.firestore, this.reactionsPath(target, messageId, replyId)));
  }

  private reactionsPath(target: ConversationTarget, messageId: string, replyId?: string): string {
    const base = `${conversationDocumentPath(target)}/messages/${messageId}`;
    return replyId ? `${base}/replies/${replyId}/reactions` : `${base}/reactions`;
  }

  private currentUserId(): string {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('auth-required');
    return uid;
  }

  private run<T>(action: () => Promise<T>): Promise<T> {
    return runInInjectionContext(this.injector, action);
  }

  private runSync<T>(action: () => T): T {
    return runInInjectionContext(this.injector, action);
  }
}
