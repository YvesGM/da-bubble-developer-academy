import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  getDoc,
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


  /**
   * Observes direct-message conversations that contain the current registered user.
   *
   * @returns An observable of conversations sorted by their deterministic identifier.

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


  /**
   * Returns an existing deterministic conversation or creates it for the selected participant.
   *
   * @param otherUserId - Identifier of the participant to message.
   * @returns The deterministic direct-message conversation identifier.
   * @throws If the current session is anonymous or Firestore access fails.

  async openConversation(otherUserId: string): Promise<string> {
    const currentUserId = this.currentRegisteredUserId();
    if (!currentUserId) throw new Error('guest-direct-message-not-available');
    const id = this.conversationId(currentUserId, otherUserId);
    if (await this.conversationExists(id)) return id;
    return this.createConversation(currentUserId, otherUserId);
  }

  /**
   * Checks whether a direct-message conversation document exists.
   *
   * @param id - Deterministic conversation identifier.
   * @returns Whether the conversation already exists.

  private async conversationExists(id: string): Promise<boolean> {
    const reference = this.runSync(() => doc(this.firestore, 'directMessages', id));
    const snapshot = await this.run(() => getDoc(reference));
    return snapshot.exists();
  }

  /**
   * Creates a direct-message conversation document for two participants.
   *
   * @param currentUserId - Identifier of the current user.
   * @param otherUserId - Identifier of the other participant.
   * @returns The deterministic conversation identifier.
   * @throws If Firestore rejects the write.

  private async createConversation(currentUserId: string, otherUserId: string): Promise<string> {
    const id = this.conversationId(currentUserId, otherUserId);
    const reference = this.runSync(() => doc(this.firestore, 'directMessages', id));
    await this.run(() => setDoc(reference, this.directMessageData(currentUserId, otherUserId)));
    return id;
  }


  /**
   * Resolves the other participant of a direct-message conversation.
   *
   * @param dm - Conversation whose partner should be resolved.
   * @returns The other participant identifier, or the current identifier for a self conversation.

  conversationPartner(dm: DirectMessage): string {
    const current = this.currentRegisteredUserId();
    return dm.participantIds.find((uid) => uid !== current) ?? current;
  }

  /**
   * Builds the Firestore payload for a direct-message conversation.
   *
   * @param first - First participant identifier.
   * @param second - Second participant identifier.
   * @returns The conversation document payload.

  private directMessageData(first: string, second: string) {
    return {
      participantIds: [...new Set([first, second])].sort(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  }

  /**
   * Creates the deterministic identifier used for a pair of participants.
   *
   * @param first - First participant identifier.
   * @param second - Second participant identifier.
   * @returns The stable sorted conversation identifier.

  private conversationId(first: string, second: string): string {
    return [first, second].sort().join('__');
  }

  /**
   * Returns the current registered user identifier and excludes anonymous sessions.
   *
   * @returns The user identifier, or an empty string for guests and unauthenticated sessions.
   */
  private currentRegisteredUserId(): string {
    const user = this.auth.currentUser;
    return !user || user.isAnonymous ? '' : user.uid;
  }

  /**
   * Sorts direct-message conversations by their deterministic identifier.
   *
   * @param items - Conversations to sort.
   * @returns A new sorted conversation array.
   */
  private sortById(items: DirectMessage[]): DirectMessage[] {
    return [...items].sort((first, second) => first.id.localeCompare(second.id));
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
