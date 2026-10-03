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
  readonly creatorName = computed(() => this.findUser(this.channel()?.creatorId)?.displayName ?? 'Unknown user');
  readonly memberCount = computed(() => this.members().length + (this.channel()?.guestAccess ? 1 : 0));
  readonly overflowCount = computed(() => Math.max(0, this.memberCount() - 5));
  readonly target = computed<ConversationTarget>(() => ({ type: 'channel', id: this.channelId() }));
  readonly emptyTitle = computed(() =>
    this.channel()?.creatorId === this.currentUserId() ? 'You created this channel.' : 'Channel created.',
  );
  readonly emptyText = computed(() => `This is the beginning of the #${this.channel()?.name ?? ''} channel.`);

  readonly showDetails = signal(false);
  readonly showMembers = signal(false);
  readonly showAddMembers = signal(false);
  readonly selectedUser = signal<UserProfile | null>(null);
  readonly showProfileEditor = signal(false);
  readonly channelError = signal('');

  canManageChannel(): boolean {
    return !this.auth.currentUser?.isAnonymous;
  }

  currentUserId(): string {
    return this.auth.currentUser?.uid ?? '';
  }

  openDetails(): void {
    this.channelError.set('');
    this.showDetails.set(true);
  }

  async saveChannel(input: UpdateChannelInput): Promise<void> {
    try {
      await this.channels.updateChannel(this.channelId(), input);
      this.showDetails.set(false);
    } catch (error) {
      this.channelError.set(this.channelErrorMessage(error));
    }
  }

  async addMembers(selection: AddMembersSelection): Promise<void> {
    await this.channels.addMembers(this.channelId(), selection.memberIds, selection.guestAccess);
    this.showAddMembers.set(false);
  }

  async leaveChannel(): Promise<void> {
    if (!this.canManageChannel()) return;
    await this.channels.leaveChannel(this.channelId());
    await this.router.navigateByUrl('/workspace');
  }

  openProfileEditor(): void {
    this.selectedUser.set(null);
    this.showProfileEditor.set(true);
  }

  async startDirectMessage(uid: string): Promise<void> {
    const dmId = await this.directMessages.openConversation(uid);
    this.selectedUser.set(null);
    await this.router.navigate(['/workspace/dm', dmId]);
  }

  openMembers(): void {
    this.showMembers.set(true);
  }

  openAddMembers(): void {
    this.showMembers.set(false);
    this.showAddMembers.set(true);
  }

  openProfile(user: UserProfile): void {
    this.showMembers.set(false);
    this.selectedUser.set(user);
  }

  openProfileById(uid: string): void {
    const user = this.findUser(uid);
    if (user) this.selectedUser.set(user);
  }

  private channelErrorMessage(error: unknown): string {
    if (error instanceof ChannelNameTakenError) return 'This channel name is already in use.';
    return firebaseErrorMessage(error, 'The channel changes could not be saved.');
  }

  private isChannelMember(uid: string): boolean {
    return this.channel()?.memberIds.includes(uid) ?? false;
  }

  private findUser(uid?: string): UserProfile | undefined {
    return this.users().find((user) => user.uid === uid);
  }
}
