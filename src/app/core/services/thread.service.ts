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

  observeReplies(target: ConversationTarget, messageId: string): Observable<Message[]> {
    const reference = this.repliesCollection(target, messageId);
    const request = this.runSync(() => query(reference, orderBy('createdAt', 'asc')));
    return this.runSync(() => collectionData(request, { idField: 'id' })) as Observable<Message[]>;
  }

  async sendReply(
    target: ConversationTarget,
    messageId: string,
    input: CreateMessageInput,
  ): Promise<void> {
    const reference = this.repliesCollection(target, messageId);
    await this.run(() => addDoc(reference, this.replyData(input)));
  }

  private replyData(input: CreateMessageInput) {
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

  private repliesCollection(target: ConversationTarget, messageId: string) {
    const path = `${conversationDocumentPath(target)}/messages/${messageId}/replies`;
    return this.runSync(() => collection(this.firestore, path));
  }

  private run<T>(action: () => Promise<T>): Promise<T> {
    return runInInjectionContext(this.injector, action);
  }

  private runSync<T>(action: () => T): T {
    return runInInjectionContext(this.injector, action);
  }
}
