import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  doc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

import { ConversationTarget, conversationDocumentPath } from '../models/conversation.model';
import { CreateMessageInput, Message } from '../models/message.model';

@Injectable({ providedIn: 'root' })
export class MessageService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(EnvironmentInjector);


  /**
   * Observes messages for a channel or direct-message conversation in chronological order.
   *
   * @param target - Conversation whose messages should be observed.
   * @returns An observable of message documents ordered by creation time.

   */
  observeMessages(target: ConversationTarget): Observable<Message[]> {
    const reference = this.messagesCollection(target);
    const request = this.runSync(() => query(reference, orderBy('createdAt', 'asc')));
    return this.runSync(() => collectionData(request, { idField: 'id' })) as Observable<Message[]>;
  }


  /**
   * Creates a message in the selected conversation.
   *
   * @param target - Conversation that should receive the message.
   * @param input - Message text and author presentation data.
   * @returns The Firestore identifier of the created message.
   * @throws If no user is authenticated or Firestore rejects the write.

   */
  async sendMessage(target: ConversationTarget, input: CreateMessageInput): Promise<string> {
    const reference = this.messagesCollection(target);
    const result = await this.run(() => addDoc(reference, this.messageData(input)));
    return result.id;
  }


  /**
   * Updates an existing message and refreshes its modification timestamp.
   *
   * @param target - Conversation that owns the message.
   * @param messageId - Identifier of the message to update.
   * @param text - Replacement message text.
   * @throws If Firestore rejects the update.

   */
  async updateMessage(target: ConversationTarget, messageId: string, text: string): Promise<void> {
    const reference = this.messageReference(target, messageId);
    await this.run(() => updateDoc(reference, { text: text.trim(), updatedAt: serverTimestamp() }));
  }


  /**
   * Soft-deletes a message while preserving its document and conversation history.
   *
   * @param target - Conversation that owns the message.
   * @param messageId - Identifier of the message to delete.
   * @throws If Firestore rejects the update.

   */
  async deleteMessage(target: ConversationTarget, messageId: string): Promise<void> {
    const reference = this.messageReference(target, messageId);
    await this.run(() => updateDoc(reference, {
      text: '',
      deleted: true,
      updatedAt: serverTimestamp(),
    }));
  }

  /**
   * Builds the Firestore payload for a new message from the active session and input.
   *
   * @param input - Message text and author presentation data.
   * @returns The complete message document payload.
   * @throws If no Firebase user is authenticated.
   */
  private messageData(input: CreateMessageInput) {
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
   * Returns the Firestore collection containing messages for a conversation target.
   *
   * @param target - Channel or direct-message conversation.
   * @returns The target's messages collection reference.
   */
  private messagesCollection(target: ConversationTarget) {
    const path = `${conversationDocumentPath(target)}/messages`;
    return this.runSync(() => collection(this.firestore, path));
  }

  /**
   * Returns the Firestore document reference for one message.
   *
   * @param target - Conversation that owns the message.
   * @param messageId - Message identifier.
   * @returns The message document reference.
   */
  private messageReference(target: ConversationTarget, messageId: string) {
    const path = `${conversationDocumentPath(target)}/messages/${messageId}`;
    return this.runSync(() => doc(this.firestore, path));
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
