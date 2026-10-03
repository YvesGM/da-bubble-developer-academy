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

  ngAfterViewInit(): void {
    if (this.autoFocus) queueMicrotask(() => this.field?.nativeElement.focus());
  }

  handleEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey) return;
    keyboardEvent.preventDefault();
    this.submit();
  }

  submit(): void {
    const value = this.text().trim();
    if (!value) return;
    this.sendRequested.emit(value);
    this.text.set('');
    this.closeSuggestions();
    queueMicrotask(() => this.field?.nativeElement.focus());
  }

  updateText(value: string): void {
    this.text.set(value);
    this.updateSuggestions(value);
  }

  insertEmoji(emoji: string): void {
    this.text.update((value) => value + emoji);
    this.emojiUsed.emit(emoji);
    this.showEmojiPicker.set(false);
    queueMicrotask(() => this.field?.nativeElement.focus());
  }

  chooseUser(user: UserProfile): void {
    this.replaceTrigger(`@${user.displayName}`);
  }

  chooseChannel(channel: Channel): void {
    this.replaceTrigger(`#${channel.name}`);
  }

  matchingUsers(): UserProfile[] {
    const value = this.query().toLowerCase();
    return this.users.filter((user) => user.displayName.toLowerCase().includes(value));
  }

  matchingChannels(): Channel[] {
    const value = this.query().toLowerCase();
    return this.channels.filter((channel) => channel.name.toLowerCase().includes(value));
  }

  private updateSuggestions(value: string): void {
    const match = value.match(/(?:^|\s)([@#])([^@#\s]*)$/);
    this.trigger.set((match?.[1] as '@' | '#' | undefined) ?? null);
    this.query.set(match?.[2] ?? '');
  }

  private replaceTrigger(replacement: string): void {
    this.text.update((value) => value.replace(/([@#])([^@#\s]*)$/, `${replacement} `));
    this.closeSuggestions();
    queueMicrotask(() => this.field?.nativeElement.focus());
  }

  private closeSuggestions(): void {
    this.trigger.set(null);
    this.query.set('');
  }
}
