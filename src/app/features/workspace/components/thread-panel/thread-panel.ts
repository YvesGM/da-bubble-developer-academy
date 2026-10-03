import { Component, EventEmitter, Output, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Auth } from '@angular/fire/auth';
import { switchMap } from 'rxjs';

import { Channel } from '../../../../core/models/channel.model';
import { ConversationTarget } from '../../../../core/models/conversation.model';
import { Message } from '../../../../core/models/message.model';
import { UserProfile } from '../../../../core/models/user-profile.model';
import { ThreadService } from '../../../../core/services/thread.service';
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

  readonly target = input.required<ConversationTarget>();
  readonly parent = input.required<Message>();
  readonly users = input<UserProfile[]>([]);
  readonly channels = input<Channel[]>([]);
  readonly recentEmojis = input<string[]>([]);
  @Output() readonly closeRequested = new EventEmitter<void>();

  readonly context = computed(() => ({ target: this.target(), messageId: this.parent().id }));
  readonly replies = toSignal(
    toObservable(this.context).pipe(
      switchMap((context) => this.threads.observeReplies(context.target, context.messageId)),
    ),
    { initialValue: [] as Message[] },
  );

  async sendReply(text: string): Promise<void> {
    await this.threads.sendReply(this.target(), this.parent().id, this.messageInput(text));
  }

  private messageInput(text: string) {
    const user = this.auth.currentUser;
    return {
      text,
      authorName: user?.displayName || (user?.isAnonymous ? 'Guest' : 'User'),
      authorAvatarId: 'avatar-1',
    };
  }
}
