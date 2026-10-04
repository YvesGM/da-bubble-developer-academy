import {
  Component,
  EventEmitter,
  HostListener,
  Output,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Auth } from '@angular/fire/auth';
import { FormsModule } from '@angular/forms';
import { of, switchMap } from 'rxjs';

import { DEFAULT_RECENT_EMOJIS } from '../../../../core/constants/emoji.constants';
import { ConversationTarget } from '../../../../core/models/conversation.model';
import { Message } from '../../../../core/models/message.model';
import { ReactionGroup } from '../../../../core/models/reaction.model';
import { MessageService } from '../../../../core/services/message.service';
import { ReactionService } from '../../../../core/services/reaction.service';
import { ThreadService } from '../../../../core/services/thread.service';
import { UserService } from '../../../../core/services/user.service';
import { messageTime } from '../../../../core/utils/timestamp.util';
import { EmojiPicker } from '../../../../shared/components/emoji-picker/emoji-picker';

@Component({
  selector: 'app-message-item',
  imports: [FormsModule, EmojiPicker],
  templateUrl: './message-item.html',
  styleUrl: './message-item.scss',
})
export class MessageItem {
  private readonly auth = inject(Auth);
  private readonly messages = inject(MessageService);
  private readonly reactionsService = inject(ReactionService);
  private readonly threadsService = inject(ThreadService);
  private readonly usersService = inject(UserService);

  readonly target = input.required<ConversationTarget>();
  readonly message = input.required<Message>();
  readonly parentMessageId = input('');
  readonly recentEmojis = input<string[]>([...DEFAULT_RECENT_EMOJIS]);
  readonly compactReactions = input(false);
  readonly showThreadAction = input(true);
  @Output() readonly threadRequested = new EventEmitter<Message>();
  @Output() readonly userRequested = new EventEmitter<string>();

  readonly users = toSignal(this.usersService.observeUsers(), { initialValue: [] });
  readonly editing = signal(false);
  readonly editText = signal('');
  readonly showEmojiPicker = signal(false);
  readonly showAllReactions = signal(false);
  readonly mobileViewport = signal(window.innerWidth <= 640);
  readonly reactionContext = computed(() => ({
    target: this.target(),
    messageId: this.parentMessageId() || this.message().id,
    replyId: this.parentMessageId() ? this.message().id : undefined,
  }));
  readonly reactions = toSignal(
    toObservable(this.reactionContext).pipe(
      switchMap((context) =>
        this.reactionsService.observeReactions(context.target, context.messageId, context.replyId),
      ),
    ),
    { initialValue: [] as ReactionGroup[] },
  );
  readonly visibleReactions = computed(() =>
    this.showAllReactions() ? this.reactions() : this.reactions().slice(0, this.reactionLimit()),
  );
  readonly replies = toSignal(
    toObservable(this.reactionContext).pipe(
      switchMap((context) =>
        context.replyId ? of([] as Message[]) : this.threadsService.observeReplies(context.target, context.messageId),
      ),
    ),
    { initialValue: [] as Message[] },
  );

  @HostListener('window:resize')
  updateViewport(): void {
    this.mobileViewport.set(window.innerWidth <= 640);
  }

  isOwnMessage(): boolean {
    return this.auth.currentUser?.uid === this.message().authorId;
  }

  openAuthor(): void {
    if (!this.message().authorIsGuest) this.userRequested.emit(this.message().authorId);
  }

  timeLabel(): string {
    return messageTime(this.message().createdAt);
  }

  canInteract(): boolean {
    return !this.message().deleted;
  }

  startEditing(): void {
    this.editText.set(this.message().text);
    this.editing.set(true);
  }

  async saveEdit(): Promise<void> {
    const value = this.editText().trim();
    if (!value || this.parentMessageId()) return;
    await this.messages.updateMessage(this.target(), this.message().id, value);
    this.editing.set(false);
  }

  async removeMessage(): Promise<void> {
    if (!this.isOwnMessage() || this.parentMessageId()) return;
    await this.messages.deleteMessage(this.target(), this.message().id);
  }

  async toggleReaction(emoji: string): Promise<void> {
    const context = this.reactionContext();
    await this.reactionsService.toggleReaction(
      context.target,
      context.messageId,
      emoji,
      context.replyId,
    );
    await this.usersService.rememberEmoji(emoji);
    this.showEmojiPicker.set(false);
  }

  reactionNames(group: ReactionGroup): string {
    return group.userIds.map((uid) => this.userName(uid)).join(', ');
  }

  hiddenReactionCount(): number {
    if (this.showAllReactions()) return 0;
    return Math.max(0, this.reactions().length - this.visibleReactions().length);
  }

  toggleReactionExpansion(): void {
    this.showAllReactions.update((value) => !value);
  }

  private reactionLimit(): number {
    return this.compactReactions() || this.mobileViewport() ? 7 : 20;
  }

  private userName(uid: string): string {
    if (uid === this.auth.currentUser?.uid && this.auth.currentUser?.isAnonymous) return 'Guest';
    return this.users().find((user) => user.uid === uid)?.displayName ?? 'Guest';
  }
}
