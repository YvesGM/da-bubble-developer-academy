import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Channel } from '../../../../core/models/channel.model';
import { UserProfile } from '../../../../core/models/user-profile.model';
import { EmojiPicker } from '../../../../shared/components/emoji-picker/emoji-picker';

@Component({
  selector: 'app-message-input',
  imports: [FormsModule, EmojiPicker],
  templateUrl: './message-input.html',
  styleUrl: './message-input.scss',
})
export class MessageInput implements AfterViewInit {
  @Input() channels: Channel[] = [];
  @Input() users: UserProfile[] = [];
  @Input() recentEmojis: string[] = [];
  @Input() placeholder = 'Write a message';
  @Input() autoFocus = true;
  @Input() set focusKey(value: string) {
    if (value && this.autoFocus) queueMicrotask(() => this.field?.nativeElement.focus());
  }
  @Input() sendAction?: (text: string) => Promise<void>;
  @Input() set initialText(value: string) {
    if (value && !this.text()) this.updateText(value);
  }
  @Output() readonly emojiUsed = new EventEmitter<string>();

  @ViewChild('messageField') private field?: ElementRef<HTMLTextAreaElement>;

  readonly text = signal('');
  readonly trigger = signal<'@' | '#' | null>(null);
  readonly query = signal('');
  readonly showEmojiPicker = signal(false);
  readonly showAddMenu = signal(false);
  readonly sending = signal(false);
  readonly sendError = signal('');

  /**
   * Applies initial focus to the message field when autofocus is enabled.
   */
  ngAfterViewInit(): void {
    if (this.autoFocus) queueMicrotask(() => this.field?.nativeElement.focus());
  }

  /**
   * Sends the current message on Enter while preserving Shift+Enter for line breaks.
   *
   * @param event - Keyboard event emitted by the message textarea.
   */
  handleEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey || keyboardEvent.isComposing) return;
    keyboardEvent.preventDefault();
    if (this.trigger()) return this.chooseFirstSuggestion();
    void this.submit();
  }

  /**
   * Persists a message and clears the draft only after successful delivery.
   *
   * @returns A promise that resolves once sending and error handling finish.
   */
  async submit(): Promise<void> {
    const value = this.text().trim();
    const send = this.sendAction;
    if (!value || this.sending() || !send) return;
    this.sending.set(true);
    this.sendError.set('');
    try {
      await send(value);
      this.text.set('');
      this.closeSuggestions();
      this.closeOverlays();
    } catch {
      this.sendError.set('Die Nachricht konnte nicht gesendet werden. Bitte erneut versuchen.');
    } finally {
      this.sending.set(false);
      queueMicrotask(() => this.field?.nativeElement.focus());
    }
  }

  /**
   * Updates the message text and refreshes mention/channel suggestions.
   *
   * @param value - Current textarea value.
   */
  updateText(value: string): void {
    this.text.set(value);
    this.sendError.set('');
    this.updateSuggestions(value, this.field?.nativeElement.selectionStart ?? value.length);
  }

  /**
   * Appends an emoji to the message text and records it as recently used.
   *
   * @param emoji - Emoji selected from the picker.
   */
  insertEmoji(emoji: string): void {
    this.insertAtCaret(emoji);
    this.emojiUsed.emit(emoji);
    this.closeOverlays();
  }

  /** Inserts a mention trigger and opens the existing user suggestions. */
  insertMentionTrigger(): void {
    this.insertAtCaret('@');
    this.closeOverlays();
  }

  /** Inserts a channel trigger at the current cursor position. */
  insertChannelTrigger(): void {
    this.insertAtCaret('#');
    this.closeOverlays();
  }

  /** Toggles existing input options without adding a second picker implementation. */
  toggleAddMenu(): void {
    this.showEmojiPicker.set(false);
    this.showAddMenu.update((opened) => !opened);
  }

  /** Toggles the existing emoji picker and closes the alternate input menu. */
  toggleEmojiPicker(): void {
    this.showAddMenu.set(false);
    this.showEmojiPicker.update((opened) => !opened);
  }

  /** Closes the optional input overlays. */
  closeOverlays(): void {
    this.showAddMenu.set(false);
    this.showEmojiPicker.set(false);
  }

  /**
   * Replaces the active mention trigger with the selected user.
   *
   * @param user - User profile selected from mention suggestions.
   */
  chooseUser(user: UserProfile): void {
    this.replaceTrigger(`@${user.displayName}`);
  }

  /**
   * Replaces the active channel trigger with the selected channel.
   *
   * @param channel - Channel selected from suggestions.
   */
  chooseChannel(channel: Channel): void {
    this.replaceTrigger(`#${channel.name}`);
  }

  /**
   * Filters mentionable users by the active suggestion query.
   *
   * @returns Users whose display names contain the current query.
   */
  matchingUsers(): UserProfile[] {
    const value = this.query().toLowerCase();
    return this.users.filter((user) => user.displayName.toLowerCase().includes(value));
  }

  /**
   * Filters channels by the active suggestion query.
   *
   * @returns Channels whose names contain the current query.
   */
  matchingChannels(): Channel[] {
    const value = this.query().toLowerCase();
    return this.channels.filter((channel) => channel.name.toLowerCase().includes(value));
  }

  /**
   * Parses the latest mention or channel trigger at the caret end of the message.
   *
   * @param value - Current message text.
   */
  private updateSuggestions(value: string, caret = value.length): void {
    const match = value.slice(0, caret).match(/(?:^|\s)([@#])([^@#\s]*)$/);
    this.trigger.set((match?.[1] as '@' | '#' | undefined) ?? null);
    this.query.set(match?.[2] ?? '');
  }

  /**
   * Replaces the active trigger token with the selected mention or channel label.
   *
   * @param replacement - Replacement text including the mention or channel prefix.
   */
  private replaceTrigger(replacement: string): void {
    const field = this.field?.nativeElement;
    const caret = field?.selectionStart ?? this.text().length;
    const prefix = this.text().slice(0, caret);
    const match = prefix.match(/([@#])([^@#\s]*)$/);
    if (!match) return;
    const next = prefix.slice(0, -match[0].length) + replacement + ' ';
    this.text.set(next + this.text().slice(caret));
    this.closeSuggestions();
    this.focusAt(next.length);
  }

  /** Inserts text at the current selection while preserving surrounding content. */
  private insertAtCaret(inserted: string): void {
    const field = this.field?.nativeElement;
    const start = field?.selectionStart ?? this.text().length;
    const end = field?.selectionEnd ?? start;
    const value = this.text().slice(0, start) + inserted + this.text().slice(end);
    this.text.set(value);
    this.updateSuggestions(value, start + inserted.length);
    this.focusAt(start + inserted.length);
  }

  /** Restores keyboard focus and caret position after a programmatic insertion. */
  private focusAt(position: number): void {
    queueMicrotask(() => {
      this.field?.nativeElement.focus();
      this.field?.nativeElement.setSelectionRange(position, position);
    });
  }

  /** Applies the first available mention/channel suggestion on Enter. */
  private chooseFirstSuggestion(): void {
    if (this.trigger() === '@') {
      const user = this.matchingUsers()[0];
      if (user) this.chooseUser(user);
    } else {
      const channel = this.matchingChannels()[0];
      if (channel) this.chooseChannel(channel);
    }
  }

  /**
   * Clears the active suggestion trigger and query state.
   */
  private closeSuggestions(): void {
    this.trigger.set(null);
    this.query.set('');
  }
}
