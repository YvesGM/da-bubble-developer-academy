import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Observable, combineLatest, map, of, switchMap } from 'rxjs';

import { Channel } from '../models/channel.model';
import { ConversationTarget } from '../models/conversation.model';
import { DirectMessage } from '../models/direct-message.model';
import { SearchResult } from '../models/search-result.model';
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

  search(searchText: string): Observable<SearchResult[]> {
    const value = searchText.trim();
    const query = value.replace(/^[@#]/, '').toLowerCase();
    if (!query && !value.startsWith('@') && !value.startsWith('#')) return of([]);
    const mode = this.searchMode(value);
    return combineLatest([
      this.channels.observeCurrentUserChannels(),
      this.directMessages.observeCurrentUserConversations(),
      this.users.observeUsers(),
    ]).pipe(
      switchMap(([channels, dms, users]) =>
        this.collectResults(query, channels, dms, users, mode),
      ),
    );
  }

  private collectResults(
    query: string,
    channels: Channel[],
    dms: DirectMessage[],
    users: UserProfile[],
    mode: SearchMode,
  ): Observable<SearchResult[]> {
    if (mode === 'users') return of(this.userResults(query, users));
    if (mode === 'channels') return of(this.channelResults(query, channels));
    const immediate = [...this.userResults(query, users), ...this.channelResults(query, channels)];
    return this.withMessageResults(query, channels, dms, users, immediate);
  }

  private withMessageResults(
    query: string,
    channels: Channel[],
    dms: DirectMessage[],
    users: UserProfile[],
    immediate: SearchResult[],
  ): Observable<SearchResult[]> {
    const contexts = this.contexts(channels, dms, users);
    if (!contexts.length) return of(immediate);
    return combineLatest(contexts.map((context) => this.messageResults(query, context))).pipe(
      map((messages) => [...immediate, ...messages.flat()]),
    );
  }

  private searchMode(value: string): SearchMode {
    if (value.startsWith('@')) return 'users';
    if (value.startsWith('#')) return 'channels';
    return 'all';
  }

  private userResults(query: string, users: UserProfile[]): SearchResult[] {
    return users
      .filter((user) => this.userMatches(user, query))
      .map((user) => ({ type: 'user', id: user.uid, label: user.displayName, user }));
  }

  private channelResults(query: string, channels: Channel[]): SearchResult[] {
    return channels
      .filter((channel) => channel.name.toLowerCase().includes(query))
      .map((channel) => ({
        type: 'channel',
        id: channel.id,
        label: `# ${channel.name}`,
        channelId: channel.id,
      }));
  }

  private userMatches(user: UserProfile, query: string): boolean {
    return user.displayName.toLowerCase().includes(query)
      || user.email?.toLowerCase().includes(query) === true;
  }

  private messageResults(query: string, context: SearchContext): Observable<SearchResult[]> {
    return this.messages.observeMessages(context.target).pipe(
      map((messages) => messages
        .filter((message) => !message.deleted && message.text.toLowerCase().includes(query))
        .map((message) => ({
          type: 'message' as const,
          id: `${context.target.type}-${context.target.id}-${message.id}`,
          label: context.label,
          target: context.target,
          message,
        }))),
    );
  }

  private contexts(channels: Channel[], dms: DirectMessage[], users: UserProfile[]): SearchContext[] {
    return [
      ...channels.map((channel) => ({
        target: { type: 'channel' as const, id: channel.id },
        label: `# ${channel.name}`,
      })),
      ...dms.map((dm) => this.dmContext(dm, users)),
    ];
  }

  private dmContext(dm: DirectMessage, users: UserProfile[]): SearchContext {
    const partnerId = dm.participantIds.find((uid) => uid !== this.auth.currentUser?.uid);
    const name = users.find((user) => user.uid === partnerId)?.displayName ?? 'Direct message';
    return { target: { type: 'directMessage', id: dm.id }, label: name };
  }
}

interface SearchContext {
  target: ConversationTarget;
  label: string;
}

type SearchMode = 'all' | 'users' | 'channels';
