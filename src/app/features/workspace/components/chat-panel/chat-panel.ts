import { Component, EventEmitter, Output, computed, effect, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
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

/**
 * Coordinates the message stream, composer, and optional thread for a target conversation.
 *
 * Its signals resolve participants and message history from the active route;
 * message submission and thread selection are handled in one chat context.
 */
@Component({
  selector: 'app-chat-panel',
  imports: [MessageInput, MessageList, ThreadPanel],
  templateUrl: './chat-panel.html',
  styleUrl: './chat-panel.scss',
})
export class ChatPanel {
  /** Firebase Auth client providing the active account identity. */
  private readonly auth = inject(Auth);
  /** Router dependency used for navigation after the current action completes. */
  private readonly router = inject(Router);
  /** Channel service supplying accessible channel data. */
  private readonly channelsService = inject(ChannelService);
  /** Message service supplying and sending conversation messages. */
  private readonly messagesService = inject(MessageService);
  /** User service used to resolve participant and profile records. */
  private readonly usersService = inject(UserService);

  /** Conversation target passed to messaging, reactions, and navigation. */
  readonly target = input.required<ConversationTarget>();
  /** Emits a user's UID when their profile is requested from a message. */
  @Output() readonly userRequested = new EventEmitter<string>();
  /** Hint displayed before text is entered in the message composer. */
  readonly inputPlaceholder = input('Nachricht schreiben');
  /** Heading shown when the conversation has no messages. */
  readonly emptyTitle = input('Noch keine Nachrichten.');
  /** Explanatory copy for a newly created or empty conversation. */
  readonly emptyText = input('Starte die Unterhaltung unten.');
  /** Channel name appended to the introduction when history is empty. */
  readonly emptyChannelName = input('');
  /** Avatar preset shown in the empty direct-message introduction. */
  readonly emptyAvatarId = input('');
  /** Name used for the accessible empty-state avatar. */
  readonly emptyAvatarName = input('');
  /** Optional user highlighted in the empty direct-message introduction. */
  readonly emptyMentionUser = input<UserProfile | null>(null);
  /** Optional restriction of profiles offered for @mentions. */
  readonly mentionUsers = input<UserProfile[] | null>(null);
  /** Current workspace profiles used to resolve message authors and mentions. */
  readonly users = toSignal(this.usersService.observeUsers(), { initialValue: [] });
  /** Channels accessible to the current account in this workspace. */
  readonly channels = toSignal(this.channelsService.observeCurrentUserChannels(), { initialValue: [] });
  /** Profile stream for the currently authenticated account. */
  readonly profile = toSignal(this.usersService.observeCurrentProfile());
  /** Conversation messages observed for the selected target. */
  readonly messages = toSignal(
    toObservable(this.target).pipe(switchMap((target) => this.messagesService.observeMessages(target))),
    { initialValue: [] as Message[] },
  );
  /** Root message of the thread panel, or null when closed. */
  readonly threadMessage = signal<Message | null>(null);
  /** Draft text carried from recipient selection into the composer. */
  readonly initialDraft = this.router.getCurrentNavigation()?.extras.state?.['newMessageDraft'] ?? '';
  /** Last rendered target key, used to detect conversation changes. */
  private previousTarget = '';
  /** Callback passed to the composer to persist a new message. */
  readonly submitMessage = (text: string): Promise<void> => this.sendMessage(text);
  /** Human-readable context heading shown above an open thread. */
  readonly threadLabel = computed(() => {
    const target = this.target();
    if (target.type === 'channel') {
      const channel = this.channels().find((item) => item.id === target.id);
      return channel ? `#${channel.name}` : '';
    }
    const partnerId = target.id.split('__').find((id) => id !== this.auth.currentUser?.uid);
    return this.users().find((user) => user.uid === partnerId)?.displayName ?? '';
  });
  /** Profiles currently eligible for mentions in this conversation. */
  readonly availableMentionUsers = computed(() => this.mentionUsers() ?? this.users());
  /** User's recent emoji choices offered ahead of the default picker. */
  readonly recentEmojis = computed(() =>
    this.profile()?.recentEmojis?.length ? this.profile()!.recentEmojis : [...DEFAULT_RECENT_EMOJIS],
  );

  /** Clears a previously opened thread when the active conversation changes. */
  constructor() {
    effect(() => {
      const target = this.target();
      const key = `${target.type}:${target.id}`;
      if (this.previousTarget && this.previousTarget !== key) this.threadMessage.set(null);
      this.previousTarget = key;
    });
  }

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
      authorName: user?.displayName || (user?.isAnonymous ? 'Guest' : 'Benutzer'),
      authorAvatarId: this.profile()?.avatarId ?? 'avatar-1',
    };
  }
}
