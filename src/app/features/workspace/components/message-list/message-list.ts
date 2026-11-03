import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Channel } from '../../../../core/models/channel.model';
import { ConversationTarget } from '../../../../core/models/conversation.model';
import { Message } from '../../../../core/models/message.model';
import { UserProfile } from '../../../../core/models/user-profile.model';
import { messageDateLabel, sameMessageDay } from '../../../../core/utils/timestamp.util';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { MessageItem } from '../message-item/message-item';

/**
 * Displays ordered messages and the appropriate empty-conversation introduction.
 *
 * Each message receives the current conversation context; user and thread
 * actions bubble up to the owning chat panel.
 */
@Component({
  selector: 'app-message-list',
  imports: [MessageItem, Avatar],
  templateUrl: './message-list.html',
  styleUrl: './message-list.scss',
})
export class MessageList {
  /** Conversation target passed to messaging, reactions, and navigation. */
  @Input({ required: true }) target!: ConversationTarget;
  /** Conversation messages observed for the selected target. */
  @Input({ required: true }) messages: Message[] = [];
  /** Channels accessible to the viewer for resolving message references. */
  @Input() channels: Channel[] = [];
  /** User's recent emoji choices offered ahead of the default picker. */
  @Input() recentEmojis: string[] = [];
  /** Heading shown when the conversation has no messages. */
  @Input() emptyTitle = 'Noch keine Nachrichten.';
  /** Explanatory copy for a newly created or empty conversation. */
  @Input() emptyText = 'Starte die Unterhaltung unten.';
  /** Channel name appended to the introduction when history is empty. */
  @Input() emptyChannelName = '';
  /** Avatar preset shown in the empty direct-message introduction. */
  @Input() emptyAvatarId = '';
  /** Name used for the accessible empty-state avatar. */
  @Input() emptyAvatarName = '';
  /** Optional user mentioned in the empty-conversation introduction. */
  @Input() emptyMentionUser: UserProfile | null = null;
  /** Requests opening the reply thread for the selected message. */
  @Output() readonly threadRequested = new EventEmitter<Message>();
  /** Forwards user profile requests from a message to the chat panel. */
  @Output() readonly userRequested = new EventEmitter<string>();

  /**
   * Determines whether a date separator should be rendered before a message.
   *
   * @param index - Index of the message in the rendered list.
   * @returns Whether the message starts a new calendar day.
   */
  showDateSeparator(index: number): boolean {
    if (index === 0) return true;
    return !sameMessageDay(this.messages[index - 1]?.createdAt, this.messages[index]?.createdAt);
  }

  /**
   * Formats the date label displayed for a message group.
   *
   * @param message - Message whose creation date should be formatted.
   * @returns The localized date label.
   */
  dateLabel(message: Message): string {
    return messageDateLabel(message.createdAt);
  }
}
