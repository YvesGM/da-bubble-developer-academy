import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  deleteDoc,
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

  observeMessages(target: ConversationTarget): Observable<Message[]> {
    const reference = this.messagesCollection(target);
    const request = this.runSync(() => query(reference, orderBy('createdAt', 'asc')));
    return this.runSync(() => collectionData(request, { idField: 'id' })) as Observable<Message[]>;
  }

  async sendMessage(target: ConversationTarget, input: CreateMessageInput): Promise<string> {
    const reference = this.messagesCollection(target);
    const result = await this.run(() => addDoc(reference, this.messageData(input)));
    return result.id;
  }

  async updateMessage(target: ConversationTarget, messageId: string, text: string): Promise<void> {
    const reference = this.messageReference(target, messageId);
    await this.run(() => updateDoc(reference, { text: text.trim(), updatedAt: serverTimestamp() }));
  }

  async deleteMessage(target: ConversationTarget, messageId: string): Promise<void> {
    await this.run(() => deleteDoc(this.messageReference(target, messageId)));
  }

  private messageData(input: CreateMessageInput) {
    const user = this.auth.currentUser;
    if (!user) throw new Error('auth-required');
    return {
      authorId: user.uid,
      authorName: user.isAnonymous ? 'Guest' : input.authorName,
      authorAvatarId: user.isAnonymous ? 'avatar-1' : input.authorAvatarId,
      authorIsGuest: user.isAnonymous,
      text: input.text.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  }

  private messagesCollection(target: ConversationTarget) {
    const path = `${conversationDocumentPath(target)}/messages`;
    return this.runSync(() => collection(this.firestore, path));
  }

  private messageReference(target: ConversationTarget, messageId: string) {
    const path = `${conversationDocumentPath(target)}/messages/${messageId}`;
    return this.runSync(() => doc(this.firestore, path));
  }

  private run<T>(action: () => Promise<T>): Promise<T> {
    return runInInjectionContext(this.injector, action);
  }

  private runSync<T>(action: () => T): T {
    return runInInjectionContext(this.injector, action);
  }
}
