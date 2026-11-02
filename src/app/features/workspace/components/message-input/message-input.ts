import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Channel } from '../../../../core/models/channel.model';
import { UserProfile } from '../../../../core/models/user-profile.model';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { EmojiPicker } from '../../../../shared/components/emoji-picker/emoji-picker';
import { PresenceIndicator } from '../../../../shared/components/presence-indicator/presence-indicator';
import { InputCaretDirective } from '../../../../shared/directives/input-caret.directive';

/**
 * Implements the message composer with multiline text, emojis, and mention suggestions.
 *
 * Inputs provide available participants and the send action, while local signals
 * track the draft, active completion trigger, and async submission feedback.
 */
@Component({
  selector: 'app-message-input',
  imports: [FormsModule, EmojiPicker, InputCaretDirective, Avatar, PresenceIndicator],
  templateUrl: './message-input.html',
  styleUrl: './message-input.scss',
})
export class MessageInput implements AfterViewInit {
  private readonly host = inject(ElementRef<HTMLElement>);
  /** Channels accessible to the current account in this workspace. */
  @Input() channels: Channel[] = [];
  /** Workspace user profiles used to resolve visible names and avatar data. */
  @Input() users: UserProfile[] = [];
  /** User's recent emoji choices offered ahead of the default picker. */
  @Input() recentEmojis: string[] = [];
  /** Hint shown when the search or text field is empty. */
  @Input() placeholder = 'Write a message';
  /** Whether the message field receives focus when mounted or changed. */
  @Input() autoFocus = true;
  /**
   * Refocuses the message field when the containing conversation changes.
   *
   * @param value - Nonempty identifier of the active conversation.
   */
  @Input() set focusKey(value: string) {
    if (value && this.autoFocus) queueMicrotask(() => this.field?.nativeElement.focus());
  }
  /** Parent-provided asynchronous callback that sends a composed message. */
  @Input() sendAction?: (text: string) => Promise<void>;
  /**
   * Prefills an otherwise empty draft, such as one carried from recipient selection.
   *
   * @param value - Initial message text to preserve until edited.
   */
  @Input() set initialText(value: string) {
    if (value && !this.text()) this.updateText(value);
  }
  /** Emits an emoji selected from the composer to update recent choices. */
  @Output() readonly emojiUsed = new EventEmitter<string>();

  @ViewChild('messageField') private field?: ElementRef<HTMLTextAreaElement>;

  /** Reactive contents of the current unsent message draft. */
  readonly text = signal('');
  /** Active mention prefix, either @ or #, or null if inactive. */
  readonly trigger = signal<'@' | '#' | null>(null);
  /** Current search or mention query typed by the user. */
  readonly query = signal('');
  /** Whether the composer or reaction emoji palette is visible. */
  readonly showEmojiPicker = signal(false);
  /** Whether a message is currently being submitted. */
  readonly sending = signal(false);
  /** Message send failure displayed next to the composer. */
  readonly sendError = signal('');

  /**
   * Closes transient input menus when a click occurs outside this composer.
   *
   * @param event - Document click whose target determines which overlays remain.
   */
  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: MouseEvent): void {
    const target = event.target as Element;
    if (!this.host.nativeElement.contains(target)) {
      this.closeOverlays();
      this.closeSuggestions();
      return;
    }
    if (!target.closest('.picker, [aria-label="Emoji auswählen"]')) this.closeOverlays();
    if (!target.closest('textarea, .suggestions')) this.closeSuggestions();
  }

  /** Closes suggestions and input menus on Escape. */
  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.closeOverlays();
    this.closeSuggestions();
  }

  /** Recalculates the draft height after viewport changes affect text wrapping. */
  @HostListener('window:resize')
  onViewportResize(): void {
    this.resizeTextarea();
  }

  /**
   * Applies initial focus to the message field when autofocus is enabled.
   */
  ngAfterViewInit(): void {
    queueMicrotask(() => {
      this.resizeTextarea();
      if (this.autoFocus) this.field?.nativeElement.focus();
    });
  }

  /**
   * Sends the current message on Enter while preserving Shift+Enter for line breaks.
   *
   * @param event - Keyboard event emitted by the message textarea.
   */
  handleEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey || keyboardEvent.isComposing) return;
    if (!this.sendAction && !this.trigger()) return;
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
    this.beginSending();
    try {
      await send(value);
      this.clearSentDraft();
    } catch {
      this.sendError.set('Die Nachricht konnte nicht gesendet werden. Bitte erneut versuchen.');
    } finally {
      this.finishSending();
    }
  }

  /** Resets transient error state while a message is being persisted. */
  private beginSending(): void {
    this.sending.set(true);
    this.sendError.set('');
  }

  /** Clears the draft and transient pickers after successful delivery. */
  private clearSentDraft(): void {
    this.text.set('');
    this.closeSuggestions();
    this.closeOverlays();
    requestAnimationFrame(() => this.resizeTextarea());
  }

  /** Restores composer availability and keyboard focus after a send attempt. */
  private finishSending(): void {
    this.sending.set(false);
    queueMicrotask(() => this.field?.nativeElement.focus());
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
    this.resizeTextarea();
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

  /** Toggles the existing emoji picker. */
  toggleEmojiPicker(): void {
    this.showEmojiPicker.update((opened) => !opened);
  }

  /** Closes the existing emoji picker. */
  closeOverlays(): void {
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
   * @param caret - Selection offset used to delimit the active trigger.
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

  /**
   * Inserts text at the current selection while preserving surrounding content.
   *
   * @param inserted - Emoji, mention marker, or other text to insert.
   */
  private insertAtCaret(inserted: string): void {
    const field = this.field?.nativeElement;
    const start = field?.selectionStart ?? this.text().length;
    const end = field?.selectionEnd ?? start;
    const value = this.text().slice(0, start) + inserted + this.text().slice(end);
    this.text.set(value);
    this.updateSuggestions(value, start + inserted.length);
    this.focusAt(start + inserted.length);
  }

  /**
   * Restores keyboard focus and caret position after a programmatic insertion.
   *
   * @param position - Desired caret offset in the updated textarea.
   */
  private focusAt(position: number): void {
    requestAnimationFrame(() => {
      this.resizeTextarea();
      this.field?.nativeElement.focus();
      this.field?.nativeElement.setSelectionRange(position, position);
    });
  }

  /** Fits multiline drafts to their content until the CSS max-height is reached. */
  private resizeTextarea(): void {
    const field = this.field?.nativeElement;
    if (!field) return;
    field.style.height = 'auto';
    field.style.height = `${field.scrollHeight}px`;
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
