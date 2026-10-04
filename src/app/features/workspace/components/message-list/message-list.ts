import { Component, EventEmitter, Input, Output } from '@angular/core';

import { ConversationTarget } from '../../../../core/models/conversation.model';
import { Message } from '../../../../core/models/message.model';
import { messageDateLabel, sameMessageDay } from '../../../../core/utils/timestamp.util';
import { MessageItem } from '../message-item/message-item';

@Component({
  selector: 'app-message-list',
  imports: [MessageItem],
  templateUrl: './message-list.html',
  styleUrl: './message-list.scss',
})
export class MessageList {
  @Input({ required: true }) target!: ConversationTarget;
  @Input({ required: true }) messages: Message[] = [];
  @Input() recentEmojis: string[] = [];
  @Input() emptyTitle = 'Noch keine Nachrichten.';
  @Input() emptyText = 'Starte die Unterhaltung unten.';
  @Output() readonly threadRequested = new EventEmitter<Message>();
  @Output() readonly userRequested = new EventEmitter<string>();

  showDateSeparator(index: number): boolean {
    if (index === 0) return true;
    return !sameMessageDay(this.messages[index - 1]?.createdAt, this.messages[index]?.createdAt);
  }

  dateLabel(message: Message): string {
    return messageDateLabel(message.createdAt);
  }
}
