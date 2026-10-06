import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  orderBy,
  query,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

import { ConversationTarget, conversationDocumentPath } from '../models/conversation.model';
import { CreateMessageInput, Message } from '../models/message.model';

@Injectable({ providedIn: 'root' })
export class ThreadService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(EnvironmentInjector);

  /**
   * Observes all replies belonging to a parent message in chronological order.
   *
   * @param target - Channel or direct-message conversation containing the parent message.
   * @param messageId - Firestore identifier of the parent message.
   * @returns An observable that emits the current thread replies ordered by creation time.
   */
  observeReplies(target: ConversationTarget, messageId: string): Observable<Message[]> {
    const reference = this.repliesCollection(target, messageId);
    const request = this.runSync(() => query(reference, orderBy('createdAt', 'asc')));
    return this.runSync(() => collectionData(request, { idField: 'id' })) as Observable<Message[]>;
  }

  /**
   * Creates a new reply below an existing conversation message.
   *
   * Author metadata is derived from the active Firebase session and the supplied
   * presentation data. Anonymous users are stored with the guest fallback values.
   *
   * @param target - Channel or direct-message conversation containing the thread.
   * @param messageId - Identifier of the parent message.
   * @param input - Reply text and author presentation data.
   * @returns A promise that resolves after Firestore creates the reply document.
   * @throws If no Firebase user is authenticated or Firestore rejects the write.
   */
  async sendReply(
    target: ConversationTarget,
    messageId: string,
    input: CreateMessageInput,
  ): Promise<void> {
    const reference = this.repliesCollection(target, messageId);
    await this.run(() => addDoc(reference, this.replyData(input)));
  }

  /**
   * Builds the Firestore payload for a new thread reply.
   *
   * @param input - Reply text and author presentation data.
   * @returns The complete reply document payload.
   * @throws If no Firebase user is authenticated.
   */
  private replyData(input: CreateMessageInput) {
    const user = this.auth.currentUser;
    if (!user) throw new Error('auth-required');
    return {
      authorId: user.uid,
      authorName: user.isAnonymous ? 'Guest' : input.authorName,
      authorAvatarId: user.isAnonymous ? 'avatar-1' : input.authorAvatarId,
      authorIsGuest: user.isAnonymous,
      text: input.text.trim(),
      deleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  }

  /**
   * Returns the Firestore collection containing replies for a parent message.
   *
   * @param target - Conversation containing the parent message.
   * @param messageId - Identifier of the parent message.
   * @returns The replies collection reference.
   */
  private repliesCollection(target: ConversationTarget, messageId: string) {
    const path = `${conversationDocumentPath(target)}/messages/${messageId}/replies`;
    return this.runSync(() => collection(this.firestore, path));
  }

  /**
   * Executes an asynchronous Firestore operation inside the service injection context.
   *
   * @param action - Asynchronous Firestore operation to execute.
   * @returns The promise returned by the supplied operation.
   */
  private run<T>(action: () => Promise<T>): Promise<T> {
    return runInInjectionContext(this.injector, action);
  }

  /**
   * Executes a synchronous Firestore operation inside the service injection context.
   *
   * @param action - Synchronous Firestore operation to execute.
   * @returns The value returned by the supplied operation.
   */
  private runSync<T>(action: () => T): T {
    return runInInjectionContext(this.injector, action);
  }
}
