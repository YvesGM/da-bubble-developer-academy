import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  collectionData,
  doc,
  docData,
  getDocs,
  query,
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
    const reference = this.runSync(() => doc(this.firestore, 'channels', channelId));
    return this.runSync(() => docData(reference, { idField: 'id' })) as Observable<
      Channel | undefined
    >;
  }

  async createChannel(input: CreateChannelInput): Promise<string> {
    const creatorId = this.currentUserId();
    const name = this.cleanName(input.name);
    await this.assertNameAvailable(name);
    const memberIds = this.uniqueMembers(creatorId, input.memberIds);
    const data = this.buildChannelData(input, name, creatorId, memberIds);
    const reference = await this.run(() => addDoc(this.channelsCollection(), data));
    return reference.id;
  }

  async updateChannel(channelId: string, input: UpdateChannelInput): Promise<void> {
    const name = this.cleanName(input.name);
    await this.assertNameAvailable(name, channelId);
    const reference = this.channelReference(channelId);
    await this.run(() => updateDoc(reference, this.channelChanges(input, name)));
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

  private async assertNameAvailable(name: string, ignoredId?: string): Promise<void> {
    const normalizedName = this.normalizeName(name);
    const request = this.nameQuery(normalizedName);
    const snapshot = await this.run(() => getDocs(request));
    const duplicate = snapshot.docs.some((item) => item.id !== ignoredId);
    if (duplicate) throw new ChannelNameTakenError();
  }

  private nameQuery(normalizedName: string) {
    const reference = this.channelsCollection();
    return this.runSync(() => query(reference, where('normalizedName', '==', normalizedName)));
  }

  private buildChannelData(
    input: CreateChannelInput,
    name: string,
    creatorId: string,
    memberIds: string[],
  ) {
    return {
      name,
      normalizedName: this.normalizeName(name),
      description: input.description.trim(),
      creatorId,
      memberIds,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  }

  private channelChanges(input: UpdateChannelInput, name: string) {
    return {
      name,
      normalizedName: this.normalizeName(name),
      description: input.description.trim(),
      updatedAt: serverTimestamp(),
    };
  }

  private uniqueMembers(creatorId: string, memberIds: string[]): string[] {
    return [...new Set([creatorId, ...memberIds])];
  }

  private cleanName(name: string): string {
    return name.trim().replace(/\s+/g, ' ');
  }

  private normalizeName(name: string): string {
    return this.cleanName(name).toLowerCase();
  }

  private sortChannels(channels: Channel[]): Channel[] {
    return [...channels].sort((first, second) => first.name.localeCompare(second.name, 'de'));
  }

  private currentUserId(): string {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('auth-required');
    return uid;
  }

  private channelsCollection() {
    return this.runSync(() => collection(this.firestore, 'channels'));
  }

  private channelReference(channelId: string) {
    return this.runSync(() => doc(this.firestore, 'channels', channelId));
  }

  private run<T>(action: () => Promise<T>): Promise<T> {
    return runInInjectionContext(this.injector, action);
  }

  private runSync<T>(action: () => T): T {
    return runInInjectionContext(this.injector, action);
  }
}
