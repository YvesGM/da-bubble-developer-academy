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
import { MessageInput } from '../message-input/message-input';
import { MessageItem } from '../message-item/message-item';

@Component({
  selector: 'app-thread-panel',
  imports: [MessageInput, MessageItem],
  templateUrl: './thread-panel.html',
  styleUrl: './thread-panel.scss',
})
export class ThreadPanel {
  private readonly auth = inject(Auth);
  private readonly threads = inject(ThreadService);
  private readonly usersService = inject(UserService);

  readonly target = input.required<ConversationTarget>();
  readonly parent = input.required<Message>();
  readonly users = input<UserProfile[]>([]);
  readonly channels = input<Channel[]>([]);
  readonly recentEmojis = input<string[]>([]);
  readonly profile = toSignal(this.usersService.observeCurrentProfile());
  @Output() readonly closeRequested = new EventEmitter<void>();
  @Output() readonly userRequested = new EventEmitter<string>();

  readonly context = computed(() => ({ target: this.target(), messageId: this.parent().id }));
  readonly replies = toSignal(
    toObservable(this.context).pipe(
      switchMap((context) => this.threads.observeReplies(context.target, context.messageId)),
    ),
    { initialValue: [] as Message[] },
  );

  /**
   * Sends a reply to the currently selected thread.
   *
   * @param text - Reply text entered by the user.
   * @returns A promise that resolves after the reply has been persisted.
   */
  async sendReply(text: string): Promise<void> {
    await this.threads.sendReply(this.target(), this.parent().id, this.messageInput(text));
  }

  /**
   * Builds the reply payload from the current authentication and profile state.
   *
   * @param text - Reply text to persist.
   * @returns The normalized message creation payload.
   */
  private messageInput(text: string) {
    const user = this.auth.currentUser;
    return {
      text,
      authorName: user?.displayName || (user?.isAnonymous ? 'Guest' : 'User'),
      authorAvatarId: this.profile()?.avatarId ?? 'avatar-1',
    };
  }
}
