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

  observeReactions(target: ConversationTarget, messageId: string): Observable<ReactionGroup[]> {
    const reference = this.reactionsCollection(target, messageId);
    const items = this.runSync(() => collectionData(reference, { idField: 'id' }));
    return (items as Observable<MessageReaction[]>).pipe(map((reactions) => this.groupReactions(reactions)));
  }

  async toggleReaction(target: ConversationTarget, messageId: string, emoji: string): Promise<void> {
    const reference = this.reactionReference(target, messageId, emoji);
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
    const uid = this.currentUserId();
    return { emoji, userId: uid, createdAt: serverTimestamp() };
  }

  private reactionReference(target: ConversationTarget, messageId: string, emoji: string) {
    const id = `${this.currentUserId()}__${encodeURIComponent(emoji)}`;
    const path = `${this.reactionsPath(target, messageId)}/${id}`;
    return this.runSync(() => doc(this.firestore, path));
  }

  private reactionsCollection(target: ConversationTarget, messageId: string) {
    return this.runSync(() => collection(this.firestore, this.reactionsPath(target, messageId)));
  }

  private reactionsPath(target: ConversationTarget, messageId: string): string {
    return `${conversationDocumentPath(target)}/messages/${messageId}/reactions`;
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
