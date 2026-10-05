import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth } from '@angular/fire/auth';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map, switchMap } from 'rxjs';

import { ChannelNameTakenError } from '../../../core/errors/channel-name-taken.error';
import { UpdateChannelInput } from '../../../core/models/channel.model';
import { ConversationTarget } from '../../../core/models/conversation.model';
import { UserProfile } from '../../../core/models/user-profile.model';
import { ChannelService } from '../../../core/services/channel.service';
import { DirectMessageService } from '../../../core/services/direct-message.service';
import { UserService } from '../../../core/services/user.service';
import { firebaseErrorMessage } from '../../../core/utils/firebase-error.util';
import { ProfileCard } from '../../profile/profile-card/profile-card';
import { ProfileDialog } from '../../profile/profile-dialog/profile-dialog';
import { Avatar } from '../../../shared/components/avatar/avatar';
import {
  AddMembersDialog,
  AddMembersSelection,
} from '../components/add-members-dialog/add-members-dialog';
import { ChannelDetailsDialog } from '../components/channel-details-dialog/channel-details-dialog';
import { ChannelMembersDialog } from '../components/channel-members-dialog/channel-members-dialog';
import { ChatPanel } from '../components/chat-panel/chat-panel';

@Component({
  selector: 'app-channel-view',
  imports: [
    RouterLink,
    Avatar,
    ProfileCard,
    ProfileDialog,
    AddMembersDialog,
    ChannelDetailsDialog,
    ChannelMembersDialog,
    ChatPanel,
  ],
  templateUrl: './channel-view.html',
  styleUrl: './channel-view.scss',
})
export class ChannelView {
  private readonly auth = inject(Auth);
  private readonly channels = inject(ChannelService);
  private readonly directMessages = inject(DirectMessageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly usersService = inject(UserService);

  readonly channelId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('channelId') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('channelId') ?? '' },
  );
  readonly channel = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('channelId') ?? ''),
      switchMap((id) => this.channels.observeChannel(id)),
    ),
  );
  readonly users = toSignal(this.usersService.observeUsers(), { initialValue: [] });
  readonly members = computed(() => this.users().filter((user) => this.isChannelMember(user.uid)));
  readonly availableUsers = computed(() => this.users().filter((user) => !this.isChannelMember(user.uid)));
  readonly visibleMembers = computed(() => this.members().slice(0, 5));
  readonly creatorName = computed(() => this.findUser(this.channel()?.creatorId)?.displayName ?? 'Unbekannter Benutzer');
  readonly memberCount = computed(() => this.members().length + (this.channel()?.guestAccess ? 1 : 0));
  readonly overflowCount = computed(() => Math.max(0, this.memberCount() - 5));
  readonly target = computed<ConversationTarget>(() => ({ type: 'channel', id: this.channelId() }));
  readonly emptyTitle = computed(() =>
    this.channel()?.creatorId === this.currentUserId() ? 'Du hast diesen Channel erstellt.' : 'Channel wurde erstellt.',
  );
  readonly emptyText = computed(() => `Das ist der Anfang des Channels #${this.channel()?.name ?? ''}.`);

  readonly showDetails = signal(false);
  readonly showMembers = signal(false);
  readonly showAddMembers = signal(false);
  readonly selectedUser = signal<UserProfile | null>(null);
  readonly showProfileEditor = signal(false);
  readonly channelError = signal('');

  /**
   * Determines whether the current session may use channel-management actions.
   *
   * @returns Whether channel management is available for the current user.
   */
  canManageChannel(): boolean {
    return !this.auth.currentUser?.isAnonymous;
  }

  /**
   * Returns the current Firebase user identifier.
   *
   * @returns The active user identifier, or an empty string when unavailable.
   */
  currentUserId(): string {
    return this.auth.currentUser?.uid ?? '';
  }

  /**
   * Opens the channel details dialog and clears stale channel errors.
   */
  openDetails(): void {
    this.channelError.set('');
    this.showDetails.set(true);
  }

  /**
   * Persists edited channel metadata and updates the visible error state.
   *
   * @param input - Updated channel name and description.
   * @returns A promise that resolves after save handling completes.
   */
  async saveChannel(input: UpdateChannelInput): Promise<void> {
    try {
      await this.channels.updateChannel(this.channelId(), input);
      this.channelError.set('');
    } catch (error) {
      this.channelError.set(this.channelErrorMessage(error));
    }
  }

  /**
   * Adds the selected members and guest-access setting to the current channel.
   *
   * @param selection - Selected member identifiers and guest-access flag.
   * @returns A promise that resolves after the membership update completes.
   */
  async addMembers(selection: AddMembersSelection): Promise<void> {
    await this.channels.addMembers(this.channelId(), selection.memberIds, selection.guestAccess);
    this.showAddMembers.set(false);
  }

  /**
   * Removes the current registered user from the channel and returns to the workspace.
   *
   * @returns A promise that resolves after the leave action and navigation complete.
   */
  async leaveChannel(): Promise<void> {
    if (!this.canManageChannel()) return;
    await this.channels.leaveChannel(this.channelId());
    await this.router.navigateByUrl('/workspace');
  }

  /**
   * Opens the current user's profile editor and closes any selected profile card.
   */
  openProfileEditor(): void {
    this.selectedUser.set(null);
    this.showProfileEditor.set(true);
  }

  /**
   * Opens or creates a direct-message conversation with the selected user.
   *
   * @param uid - Identifier of the user to message.
   * @returns A promise that resolves after conversation creation and navigation complete.
   */
  async startDirectMessage(uid: string): Promise<void> {
    const dmId = await this.directMessages.openConversation(uid);
    this.selectedUser.set(null);
    await this.router.navigate(['/workspace/dm', dmId]);
  }

  /**
   * Opens the dialog that lists members of the current channel.
   */
  openMembers(): void {
    this.showMembers.set(true);
  }

  /**
   * Closes the member list and opens the dialog for adding more members.
   */
  openAddMembers(): void {
    this.showMembers.set(false);
    this.showAddMembers.set(true);
  }

  /**
   * Opens the profile card for a selected channel member.
   *
   * @param user - User profile to display.
   */
  openProfile(user: UserProfile): void {
    this.showMembers.set(false);
    this.selectedUser.set(user);
  }

  /**
   * Resolves a visible user by identifier and opens that user's profile card.
   *
   * @param uid - User identifier to resolve.
   */
  openProfileById(uid: string): void {
    const user = this.findUser(uid);
    if (user) this.selectedUser.set(user);
  }

  /**
   * Maps channel-operation failures to localized user-facing messages.
   *
   * @param error - Error returned by a channel operation.
   * @returns The message to display in the channel view.
   */
  private channelErrorMessage(error: unknown): string {
    if (error instanceof ChannelNameTakenError) return 'Dieser Channelname wird bereits verwendet.';
    return firebaseErrorMessage(error, 'Die Änderungen am Channel konnten nicht gespeichert werden.');
  }

  /**
   * Checks whether a user belongs to the current channel.
   *
   * @param uid - User identifier to test.
   * @returns Whether the user is a channel member.
   */
  private isChannelMember(uid: string): boolean {
    return this.channel()?.memberIds.includes(uid) ?? false;
  }

  /**
   * Resolves a visible user profile by Firebase identifier.
   *
   * @param uid - Optional user identifier to resolve.
   * @returns The matching profile when available.
   */
  private findUser(uid?: string): UserProfile | undefined {
    return this.users().find((user) => user.uid === uid);
  }
}
