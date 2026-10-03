import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';

import { DirectMessage } from '../models/direct-message.model';

@Injectable({ providedIn: 'root' })
export class DirectMessageService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(EnvironmentInjector);

  observeCurrentUserConversations(): Observable<DirectMessage[]> {
    const uid = this.currentRegisteredUserId();
    if (!uid) return new Observable((subscriber) => {
      subscriber.next([]);
      subscriber.complete();
    });
    const reference = this.runSync(() => collection(this.firestore, 'directMessages'));
    const request = this.runSync(() => query(reference, where('participantIds', 'array-contains', uid)));
    const items = this.runSync(() => collectionData(request, { idField: 'id' }));
    return (items as Observable<DirectMessage[]>).pipe(map((dms) => this.sortById(dms)));
  }

  async openConversation(otherUserId: string): Promise<string> {
    const currentUserId = this.currentRegisteredUserId();
    if (!currentUserId) throw new Error('guest-direct-message-not-available');
    const existing = await this.findConversation(currentUserId, otherUserId);
    if (existing) return existing;
    return this.createConversation(currentUserId, otherUserId);
  }

  private async findConversation(currentUserId: string, otherUserId: string): Promise<string> {
    const reference = this.runSync(() => collection(this.firestore, 'directMessages'));
    const request = this.runSync(() => query(reference, where('participantIds', 'array-contains', currentUserId)));
    const snapshot = await this.run(() => getDocs(request));
    return snapshot.docs.find((item) => item.data()['participantIds'].includes(otherUserId))?.id ?? '';
  }

  private async createConversation(currentUserId: string, otherUserId: string): Promise<string> {
    const id = this.conversationId(currentUserId, otherUserId);
    const reference = this.runSync(() => doc(this.firestore, 'directMessages', id));
    await this.run(() => setDoc(reference, this.directMessageData(currentUserId, otherUserId)));
    return id;
  }

  conversationPartner(dm: DirectMessage): string {
    const current = this.currentRegisteredUserId();
    return dm.participantIds.find((uid) => uid !== current) ?? '';
  }

  private directMessageData(first: string, second: string) {
    return {
      participantIds: [first, second].sort(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  }

  private conversationId(first: string, second: string): string {
    return [first, second].sort().join('__');
  }

  private currentRegisteredUserId(): string {
    const user = this.auth.currentUser;
    return !user || user.isAnonymous ? '' : user.uid;
  }

  private sortById(items: DirectMessage[]): DirectMessage[] {
    return [...items].sort((first, second) => first.id.localeCompare(second.id));
  }

  private run<T>(action: () => Promise<T>): Promise<T> {
    return runInInjectionContext(this.injector, action);
  }

  private runSync<T>(action: () => T): T {
    return runInInjectionContext(this.injector, action);
  }
}
