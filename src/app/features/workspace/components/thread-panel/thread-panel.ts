import { Component, EventEmitter, Output, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Auth } from '@angular/fire/auth';
import { switchMap } from 'rxjs';

import { Channel } from '../../../../core/models/channel.model';
import { ConversationTarget } from '../../../../core/models/conversation.model';
import { Message } from '../../../../core/models/message.model';
import { UserProfile } from '../../../../core/models/user-profile.model';
import { ThreadService } from '../../../../core/services/thread.service';
import { UserService } from '../../../../core/services/user.service';
import { createMessageInput } from '../../../../core/utils/message-author.util';
import { MessageInput } from '../message-input/message-input';
import { MessageItem } from '../message-item/message-item';

/**
 * Displays replies associated with one parent message.
 *
 * The panel derives its thread context from the conversation and parent ID,
 * and submits new replies without changing the main conversation composer.
 */
@Component({
  selector: 'app-thread-panel',
  imports: [MessageInput, MessageItem],
  templateUrl: './thread-panel.html',
  styleUrl: './thread-panel.scss',
})
export class ThreadPanel {
  /** Firebase Auth client providing the active account identity. */
  private readonly auth = inject(Auth);
  /** Thread service used to observe and post replies to the selected message. */
  private readonly threads = inject(ThreadService);
  /** User service used to resolve participant and profile records. */
  private readonly usersService = inject(UserService);

  /** Conversation target passed to messaging, reactions, and navigation. */
  readonly target = input.required<ConversationTarget>();
  /** Parent message whose reply thread is displayed. */
  readonly parent = input.required<Message>();
  /** Label identifying the conversation in the thread header. */
  readonly contextLabel = input('');
  /** Workspace user profiles used to resolve visible names and avatar data. */
  readonly users = input<UserProfile[]>([]);
  /** Channels accessible to the current account in this workspace. */
  readonly channels = input<Channel[]>([]);
  /** User's recent emoji choices offered ahead of the default picker. */
  readonly recentEmojis = input<string[]>([]);
  /** Profile stream for the currently authenticated account. */
  readonly profile = toSignal(this.usersService.observeCurrentProfile());
  /** Asks the owning view to dismiss the current dialog or panel. */
  @Output() readonly closeRequested = new EventEmitter<void>();
  /** Forwards profile requests from a reply to the parent chat view. */
  @Output() readonly userRequested = new EventEmitter<string>();

  /** Target and parent-message ID used by the thread service. */
  readonly context = computed(() => ({ target: this.target(), messageId: this.parent().id }));
  /** Callback passed to the reply composer to persist thread text. */
  readonly submitReply = (text: string): Promise<void> => this.sendReply(text);
  /** Thread replies observed under the selected parent message. */
  readonly replies = toSignal(
    toObservable(this.context).pipe(
      switchMap((context) => this.threads.observeReplies(context.target, context.messageId)),
    ),
    { initialValue: [] as Message[] },
  );

  /**
   * Saves a selected emoji to the existing user's recent-emoji history.
   *
   * @param emoji - Emoji chosen from the thread composer.
   * @returns Promise that resolves after the preference is saved.
   */
  async rememberEmoji(emoji: string): Promise<void> {
    await this.usersService.rememberEmoji(emoji);
  }

  /**
   * Sends a reply to the currently selected thread.
   *
   * @param text - Reply text entered by the user.
   * @returns A promise that resolves after the reply has been persisted.
   */
  async sendReply(text: string): Promise<void> {
    await this.threads.sendReply(this.target(), this.parent().id, createMessageInput(text, this.auth.currentUser, this.profile()));
  }

}
