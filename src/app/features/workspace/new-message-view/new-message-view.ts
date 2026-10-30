import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth } from '@angular/fire/auth';
import { Router, RouterLink } from '@angular/router';

import { Channel } from '../../../core/models/channel.model';
import { ConversationTarget, conversationRoute } from '../../../core/models/conversation.model';
import { UserProfile } from '../../../core/models/user-profile.model';
import { ChannelService } from '../../../core/services/channel.service';
import { DirectMessageService } from '../../../core/services/direct-message.service';
import { MessageService } from '../../../core/services/message.service';
import { UserService } from '../../../core/services/user.service';
import { InputCaretDirective } from '../../../shared/directives/input-caret.directive';
import { MessageInput } from '../components/message-input/message-input';

@Component({
  selector: 'app-new-message-view',
  imports: [InputCaretDirective, RouterLink, MessageInput],
  templateUrl: './new-message-view.html',
  styleUrl: './new-message-view.scss',
})
export class NewMessageView {
  private readonly auth = inject(Auth);
  private readonly channelsService = inject(ChannelService);
  private readonly directMessages = inject(DirectMessageService);
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);
  private readonly usersService = inject(UserService);

  readonly query = signal('');
  readonly selectedUser = signal<UserProfile | null>(null);
  readonly selectedChannel = signal<Channel | null>(null);
  readonly users = toSignal(this.usersService.observeUsers(), { initialValue: [] });
  readonly channels = toSignal(this.channelsService.observeCurrentUserChannels(), { initialValue: [] });
  readonly profile = toSignal(this.usersService.observeCurrentProfile());
  readonly mode = computed<'@' | '#'>(() => this.query().trim().startsWith('#') ? '#' : '@');
  readonly recipientSelected = computed(() => !!(this.selectedUser() || this.selectedChannel()));
  readonly sendAction = (text: string): Promise<void> => this.sendNewMessage(text);

  /** Clears the selected recipient when the user changes the address. */
  updateQuery(value: string): void {
    this.query.set(value);
    this.selectedUser.set(null);
    this.selectedChannel.set(null);
  }

  /** Filters workspace users by their display name or email address. */
  filteredUsers(): UserProfile[] {
    const query = this.normalizedQuery();
    return this.users().filter((user) => this.matchesUser(user, query));
  }

  /** Filters accessible channels by their name. */
  filteredChannels(): Channel[] {
    const query = this.normalizedQuery();
    return this.channels().filter((channel) => channel.name.toLowerCase().includes(query));
  }

  /** Selects a person without leaving the new-message composer. */
  selectUser(uid: string): void {
    const user = this.users().find((item) => item.uid === uid);
    if (!user) return;
    this.selectedUser.set(user);
    this.selectedChannel.set(null);
    this.query.set(`@${user.displayName}`);
  }

  /** Selects a channel without losing the message draft. */
  selectChannel(channelId: string): void {
    const channel = this.channels().find((item) => item.id === channelId);
    if (!channel) return;
    this.selectedChannel.set(channel);
    this.selectedUser.set(null);
    this.query.set(`#${channel.name}`);
  }

  /** Uses the existing message service and navigates only after successful sending. */
  async sendNewMessage(text: string): Promise<void> {
    const target = await this.selectedTarget();
    if (!target) throw new Error('recipient-required');
    await this.messages.sendMessage(target, this.messageInput(text));
    await this.router.navigate(conversationRoute(target));
  }

  /** Resolves the selected recipient to an existing channel or DM target. */
  private async selectedTarget(): Promise<ConversationTarget | null> {
    const channel = this.selectedChannel();
    if (channel) return { type: 'channel', id: channel.id };
    const user = this.selectedUser();
    if (!user) return null;
    const id = await this.directMessages.openConversation(user.uid);
    return { type: 'directMessage', id };
  }

  /** Builds the payload from the current authenticated user's existing profile. */
  private messageInput(text: string) {
    const user = this.auth.currentUser;
    return {
      text,
      authorName: this.profile()?.displayName || user?.displayName || 'Benutzer',
      authorAvatarId: this.profile()?.avatarId ?? 'avatar-1',
    };
  }

  /** Normalizes a search query without the optional channel or user prefix. */
  private normalizedQuery(): string {
    return this.query().trim().replace(/^[@#]/, '').toLowerCase();
  }

  /** Labels the currently authenticated account in the recipient search. */
  isCurrentUser(uid: string): boolean {
    return uid === this.auth.currentUser?.uid;
  }

  /** Matches both visible usernames and email addresses. */
  private matchesUser(user: UserProfile, query: string): boolean {
    if (!query) return true;
    return user.displayName.toLowerCase().includes(query)
      || user.email?.toLowerCase().includes(query) === true;
  }
}
