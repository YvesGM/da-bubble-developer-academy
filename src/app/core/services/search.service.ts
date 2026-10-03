import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Observable, combineLatest, map, of, switchMap } from 'rxjs';

import { Channel } from '../models/channel.model';
import { ConversationTarget } from '../models/conversation.model';
import { DirectMessage } from '../models/direct-message.model';
import { MessageSearchResult } from '../models/search-result.model';
import { UserProfile } from '../models/user-profile.model';
import { ChannelService } from './channel.service';
import { DirectMessageService } from './direct-message.service';
import { MessageService } from './message.service';
import { UserService } from './user.service';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly auth = inject(Auth);
  private readonly channels = inject(ChannelService);
  private readonly directMessages = inject(DirectMessageService);
  private readonly messages = inject(MessageService);
  private readonly users = inject(UserService);

  searchMessages(searchText: string): Observable<MessageSearchResult[]> {
    const query = searchText.trim().toLowerCase();
    if (!query) return of([]);
    return combineLatest([
      this.channels.observeCurrentUserChannels(),
      this.directMessages.observeCurrentUserConversations(),
      this.users.observeUsers(),
    ]).pipe(
      switchMap(([channels, dms, users]) => this.searchConversations(query, channels, dms, users)),
    );
  }

  private searchConversations(
    query: string,
    channels: Channel[],
    dms: DirectMessage[],
    users: UserProfile[],
  ): Observable<MessageSearchResult[]> {
    const contexts = this.contexts(channels, dms, users);
    if (!contexts.length) return of([]);
    return combineLatest(contexts.map((context) => this.searchContext(query, context)));
  }

  private searchContext(query: string, context: SearchContext): Observable<MessageSearchResult[]> {
    return this.messages.observeMessages(context.target).pipe(
      map((messages) =>
        messages
          .filter((message) => message.text.toLowerCase().includes(query))
          .map((message) => ({ ...context, message })),
      ),
    );
  }

  private contexts(channels: Channel[], dms: DirectMessage[], users: UserProfile[]): SearchContext[] {
    return [
      ...channels.map((channel) => this.channelContext(channel)),
      ...dms.map((dm) => this.dmContext(dm, users)),
    ];
  }

  private channelContext(channel: Channel): SearchContext {
    return {
      target: { type: 'channel', id: channel.id },
      conversationLabel: `# ${channel.name}`,
    };
  }

  private dmContext(dm: DirectMessage, users: UserProfile[]): SearchContext {
    const partnerId = dm.participantIds.find((uid) => uid !== this.auth.currentUser?.uid);
    const name = users.find((user) => user.uid === partnerId)?.displayName ?? 'Direct message';
    return { target: { type: 'directMessage', id: dm.id }, conversationLabel: name };
  }
}

interface SearchContext {
  target: ConversationTarget;
  conversationLabel: string;
}
