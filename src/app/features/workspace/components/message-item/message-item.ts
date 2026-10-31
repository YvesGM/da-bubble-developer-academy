import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Output,
  ViewChild,
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
import { InputCaretDirective } from '../../../../shared/directives/input-caret.directive';

@Component({
  selector: 'app-message-item',
  imports: [InputCaretDirective, FormsModule, Avatar, EmojiPicker],
  templateUrl: './message-item.html',
  styleUrl: './message-item.scss',
})
export class MessageItem {
  private readonly host = inject(ElementRef<HTMLElement>);
  @ViewChild('editField') private editField?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('optionsButton') private optionsButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('optionsMenu') private optionsMenu?: ElementRef<HTMLDivElement>;
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
  readonly optionsOpen = signal(false);
  readonly editEmojiPickerOpen = signal(false);
  readonly quickReactions = DEFAULT_RECENT_EMOJIS;
  readonly mobileViewport = signal(window.innerWidth <= 800);
  readonly mobileActionsOpen = signal(false);
  /** Splits stored text into plain text and recognized user mentions. */
  readonly messageParts = computed(() => {
    const source = this.message().text;
    const users = [...this.users()].sort((a, b) => b.displayName.length - a.displayName.length);
    const parts: { text: string; userId?: string }[] = [];
    let cursor = 0;
    let plainStart = 0;
    while (cursor < source.length) {
      const user = users.find((item) => this.mentionAt(source, cursor, item.displayName));
      if (!user) { cursor++; continue; }
      if (cursor > plainStart) parts.push({ text: source.slice(plainStart, cursor) });
      const end = cursor + user.displayName.length + 1;
      parts.push({ text: source.slice(cursor, end), userId: user.uid });
      plainStart = cursor = end;
    }
    if (plainStart < source.length) parts.push({ text: source.slice(plainStart) });
    return parts.length ? parts : [{ text: source }];
  });

  /** Restricts mentions to complete names with word boundaries. */
  private mentionAt(text: string, index: number, name: string): boolean {
    const token = '@' + name;
    if (!name || text.slice(index, index + token.length).toLowerCase() !== token.toLowerCase()) return false;
    return (index === 0 || /\s/.test(text[index - 1]))
      && (index + token.length === text.length || /[\s.,!?;:]/.test(text[index + token.length]));
  }

  /** Opens the existing profile card for a recognized mention. */
  openMention(userId?: string): void {
    if (userId) this.userRequested.emit(userId);
  }

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

  /** Closes reaction/edit pickers when interacting outside their own controls. */
  @HostListener('document:click', ['$event'])
  closePickersOnOutsideClick(event: MouseEvent): void {
    const target = event.target as Element;
    if (this.host.nativeElement.contains(target) &&
        target.closest('.reaction-picker, .edit-emoji-picker, .reaction-trigger, .edit-emoji-button')) return;
    this.showEmojiPicker.set(false);
    this.editEmojiPickerOpen.set(false);
  }

  /** Dismisses both existing emoji pickers using the Escape key. */
  @HostListener('document:keydown.escape')
  closePickersOnEscape(): void {
    this.showEmojiPicker.set(false);
    this.editEmojiPickerOpen.set(false);
  }

  /** Opens message actions on tap without showing desktop hover controls by default. */
  toggleMobileActions(): void {
    if (this.mobileViewport()) this.mobileActionsOpen.update((value) => !value);
  }

  /** Dismisses mobile message actions when another item is selected. */
  @HostListener('document:click', ['$event'])
  closeMobileActionsOnOutside(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.mobileActionsOpen.set(false);
    }
  }

  /** Toggles the reaction picker without keeping a second picker open. */
  toggleReactionPicker(): void {
    this.editEmojiPickerOpen.set(false);
    this.showEmojiPicker.update((value) => !value);
  }

  /** Toggles the editor picker without keeping a reaction picker open. */
  toggleEditPicker(): void {
    this.showEmojiPicker.set(false);
    this.editEmojiPickerOpen.update((value) => !value);
  }

  @HostListener('window:resize')
  /**
   * Updates the responsive reaction limit when the browser viewport changes.
   */
  updateViewport(): void {
    this.mobileViewport.set(window.innerWidth <= 800);
    if (!this.mobileViewport()) this.mobileActionsOpen.set(false);
  }

  /** Syncs the existing menu state with native popover dismissal. */
  syncOptionsState(event: Event): void {
    this.optionsOpen.set((event.target as HTMLElement).matches(':popover-open'));
  }

  /** Displays the contextual menu in the top layer, beyond message-list clipping. */
  toggleOptions(): void {
    const menu = this.optionsMenu?.nativeElement;
    if (!menu) return;
    if (menu.matches(':popover-open')) return this.closeOptions();
    menu.showPopover();
    this.positionOptions(menu);
  }

  /** Positions the existing menu next to its toggle within the visible viewport. */
  private positionOptions(menu: HTMLDivElement): void {
    const button = this.optionsButton?.nativeElement;
    if (!button) return;
    const anchor = button.getBoundingClientRect();
    const bounds = menu.getBoundingClientRect();
    const left = Math.max(8, Math.min(anchor.right - bounds.width, window.innerWidth - bounds.width - 8));
    const below = anchor.bottom + bounds.height + 8 < window.innerHeight;
    const top = below ? anchor.bottom + 8 : Math.max(8, anchor.top - bounds.height - 8);
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  /** Closes the menu before editing, deleting or navigating away. */
  private closeOptions(): void {
    const menu = this.optionsMenu?.nativeElement;
    if (menu?.matches(':popover-open')) menu.hidePopover();
    this.optionsOpen.set(false);
  }

  /** Opens the existing inline editor from the contextual options menu. */
  editFromOptions(): void {
    this.closeOptions();
    this.startEditing();
  }

  /** Uses the existing soft-delete method from the contextual options menu. */
  async deleteFromOptions(): Promise<void> {
    this.closeOptions();
    await this.removeMessage();
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

  /** Returns the time of the most recent thread reply, if available. */
  lastReplyTime(): string {
    const replies = this.replies();
    return replies.length ? messageTime(replies[replies.length - 1].createdAt) : '';
  }

  /**
   * Resolves the avatar identifier for the message author.
   *
   * @returns The author's avatar identifier, or an empty string when unavailable.
   */
  authorAvatarId(): string {
    return this.users().find((user) => user.uid === this.message().authorId)?.avatarId ?? this.message().authorAvatarId ?? '';
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
    this.closeOptions();
    this.editText.set(this.message().text);
    this.editing.set(true);
    requestAnimationFrame(() => this.editField?.nativeElement.focus());
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
    this.cancelEditing();
  }

  /** Cancels editing without persisting the current draft. */
  cancelEditing(): void {
    this.editing.set(false);
    this.editEmojiPickerOpen.set(false);
  }

  /** Inserts an emoji into the existing editing textarea. */
  insertEditEmoji(emoji: string): void {
    const field = this.editField?.nativeElement;
    const start = field?.selectionStart ?? this.editText().length;
    const end = field?.selectionEnd ?? start;
    this.editText.set(this.editText().slice(0, start) + emoji + this.editText().slice(end));
    this.editEmojiPickerOpen.set(false);
    requestAnimationFrame(() => { field?.focus(); field?.setSelectionRange(start + emoji.length, start + emoji.length); });
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

  /** Describes a persisted reaction without creating a separate chat message. */
  reactionSummary(group: ReactionGroup): string {
    const names = this.reactionNames(group);
    return `${names} ${group.userIds.length === 1 ? 'hat' : 'haben'} mit ${group.emoji} reagiert`;
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
