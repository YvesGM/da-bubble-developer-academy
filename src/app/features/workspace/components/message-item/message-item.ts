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
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { EmojiPicker } from '../../../../shared/components/emoji-picker/emoji-picker';

@Component({
  selector: 'app-message-item',
  imports: [FormsModule, Avatar, EmojiPicker],
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
  /**
   * Updates the responsive reaction limit when the browser viewport changes.
   */
  updateViewport(): void {
    this.mobileViewport.set(window.innerWidth <= 640);
  }

  /**
   * Checks whether the rendered message was authored by the current user.
   *
   * @returns Whether the current user owns the message.
   */
  isOwnMessage(): boolean {
    return this.auth.currentUser?.uid === this.message().authorId;
  }

  /**
   * Requests the author's profile card when the message was not written by a guest.
   */
  openAuthor(): void {
    if (!this.message().authorIsGuest) this.userRequested.emit(this.message().authorId);
  }

  /**
   * Formats the message creation timestamp for display.
   *
   * @returns The localized time label.
   */
  timeLabel(): string {
    return messageTime(this.message().createdAt);
  }

  /**
   * Resolves the avatar identifier for the message author.
   *
   * @returns The author's avatar identifier, or an empty string when unavailable.
   */
  authorAvatarId(): string {
    return this.users().find((user) => user.uid === this.message().authorId)?.avatarId ?? '';
  }

  /**
   * Determines whether message actions are available for the current message.
   *
   * @returns Whether the message has not been deleted.
   */
  canInteract(): boolean {
    return !this.message().deleted;
  }

  /**
   * Copies the current message text into edit state and opens inline editing.
   */
  startEditing(): void {
    this.editText.set(this.message().text);
    this.editing.set(true);
  }

  /**
   * Persists the edited message text when the message is editable.
   *
   * @returns A promise that resolves after the message update completes.
   */
  async saveEdit(): Promise<void> {
    const value = this.editText().trim();
    if (!value || this.parentMessageId()) return;
    await this.messages.updateMessage(this.target(), this.message().id, value);
    this.editing.set(false);
  }

  /**
   * Soft-deletes the current user's top-level message.
   *
   * @returns A promise that resolves after deletion completes.
   */
  async removeMessage(): Promise<void> {
    if (!this.isOwnMessage() || this.parentMessageId()) return;
    await this.messages.deleteMessage(this.target(), this.message().id);
  }

  /**
   * Adds or removes the current user's reaction and stores the emoji as recently used.
   *
   * @param emoji - Emoji to toggle on the message or reply.
   * @returns A promise that resolves after reaction and preference updates complete.
   */
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

  /**
   * Resolves the display names of users contained in a reaction group.
   *
   * @param group - Grouped reaction whose users should be displayed.
   * @returns A comma-separated list of user names.
   */
  reactionNames(group: ReactionGroup): string {
    return group.userIds.map((uid) => this.userName(uid)).join(', ');
  }

  /**
   * Calculates how many reactions are currently hidden by the responsive limit.
   *
   * @returns The number of hidden reaction groups.
   */
  hiddenReactionCount(): number {
    if (this.showAllReactions()) return 0;
    return Math.max(0, this.reactions().length - this.visibleReactions().length);
  }

  /**
   * Toggles between the limited and fully expanded reaction list.
   */
  toggleReactionExpansion(): void {
    this.showAllReactions.update((value) => !value);
  }

  /**
   * Resolves the maximum visible reaction count for the current rendering context.
   *
   * @returns Seven reactions for compact/mobile rendering, otherwise twenty.
   */
  reactionLimit(): number {
    return this.compactReactions() || this.mobileViewport() ? 7 : 20;
  }

  /**
   * Resolves a display name for a reaction user identifier.
   *
   * @param uid - Firebase user identifier.
   * @returns The resolved display name or the guest fallback.
   */
  private userName(uid: string): string {
    if (uid === this.auth.currentUser?.uid && this.auth.currentUser?.isAnonymous) return 'Gast';
    return this.users().find((user) => user.uid === uid)?.displayName ?? 'Gast';
  }
}
