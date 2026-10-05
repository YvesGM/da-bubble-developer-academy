import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  DocumentReference,
  Firestore,
  Transaction,
  arrayRemove,
  arrayUnion,
  collection,
  collectionData,
  doc,
  docData,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';

import { ChannelNameTakenError } from '../errors/channel-name-taken.error';
import { Channel, CreateChannelInput, UpdateChannelInput } from '../models/channel.model';
import { timestampToDate } from '../utils/timestamp.util';

@Injectable({ providedIn: 'root' })
export class ChannelService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(EnvironmentInjector);

  /** Observes channels available to the current registered or guest user. */
  observeCurrentUserChannels(): Observable<Channel[]> {
    const request = this.currentUserChannelQuery();
    const channels = this.runSync(() => collectionData(request, { idField: 'id' }));
    return (channels as Observable<Channel[]>).pipe(map((items) => this.sortChannels(items)));
  }

  /** Observes one channel document by id. */
  observeChannel(channelId: string): Observable<Channel | undefined> {
    const reference = this.channelReference(channelId);
    return this.runSync(() => docData(reference, { idField: 'id' })) as Observable<
      Channel | undefined
    >;
  }

  /** Creates a channel while atomically reserving its normalized name. */
  async createChannel(input: CreateChannelInput): Promise<string> {
    const creatorId = this.currentUserId();
    const name = this.cleanName(input.name);
    const channelRef = this.newChannelReference();
    await this.run(() => this.createChannelTransaction(channelRef, input, name, creatorId));
    return channelRef.id;
  }

  /** Updates channel metadata while preserving unique channel names. */
  async updateChannel(channelId: string, input: UpdateChannelInput): Promise<void> {
    const channelRef = this.channelReference(channelId);
    const name = this.cleanName(input.name);
    await this.run(() => this.updateChannelTransaction(channelRef, input, name));
  }

  /** Adds registered members and optionally enables guest access. */
  async addMembers(channelId: string, memberIds: string[], guestAccess: boolean): Promise<void> {
    if (!memberIds.length && !guestAccess) return;
    const reference = this.channelReference(channelId);
    const changes = this.memberChanges(memberIds, guestAccess);
    await this.run(() => updateDoc(reference, changes));
  }

  /** Removes the current registered user from a channel. */
  async leaveChannel(channelId: string): Promise<void> {
    if (this.auth.currentUser?.isAnonymous) return;
    const reference = this.channelReference(channelId);
    const changes = { memberIds: arrayRemove(this.currentUserId()), updatedAt: serverTimestamp() };
    await this.run(() => updateDoc(reference, changes));
  }

  private currentUserChannelQuery() {
    const reference = this.channelsCollection();
    if (this.auth.currentUser?.isAnonymous) {
      return this.runSync(() => query(reference, where('guestAccess', '==', true)));
    }
    return this.runSync(() =>
      query(reference, where('memberIds', 'array-contains', this.currentUserId())),
    );
  }

  private memberChanges(memberIds: string[], guestAccess: boolean) {
    const changes: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (memberIds.length) changes['memberIds'] = arrayUnion(...memberIds);
    if (guestAccess) changes['guestAccess'] = true;
    return changes;
  }

  private async createChannelTransaction(
    channelRef: DocumentReference,
    input: CreateChannelInput,
    name: string,
    creatorId: string,
  ): Promise<void> {
    await runTransaction(this.firestore, (transaction) =>
      this.writeNewChannel(transaction, channelRef, input, name, creatorId),
    );
  }

  private async writeNewChannel(
    transaction: Transaction,
    channelRef: DocumentReference,
    input: CreateChannelInput,
    name: string,
    creatorId: string,
  ): Promise<void> {
    const registryRef = this.nameReference(name);
    if ((await transaction.get(registryRef)).exists()) throw new ChannelNameTakenError();
    const data = this.buildChannelData(input, name, creatorId);
    transaction.set(channelRef, data);
    transaction.set(registryRef, this.nameRegistry(channelRef.id, data));
  }

  private async updateChannelTransaction(
    channelRef: DocumentReference,
    input: UpdateChannelInput,
    name: string,
  ): Promise<void> {
    await runTransaction(this.firestore, async (transaction) => {
      const snapshot = await transaction.get(channelRef);
      if (!snapshot.exists()) throw new Error('channel-not-found');
      const current = snapshot.data() as Channel;
      await this.moveNameRegistry(transaction, channelRef.id, current, name);
      transaction.update(channelRef, this.channelChanges(input, name));
    });
  }

  private async moveNameRegistry(
    transaction: Transaction,
    channelId: string,
    current: Channel,
    name: string,
  ): Promise<void> {
    const previousKey = current.nameKey || this.nameKey(current.name);
    if (this.nameKey(name) === previousKey) return;
    await this.replaceNameRegistry(transaction, channelId, previousKey, name);
  }

  private async replaceNameRegistry(
    transaction: Transaction,
    channelId: string,
    previousKey: string,
    name: string,
  ): Promise<void> {
    const nextRef = this.nameReference(name);
    if ((await transaction.get(nextRef)).exists()) throw new ChannelNameTakenError();
    transaction.delete(this.nameReferenceByKey(previousKey));
    transaction.set(nextRef, this.nameRegistry(channelId, this.channelChanges({}, name)));
  }

  private buildChannelData(input: CreateChannelInput, name: string, creatorId: string) {
    return {
      name,
      normalizedName: this.normalizeName(name),
      nameKey: this.nameKey(name),
      description: input.description.trim(),
      creatorId,
      memberIds: this.registeredMembers(creatorId, input.memberIds),
      guestAccess: this.auth.currentUser?.isAnonymous ? true : input.guestAccess,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  }

  private channelChanges(input: Partial<UpdateChannelInput>, name: string) {
    return {
      name,
      normalizedName: this.normalizeName(name),
      nameKey: this.nameKey(name),
      ...(input.description !== undefined ? { description: input.description.trim() } : {}),
      updatedAt: serverTimestamp(),
    };
  }

  private nameRegistry(channelId: string, data: { normalizedName: string }) {
    return { channelId, normalizedName: data.normalizedName };
  }

  private registeredMembers(creatorId: string, memberIds: string[]): string[] {
    const ids = this.auth.currentUser?.isAnonymous ? memberIds : [creatorId, ...memberIds];
    return [...new Set(ids.filter(Boolean))];
  }

  private cleanName(name: string): string {
    return name.trim().replace(/^#+\s*/, '').replace(/\s+/g, ' ');
  }

  private normalizeName(name: string): string {
    return this.cleanName(name).toLowerCase();
  }

  private nameKey(name: string): string {
    return encodeURIComponent(this.normalizeName(name));
  }

  private sortChannels(channels: Channel[]): Channel[] {
    return [...channels].sort((first, second) => {
      const timeDifference = this.channelTime(first) - this.channelTime(second);
      return timeDifference || first.name.localeCompare(second.name, 'de');
    });
  }

  private channelTime(channel: Channel): number {
    return timestampToDate(channel.createdAt)?.getTime() ?? 0;
  }

  private currentUserId(): string {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('auth-required');
    return uid;
  }

  private channelsCollection() {
    return this.runSync(() => collection(this.firestore, 'channels'));
  }

  private newChannelReference(): DocumentReference {
    return this.runSync(() => doc(this.channelsCollection()));
  }

  private channelReference(channelId: string): DocumentReference {
    return this.runSync(() => doc(this.firestore, 'channels', channelId));
  }

  private nameReference(name: string): DocumentReference {
    return this.nameReferenceByKey(this.nameKey(name));
  }

  private nameReferenceByKey(nameKey: string): DocumentReference {
    return this.runSync(() => doc(this.firestore, 'channelNames', nameKey));
  }

  private run<T>(action: () => Promise<T>): Promise<T> {
    return runInInjectionContext(this.injector, action);
  }

  private runSync<T>(action: () => T): T {
    return runInInjectionContext(this.injector, action);
  }
}
