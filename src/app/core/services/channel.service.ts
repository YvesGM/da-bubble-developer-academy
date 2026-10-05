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


  /**
   * Observes the channels accessible to the current registered user or anonymous guest.
   *
   * @returns An observable that emits the accessible channels sorted by creation time and name.

   */
  observeCurrentUserChannels(): Observable<Channel[]> {
    const request = this.currentUserChannelQuery();
    const channels = this.runSync(() => collectionData(request, { idField: 'id' }));
    return (channels as Observable<Channel[]>).pipe(map((items) => this.sortChannels(items)));
  }


  /**
   * Observes a single channel document.
   *
   * @param channelId - Firestore identifier of the channel to observe.
   * @returns An observable that emits the channel when it exists.

   */
  observeChannel(channelId: string): Observable<Channel | undefined> {
    const reference = this.channelReference(channelId);
    return this.runSync(() => docData(reference, { idField: 'id' })) as Observable<
      Channel | undefined
    >;
  }


  /**
   * Creates a channel and atomically reserves its normalized name to prevent duplicates.
   *
   * @param input - Name, description, membership and guest-access settings for the new channel.
   * @returns The Firestore identifier of the created channel.
   * @throws If the normalized channel name is already reserved or the transaction fails.

   */
  async createChannel(input: CreateChannelInput): Promise<string> {
    const creatorId = this.currentUserId();
    const name = this.cleanName(input.name);
    const channelRef = this.newChannelReference();
    await this.run(() => this.createChannelTransaction(channelRef, input, name, creatorId));
    return channelRef.id;
  }


  /**
   * Updates channel metadata and moves the unique-name registry entry when the channel name changes.
   *
   * @param channelId - Identifier of the channel to update.
   * @param input - Updated channel name and description.
   * @throws If the channel does not exist, the name is already taken or the transaction fails.

   */
  async updateChannel(channelId: string, input: UpdateChannelInput): Promise<void> {
    const channelRef = this.channelReference(channelId);
    const name = this.cleanName(input.name);
    await this.run(() => this.updateChannelTransaction(channelRef, input, name));
  }


  /**
   * Adds registered members to a channel and optionally enables guest access.
   *
   * @param channelId - Identifier of the channel to update.
   * @param memberIds - User identifiers to add to the member list.
   * @param guestAccess - Whether guest access should be enabled.
   * @throws If Firestore rejects the update.

   */
  async addMembers(channelId: string, memberIds: string[], guestAccess: boolean): Promise<void> {
    if (!memberIds.length && !guestAccess) return;
    const reference = this.channelReference(channelId);
    const changes = this.memberChanges(memberIds, guestAccess);
    await this.run(() => updateDoc(reference, changes));
  }


  /**
   * Removes the current registered user from a channel.
   *
   * @param channelId - Identifier of the channel to leave.
   * @throws If the user is unauthenticated or Firestore rejects the update.

   */
  async leaveChannel(channelId: string): Promise<void> {
    if (this.auth.currentUser?.isAnonymous) return;
    const reference = this.channelReference(channelId);
    const changes = { memberIds: arrayRemove(this.currentUserId()), updatedAt: serverTimestamp() };
    await this.run(() => updateDoc(reference, changes));
  }

  /**
   * Builds the Firestore query used to load channels visible to the current session.
   *
   * @returns A query filtered either by membership or guest access.

   */
  private currentUserChannelQuery() {
    const reference = this.channelsCollection();
    if (this.auth.currentUser?.isAnonymous) {
      return this.runSync(() => query(reference, where('guestAccess', '==', true)));
    }
    return this.runSync(() =>
      query(reference, where('memberIds', 'array-contains', this.currentUserId())),
    );
  }

  /**
   * Builds the partial Firestore update used when adding members or guest access.
   *
   * @param memberIds - User identifiers to add.
   * @param guestAccess - Whether guest access should be enabled.
   * @returns A Firestore update object.

   */
  private memberChanges(memberIds: string[], guestAccess: boolean) {
    const changes: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (memberIds.length) changes['memberIds'] = arrayUnion(...memberIds);
    if (guestAccess) changes['guestAccess'] = true;
    return changes;
  }

  /**
   * Runs the transaction that creates both the channel and its unique-name registry entry.
   *
   * @param channelRef - Reference of the channel document to create.
   * @param input - Channel creation data.
   * @param name - Sanitized channel name.
   * @param creatorId - Identifier of the creating user.
   * @throws If the name is already reserved or the transaction fails.

   */
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

  /**
   * Writes a new channel and its registry entry inside an existing transaction.
   *
   * @param transaction - Active Firestore transaction.
   * @param channelRef - Reference of the channel document.
   * @param input - Channel creation data.
   * @param name - Sanitized channel name.
   * @param creatorId - Identifier of the creating user.
   * @throws If the normalized name already exists.

   */
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

  /**
   * Runs the transaction that updates channel metadata and its unique-name registry.
   *
   * @param channelRef - Reference of the channel document to update.
   * @param input - Updated channel values.
   * @param name - Sanitized new channel name.
   * @throws If the channel does not exist or the update fails.

   */
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

  /**
   * Moves the channel name registry entry when the normalized channel name changes.
   *
   * @param transaction - Active Firestore transaction.
   * @param channelId - Identifier of the channel.
   * @param current - Current channel data.
   * @param name - Sanitized new channel name.
   * @throws If the new name is already reserved.

   */
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

  /**
   * Replaces the previous unique-name registry entry with the next one.
   *
   * @param transaction - Active Firestore transaction.
   * @param channelId - Identifier of the channel.
   * @param previousKey - Current normalized registry key.
   * @param name - New sanitized channel name.
   * @throws If the next registry entry already exists.

   */
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

  /**
   * Builds the Firestore payload for a newly created channel.
   *
   * @param input - Channel creation values.
   * @param name - Sanitized channel name.
   * @param creatorId - Identifier of the creating user.
   * @returns The complete channel document payload.

   */
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

  /**
   * Builds the Firestore payload for a channel metadata update.
   *
   * @param input - Partial update values.
   * @param name - Sanitized channel name.
   * @returns The partial channel update payload.

   */
  private channelChanges(input: Partial<UpdateChannelInput>, name: string) {
    return {
      name,
      normalizedName: this.normalizeName(name),
      nameKey: this.nameKey(name),
      ...(input.description !== undefined ? { description: input.description.trim() } : {}),
      updatedAt: serverTimestamp(),
    };
  }

  /**
   * Builds the registry payload used to reserve a normalized channel name.
   *
   * @param channelId - Identifier of the channel that owns the name.
   * @param data - Data containing the normalized channel name.
   * @returns The channel-name registry document payload.

   */
  private nameRegistry(channelId: string, data: { normalizedName: string }) {
    return { channelId, normalizedName: data.normalizedName };
  }

  /**
   * Builds a unique member list and guarantees that registered creators remain members.
   *
   * @param creatorId - Identifier of the channel creator.
   * @param memberIds - Requested member identifiers.
   * @returns A de-duplicated member identifier list.

   */
  private registeredMembers(creatorId: string, memberIds: string[]): string[] {
    const ids = this.auth.currentUser?.isAnonymous ? memberIds : [creatorId, ...memberIds];
    return [...new Set(ids.filter(Boolean))];
  }

  /**
   * Sanitizes a channel name by removing a leading hash and normalizing whitespace.
   *
   * @param name - Raw channel name.
   * @returns The cleaned channel name.

   */
  private cleanName(name: string): string {
    return name.trim().replace(/^#+\s*/, '').replace(/\s+/g, ' ');
  }

  /**
   * Normalizes a channel name for case-insensitive duplicate detection.
   *
   * @param name - Channel name to normalize.
   * @returns The lowercase sanitized channel name.

   */
  private normalizeName(name: string): string {
    return this.cleanName(name).toLowerCase();
  }

  /**
   * Encodes the normalized channel name for use as a Firestore document key.
   *
   * @param name - Channel name to encode.
   * @returns The encoded unique-name registry key.

   */
  private nameKey(name: string): string {
    return encodeURIComponent(this.normalizeName(name));
  }

  /**
   * Sorts channels chronologically and then alphabetically for deterministic display.
   *
   * @param channels - Channels to sort.
   * @returns A new sorted channel array.

   */
  private sortChannels(channels: Channel[]): Channel[] {
    return [...channels].sort((first, second) => {
      const timeDifference = this.channelTime(first) - this.channelTime(second);
      return timeDifference || first.name.localeCompare(second.name, 'de');
    });
  }

  /**
   * Converts a channel creation timestamp into a numeric sort value.
   *
   * @param channel - Channel whose creation time should be read.
   * @returns The creation timestamp in milliseconds, or zero when unavailable.

   */
  private channelTime(channel: Channel): number {
    return timestampToDate(channel.createdAt)?.getTime() ?? 0;
  }

  /**
   * Returns the current Firebase user identifier.
   *
   * @returns The authenticated user's identifier.
   * @throws If no Firebase user is authenticated.

   */
  private currentUserId(): string {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('auth-required');
    return uid;
  }

  /**
   * Returns the Firestore collection reference for channels.
   *
   * @returns The channels collection reference.
   */
  private channelsCollection() {
    return this.runSync(() => collection(this.firestore, 'channels'));
  }

  /**
   * Creates a new unsaved document reference in the channels collection.
   *
   * @returns A new Firestore document reference.
   */
  private newChannelReference(): DocumentReference {
    return this.runSync(() => doc(this.channelsCollection()));
  }

  /**
   * Builds a Firestore document reference for a channel.
   *
   * @param channelId - Channel identifier.
   * @returns The channel document reference.
   */
  private channelReference(channelId: string): DocumentReference {
    return this.runSync(() => doc(this.firestore, 'channels', channelId));
  }

  /**
   * Builds a registry reference from a human-readable channel name.
   *
   * @param name - Channel name.
   * @returns The corresponding channel-name registry reference.
   */
  private nameReference(name: string): DocumentReference {
    return this.nameReferenceByKey(this.nameKey(name));
  }

  /**
   * Builds a registry reference from an encoded normalized key.
   *
   * @param nameKey - Encoded normalized channel-name key.
   * @returns The corresponding registry document reference.
   */
  private nameReferenceByKey(nameKey: string): DocumentReference {
    return this.runSync(() => doc(this.firestore, 'channelNames', nameKey));
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
