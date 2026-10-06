import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import { Auth, User, updateProfile } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';

import { DEFAULT_RECENT_EMOJIS } from '../constants/emoji.constants';
import { UserProfile } from '../models/user-profile.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(EnvironmentInjector);

  /**
   * Observes all visible registered workspace users.
   *
   * Guest profiles are excluded and the resulting list is sorted alphabetically
   * by display name before it is exposed to consumers.
   *
   * @returns An observable that emits the current visible user profiles.
   */
  observeUsers(): Observable<UserProfile[]> {
    const reference = this.runSync(() => collection(this.firestore, 'users'));
    const users = this.runSync(() => collectionData(reference, { idField: 'uid' }));
    return (users as Observable<UserProfile[]>).pipe(map((items) => this.visibleUsers(items)));
  }

  /**
   * Observes the application profile belonging to the current registered user.
   *
   * Anonymous sessions do not own a persistent profile and therefore receive a
   * completed observable containing `undefined`.
   *
   * @returns An observable emitting the current profile or `undefined` for guests.
   */
  observeCurrentProfile(): Observable<UserProfile | undefined> {
    const uid = this.auth.currentUser?.uid;
    if (!uid || this.auth.currentUser?.isAnonymous) return new Observable((subscriber) => {
      subscriber.next(undefined);
      subscriber.complete();
    });
    const reference = this.userReference(uid);
    return this.runSync(() => docData(reference, { idField: 'uid' })) as Observable<UserProfile>;
  }

  /**
   * Creates the Firestore application profile for a Firebase user.
   *
   * @param user - Firebase Authentication user that owns the profile.
   * @param displayName - Optional display name override.
   * @param avatarId - Avatar identifier stored with the new profile.
   * @returns A promise that resolves after the profile document is written.
   * @throws If Firestore rejects the profile creation.
   */
  async createProfile(user: User, displayName?: string, avatarId = 'avatar-1'): Promise<void> {
    const reference = this.userReference(user.uid);
    await this.run(() => setDoc(reference, this.buildProfile(user, displayName, avatarId)));
  }

  /**
   * Ensures that an authenticated Firebase user has a synchronized app profile.
   *
   * Missing profiles are created. Existing profiles only receive a display-name
   * update when the supplied value differs from the stored value.
   *
   * @param user - Firebase Authentication user to synchronize.
   * @param displayName - Optional display name that should be reflected in Firestore.
   * @returns A promise that resolves after profile verification or synchronization.
   * @throws If Firestore profile reads or writes fail.
   */
  async ensureProfile(user: User, displayName?: string): Promise<void> {
    const reference = this.userReference(user.uid);
    const snapshot = await this.run(() => getDoc(reference));
    if (!snapshot.exists()) return this.createProfile(user, displayName);
    await this.syncDisplayName(reference, snapshot.data(), displayName);
  }

  /**
   * Updates the current registered user's display name and avatar.
   *
   * The display name is written to Firebase Authentication first and then the
   * matching Firestore profile is updated with the name, avatar and timestamp.
   *
   * @param displayName - New display name for the user.
   * @param avatarId - Identifier of the selected avatar.
   * @returns A promise that resolves after both profile stores are updated.
   * @throws If no registered user is available or either update fails.
   */
  async updateCurrentProfile(displayName: string, avatarId: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user || user.isAnonymous) throw new Error('profile-not-available');
    await this.run(() => updateProfile(user, { displayName }));
    await this.run(() => updateDoc(this.userReference(user.uid), this.profileChanges(displayName, avatarId)));
  }

  /**
   * Persists the workspace display name owned by the current registered user.
   *
   * @param workspaceName - New workspace name; leading and trailing whitespace is removed.
   * @returns A promise that resolves after the Firestore profile update completes.
   * @throws If the current session has no registered profile or Firestore rejects the update.
   */
  async updateWorkspaceName(workspaceName: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user || user.isAnonymous) throw new Error('workspace-not-available');
    const changes = { workspaceName: workspaceName.trim(), updatedAt: serverTimestamp() };
    await this.run(() => updateDoc(this.userReference(user.uid), changes));
  }

  /**
   * Stores an emoji in the current user's two-item recent-emoji history.
   *
   * Anonymous sessions are ignored. Existing occurrences are de-duplicated before
   * the selected emoji is moved to the front of the history.
   *
   * @param emoji - Emoji that was most recently selected by the user.
   * @returns A promise that resolves after Firestore is updated, or immediately for guests.
   * @throws If the profile read or update fails.
   */
  async rememberEmoji(emoji: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user || user.isAnonymous) return;
    const snapshot = await this.run(() => getDoc(this.userReference(user.uid)));
    const current = (snapshot.data() as UserProfile | undefined)?.recentEmojis ?? [];
    await this.run(() => updateDoc(this.userReference(user.uid), { recentEmojis: this.nextEmojis(emoji, current) }));
  }

  /**
   * Filters guest profiles from a user list and returns a sorted copy.
   *
   * @param users - Profiles to filter.
   * @returns Visible registered users sorted by display name.
   */
  private visibleUsers(users: UserProfile[]): UserProfile[] {
    return this.sortUsers(users.filter((user) => !user.isGuest));
  }

  /**
   * Builds the recent-emoji list with the latest emoji first and without duplicates.
   *
   * @param emoji - Most recently used emoji.
   * @param current - Previously stored recent emojis.
   * @returns At most two recent emojis.
   */
  private nextEmojis(emoji: string, current: string[]): string[] {
    return [emoji, ...current.filter((item) => item !== emoji)].slice(0, 2);
  }

  /**
   * Builds the Firestore payload for profile display-name and avatar changes.
   *
   * @param displayName - New display name.
   * @param avatarId - New avatar identifier.
   * @returns The profile update payload.
   */
  private profileChanges(displayName: string, avatarId: string) {
    return { displayName: displayName.trim(), avatarId, updatedAt: serverTimestamp() };
  }

  /**
   * Synchronizes a stored profile display name when it differs from the supplied Firebase name.
   *
   * @param reference - Firestore profile document reference.
   * @param data - Current profile document data.
   * @param name - Optional display name to synchronize.
   */
  private async syncDisplayName(reference: ReturnType<typeof doc>, data: unknown, name?: string) {
    if (!name || !this.needsDisplayNameUpdate(data, name)) return;
    await this.run(() => updateDoc(reference, { displayName: name, updatedAt: serverTimestamp() }));
  }

  /**
   * Checks whether the stored profile data requires a display-name update.
   *
   * @param data - Current profile document data.
   * @param name - Expected display name.
   * @returns Whether the stored display name differs from the expected value.
   */
  private needsDisplayNameUpdate(data: unknown, name: string): boolean {
    if (!data || typeof data !== 'object') return true;
    return (data as { displayName?: string }).displayName !== name;
  }

  /**
   * Sorts user profiles alphabetically by display name.
   *
   * @param users - Profiles to sort.
   * @returns A new sorted user array.
   */
  private sortUsers(users: UserProfile[]): UserProfile[] {
    return [...users].sort((first, second) => first.displayName.localeCompare(second.displayName, 'en'));
  }

  /**
   * Returns the Firestore document reference for a user profile.
   *
   * @param uid - Firebase user identifier.
   * @returns The user's profile document reference.
   */
  private userReference(uid: string) {
    return this.runSync(() => doc(this.firestore, 'users', uid));
  }

  /**
   * Builds a complete application profile from a Firebase user and optional overrides.
   *
   * @param user - Firebase user that owns the profile.
   * @param displayName - Optional display-name override.
   * @param avatarId - Avatar identifier to store.
   * @returns The complete user profile payload.
   */
  private buildProfile(user: User, displayName?: string, avatarId = 'avatar-1'): UserProfile {
    return {
      uid: user.uid,
      email: user.email,
      displayName: displayName || user.displayName || 'User',
      avatarId,
      isGuest: user.isAnonymous,
      recentEmojis: [...DEFAULT_RECENT_EMOJIS],
      workspaceName: 'Workspace',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
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
