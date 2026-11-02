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
import { splitMessageMentions } from '../../../../core/utils/message-mention.util';
import { messageTime } from '../../../../core/utils/timestamp.util';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { EmojiPicker } from '../../../../shared/components/emoji-picker/emoji-picker';
import { ReactionPopover } from '../../../../shared/components/reaction-popover/reaction-popover';
import { InputCaretDirective } from '../../../../shared/directives/input-caret.directive';

/** Renders and manages the interactions of one message or thread reply. */
@Component({
  selector: 'app-message-item',
  imports: [InputCaretDirective, FormsModule, Avatar, EmojiPicker, ReactionPopover],
  templateUrl: './message-item.html',
  styleUrl: './message-item.scss',
})
export class MessageItem {
  private readonly host = inject(ElementRef<HTMLElement>);
  @ViewChild('editField') private editField?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('optionsButton') private optionsButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('optionsMenu') private optionsMenu?: ElementRef<HTMLDivElement>;
  @ViewChild('reactionPicker') private reactionPicker?: ReactionPopover;
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
  /** Recomputes display spans whenever the message or available profiles change. */
  readonly messageParts = computed(() => splitMessageMentions(this.message().text, this.users()));
  /**
   * Opens the existing profile card for a recognized mention.
   *
   * @param userId - Firebase user ID associated with the recognized mention.
   */
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
  /**
   * Closes reaction/edit pickers when interacting outside their own controls.
   *
   * @param event - Document click to evaluate against this message's controls.
   */
  @HostListener('document:click', ['$event'])
  closePickersOnOutsideClick(event: MouseEvent): void {
    const target = event.target as Element;
    if (this.host.nativeElement.contains(target) &&
        target.closest('.reaction-popover, .edit-emoji-picker, .reaction-trigger, .edit-emoji-button')) return;
    this.reactionPicker?.close();
    this.editEmojiPickerOpen.set(false);
  }
  /** Closes emoji pickers with Escape. */
  @HostListener('document:keydown.escape')
  closePickersOnEscape(): void {
    this.reactionPicker?.close();
    this.editEmojiPickerOpen.set(false);
  }
  /** Never leave a reaction palette open after leaving its message. */
  closeReactionOnLeave(): void {
    if (!this.mobileViewport()) this.reactionPicker?.close();
  }
  /** Opens message actions on tap without showing desktop hover controls by default. */
  toggleMobileActions(): void {
    if (this.mobileViewport()) this.mobileActionsOpen.update((value) => !value);
  }
  /**
   * Dismisses mobile message actions when another item is selected.
   *
   * @param event - Document click to check against the message container.
   */
  @HostListener('document:click', ['$event'])
  closeMobileActionsOnOutside(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.mobileActionsOpen.set(false);
    }
  }
  /** Toggles a top-layer reaction palette anchored to the clicked button. */
  toggleReactionPicker(event: MouseEvent): void {
    this.editEmojiPickerOpen.set(false);
    if (this.showEmojiPicker()) this.reactionPicker?.close();
    else this.reactionPicker?.openAt(event.currentTarget as HTMLElement);
  }
  /** Toggles the editor picker without keeping a reaction picker open. */
  toggleEditPicker(): void {
    this.reactionPicker?.close();
    this.editEmojiPickerOpen.update((value) => !value);
  }
  /**
   * Updates mobile interaction state when the browser viewport changes.
   */
  @HostListener('window:resize')
  updateViewport(): void {
    this.mobileViewport.set(window.innerWidth <= 800);
    if (!this.mobileViewport()) this.mobileActionsOpen.set(false);
  }
  /**
   * Syncs the existing menu state with native popover dismissal.
   *
   * @param event - Popover toggle event originating from the menu element.
   */
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
  /**
   * Positions the existing menu next to its toggle within the visible viewport.
   *
   * @param menu - Visible native popover element to position.
   */
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
  /**
   * Returns the time of the most recent thread reply, if available.
   *
   * @returns Formatted reply time or an empty string for a thread without replies.
   */
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
  /**
   * Inserts an emoji at the active selection in the editing textarea.
   *
   * @param emoji - Emoji string chosen in the editing picker.
   */
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
    this.reactionPicker?.close();
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
   * Describes a persisted reaction without creating a separate chat message.
   *
   * @param group - Reaction group and its participating user IDs.
   * @returns Localized description of the users and selected emoji.
   */
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
