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
  @Output() readonly sendRequested = new EventEmitter<string>();
  @Output() readonly emojiUsed = new EventEmitter<string>();

  @ViewChild('messageField') private field?: ElementRef<HTMLTextAreaElement>;

  readonly text = signal('');
  readonly trigger = signal<'@' | '#' | null>(null);
  readonly query = signal('');
  readonly showEmojiPicker = signal(false);

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
    if (keyboardEvent.shiftKey) return;
    keyboardEvent.preventDefault();
    this.submit();
  }

  /**
   * Emits the current non-empty message text and resets the input state.
   */
  submit(): void {
    const value = this.text().trim();
    if (!value) return;
    this.sendRequested.emit(value);
    this.text.set('');
    this.closeSuggestions();
    queueMicrotask(() => this.field?.nativeElement.focus());
  }

  /**
   * Updates the message text and refreshes mention/channel suggestions.
   *
   * @param value - Current textarea value.
   */
  updateText(value: string): void {
    this.text.set(value);
    this.updateSuggestions(value);
  }

  /**
   * Appends an emoji to the message text and records it as recently used.
   *
   * @param emoji - Emoji selected from the picker.
   */
  insertEmoji(emoji: string): void {
    this.text.update((value) => value + emoji);
    this.emojiUsed.emit(emoji);
    this.showEmojiPicker.set(false);
    queueMicrotask(() => this.field?.nativeElement.focus());
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
  private updateSuggestions(value: string): void {
    const match = value.match(/(?:^|\s)([@#])([^@#\s]*)$/);
    this.trigger.set((match?.[1] as '@' | '#' | undefined) ?? null);
    this.query.set(match?.[2] ?? '');
  }

  /**
   * Replaces the active trigger token with the selected mention or channel label.
   *
   * @param replacement - Replacement text including the mention or channel prefix.
   */
  private replaceTrigger(replacement: string): void {
    this.text.update((value) => value.replace(/([@#])([^@#\s]*)$/, `${replacement} `));
    this.closeSuggestions();
    queueMicrotask(() => this.field?.nativeElement.focus());
  }

  /**
   * Clears the active suggestion trigger and query state.
   */
  private closeSuggestions(): void {
    this.trigger.set(null);
    this.query.set('');
  }
}
