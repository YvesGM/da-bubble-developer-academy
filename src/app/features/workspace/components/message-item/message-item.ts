import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth } from '@angular/fire/auth';
import { FormsModule } from '@angular/forms';
import { of, switchMap } from 'rxjs';

import { DEFAULT_RECENT_EMOJIS } from '../../../../core/constants/emoji.constants';
import { ConversationTarget } from '../../../../core/models/conversation.model';
import { Message } from '../../../../core/models/message.model';
import { ReactionGroup } from '../../../../core/models/reaction.model';
import { UserProfile } from '../../../../core/models/user-profile.model';
import { MessageService } from '../../../../core/services/message.service';
import { ReactionService } from '../../../../core/services/reaction.service';
import { UserService } from '../../../../core/services/user.service';
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
  private readonly usersService = inject(UserService);

  @Input({ required: true }) target!: ConversationTarget;
  @Input({ required: true }) message!: Message;
  @Input() parentMessageId = '';
  @Input() recentEmojis: string[] = [...DEFAULT_RECENT_EMOJIS];
  @Input() compactReactions = false;
  @Output() readonly threadRequested = new EventEmitter<Message>();

  readonly users = toSignal(this.usersService.observeUsers(), { initialValue: [] });
  readonly editing = signal(false);
  readonly editText = signal('');
  readonly showEmojiPicker = signal(false);
  readonly reactions = toSignal(
    of(null).pipe(switchMap(() => this.observeCurrentReactions())),
    { initialValue: [] as ReactionGroup[] },
  );
  readonly visibleReactions = computed(() =>
    this.reactions().slice(0, this.compactReactions ? 7 : 20),
  );

  isOwnMessage(): boolean {
    return this.auth.currentUser?.uid === this.message.authorId;
  }

  startEditing(): void {
    this.editText.set(this.message.text);
    this.editing.set(true);
  }

  async saveEdit(): Promise<void> {
    const value = this.editText().trim();
    if (!value || this.parentMessageId) return;
    await this.messages.updateMessage(this.target, this.message.id, value);
    this.editing.set(false);
  }

  async removeMessage(): Promise<void> {
    if (!this.isOwnMessage() || this.parentMessageId) return;
    await this.messages.deleteMessage(this.target, this.message.id);
  }

  async toggleReaction(emoji: string): Promise<void> {
    const messageId = this.parentMessageId || this.message.id;
    const replyId = this.parentMessageId ? this.message.id : undefined;
    await this.reactionsService.toggleReaction(this.target, messageId, emoji, replyId);
    this.showEmojiPicker.set(false);
  }

  reactionNames(group: ReactionGroup): string {
    return group.userIds.map((uid) => this.userName(uid)).join(', ');
  }

  hiddenReactionCount(): number {
    return Math.max(0, this.reactions().length - this.visibleReactions().length);
  }

  private observeCurrentReactions() {
    const messageId = this.parentMessageId || this.message.id;
    const replyId = this.parentMessageId ? this.message.id : undefined;
    return this.reactionsService.observeReactions(this.target, messageId, replyId);
  }

  private userName(uid: string): string {
    if (uid === this.auth.currentUser?.uid && this.auth.currentUser?.isAnonymous) return 'Guest';
    return this.users().find((user) => user.uid === uid)?.displayName ?? 'Guest';
  }
}
