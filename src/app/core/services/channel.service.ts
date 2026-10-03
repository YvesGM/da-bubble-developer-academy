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

@Injectable({ providedIn: 'root' })
export class ChannelService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(EnvironmentInjector);

  observeCurrentUserChannels(): Observable<Channel[]> {
    const uid = this.currentUserId();
    const reference = this.channelsCollection();
    const request = this.runSync(() => query(reference, where('memberIds', 'array-contains', uid)));
    const channels = this.runSync(() => collectionData(request, { idField: 'id' }));
    return (channels as Observable<Channel[]>).pipe(map((items) => this.sortChannels(items)));
  }

  observeChannel(channelId: string): Observable<Channel | undefined> {
    const reference = this.channelReference(channelId);
    return this.runSync(() => docData(reference, { idField: 'id' })) as Observable<
      Channel | undefined
    >;
  }

  async createChannel(input: CreateChannelInput): Promise<string> {
    const creatorId = this.currentUserId();
    const name = this.cleanName(input.name);
    const channelRef = this.newChannelReference();
    await this.run(() => this.createChannelTransaction(channelRef, input, name, creatorId));
    return channelRef.id;
  }

  async updateChannel(channelId: string, input: UpdateChannelInput): Promise<void> {
    const channelRef = this.channelReference(channelId);
    const name = this.cleanName(input.name);
    await this.run(() => this.updateChannelTransaction(channelRef, input, name));
  }

  async addMembers(channelId: string, memberIds: string[]): Promise<void> {
    if (!memberIds.length) return;
    const reference = this.channelReference(channelId);
    const changes = { memberIds: arrayUnion(...memberIds), updatedAt: serverTimestamp() };
    await this.run(() => updateDoc(reference, changes));
  }

  async leaveChannel(channelId: string): Promise<void> {
    const reference = this.channelReference(channelId);
    const changes = { memberIds: arrayRemove(this.currentUserId()), updatedAt: serverTimestamp() };
    await this.run(() => updateDoc(reference, changes));
  }

  private async createChannelTransaction(
    channelRef: DocumentReference,
    input: CreateChannelInput,
    name: string,
    creatorId: string,
  ): Promise<void> {
    await runTransaction(this.firestore, async (transaction) => {
      const registryRef = this.nameReference(name);
      const registry = await transaction.get(registryRef);
      if (registry.exists()) throw new ChannelNameTakenError();
      const data = this.buildChannelData(input, name, creatorId);
      transaction.set(channelRef, data);
      transaction.set(registryRef, this.nameRegistry(channelRef.id, data));
    });
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
    const nextKey = this.nameKey(name);
    const previousKey = current.nameKey || this.nameKey(current.name);
    if (nextKey === previousKey) return;
    const nextRef = this.nameReference(name);
    const existing = await transaction.get(nextRef);
    if (existing.exists()) throw new ChannelNameTakenError();
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
      memberIds: this.uniqueMembers(creatorId, input.memberIds),
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

  private uniqueMembers(creatorId: string, memberIds: string[]): string[] {
    return [...new Set([creatorId, ...memberIds].filter(Boolean))];
  }

  private cleanName(name: string): string {
    return name.trim().replace(/\s+/g, ' ');
  }

  private normalizeName(name: string): string {
    return this.cleanName(name).toLowerCase();
  }

  private nameKey(name: string): string {
    return encodeURIComponent(this.normalizeName(name));
  }

  private sortChannels(channels: Channel[]): Channel[] {
    return [...channels].sort((first, second) => first.name.localeCompare(second.name, 'en'));
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
