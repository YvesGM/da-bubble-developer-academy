import { Component, EventEmitter, Input, Output } from '@angular/core';

import { ConversationTarget } from '../../../../core/models/conversation.model';
import { Message } from '../../../../core/models/message.model';
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
  @Output() readonly threadRequested = new EventEmitter<Message>();
}
