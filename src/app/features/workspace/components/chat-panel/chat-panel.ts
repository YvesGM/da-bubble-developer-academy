import { Component, EventEmitter, Output, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Auth } from '@angular/fire/auth';
import { switchMap } from 'rxjs';

import { DEFAULT_RECENT_EMOJIS } from '../../../../core/constants/emoji.constants';
import { ConversationTarget } from '../../../../core/models/conversation.model';
import { Message } from '../../../../core/models/message.model';
import { UserProfile } from '../../../../core/models/user-profile.model';
import { ChannelService } from '../../../../core/services/channel.service';
import { MessageService } from '../../../../core/services/message.service';
import { UserService } from '../../../../core/services/user.service';
import { MessageInput } from '../message-input/message-input';
import { MessageList } from '../message-list/message-list';
import { ThreadPanel } from '../thread-panel/thread-panel';

@Component({
  selector: 'app-chat-panel',
  imports: [MessageInput, MessageList, ThreadPanel],
  templateUrl: './chat-panel.html',
  styleUrl: './chat-panel.scss',
})
export class ChatPanel {
  private readonly auth = inject(Auth);
  private readonly channelsService = inject(ChannelService);
  private readonly messagesService = inject(MessageService);
  private readonly usersService = inject(UserService);

  readonly target = input.required<ConversationTarget>();
  @Output() readonly userRequested = new EventEmitter<string>();
  readonly inputPlaceholder = input('Nachricht schreiben');
  readonly emptyTitle = input('Noch keine Nachrichten.');
  readonly emptyText = input('Starte die Unterhaltung unten.');
  readonly mentionUsers = input<UserProfile[] | null>(null);
  readonly users = toSignal(this.usersService.observeUsers(), { initialValue: [] });
  readonly channels = toSignal(this.channelsService.observeCurrentUserChannels(), { initialValue: [] });
  readonly profile = toSignal(this.usersService.observeCurrentProfile());
  readonly messages = toSignal(
    toObservable(this.target).pipe(switchMap((target) => this.messagesService.observeMessages(target))),
    { initialValue: [] as Message[] },
  );
  readonly threadMessage = signal<Message | null>(null);
  readonly availableMentionUsers = computed(() => this.mentionUsers() ?? this.users());
  readonly recentEmojis = computed(() =>
    this.profile()?.recentEmojis?.length ? this.profile()!.recentEmojis : [...DEFAULT_RECENT_EMOJIS],
  );

  /**
   * Sends a message to the currently selected conversation target.
   *
   * @param text - Message text entered by the user.
   * @returns A promise that resolves after the message has been persisted.
   */
  async sendMessage(text: string): Promise<void> {
    await this.messagesService.sendMessage(this.target(), this.messageInput(text));
  }

  /**
   * Stores an emoji in the current user's recent-emoji history.
   *
   * @param emoji - Emoji that was selected by the user.
   * @returns A promise that resolves after the preference has been persisted.
   */
  async rememberEmoji(emoji: string): Promise<void> {
    await this.usersService.rememberEmoji(emoji);
  }

  /**
   * Builds the message payload from the current authentication and profile state.
   *
   * @param text - Message text to persist.
   * @returns The normalized message creation payload.
   */
  private messageInput(text: string) {
    const user = this.auth.currentUser;
    return {
      text,
      authorName: user?.displayName || (user?.isAnonymous ? 'Gast' : 'Benutzer'),
      authorAvatarId: this.profile()?.avatarId ?? 'avatar-1',
    };
  }
}
