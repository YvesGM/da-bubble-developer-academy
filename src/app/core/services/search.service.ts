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

  /**
   * Searches visible users, channels and messages based on free text or an optional search prefix.
   *
   * @param searchText - Raw search text entered by the user.
   * @returns An observable containing matching users, channels and contextual message results.
   */
  search(searchText: string): Observable<SearchResult[]> {
    const value = searchText.trim();
    const query = value.replace(/^[@#]/, '').toLowerCase();
    if (!this.hasSearchQuery(value, query)) return of([]);
    return this.searchSources().pipe(
      switchMap(([channels, dms, users]) =>
        this.collectResults(query, channels, dms, users, this.searchMode(value)),
      ),
    );
  }

  /**
   * Determines whether the current input represents a meaningful search.
   *
   * @param value - Trimmed raw search input.
   * @param query - Normalized search query without the optional prefix.
   * @returns Whether a search should be executed.
   */
  private hasSearchQuery(value: string, query: string): boolean {
    return Boolean(query || value.startsWith('@') || value.startsWith('#'));
  }

  /**
   * Combines the channel, direct-message and user streams required by global search.
   *
   * @returns An observable tuple containing channels, direct messages and users.
   */
  private searchSources() {
    return combineLatest([
      this.channels.observeCurrentUserChannels(),
      this.directMessages.observeCurrentUserConversations(),
      this.users.observeUsers(),
    ]);
  }

  /**
   * Builds the result set for the selected search mode.
   *
   * @param query - Normalized search query.
   * @param channels - Channels visible to the current user.
   * @param dms - Direct-message conversations visible to the current user.
   * @param users - Visible workspace users.
   * @param mode - Search mode derived from the input prefix.
   * @returns An observable containing matching search results.
   */
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

  /**
   * Extends immediate user and channel results with message matches.
   *
   * @param query - Normalized message query.
   * @param channels - Visible channels.
   * @param dms - Visible direct-message conversations.
   * @param users - Visible users used to label conversations.
   * @param immediate - Already resolved user and channel results.
   * @returns An observable containing immediate and message results.
   */
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

  /**
   * Resolves the active search mode from the raw search input.
   *
   * @param value - Trimmed raw search input.
   * @returns The resolved search mode.
   */
  private searchMode(value: string): SearchMode {
    if (value.startsWith('@')) return 'users';
    if (value.startsWith('#')) return 'channels';
    return 'all';
  }

  /**
   * Creates user results matching the normalized query.
   *
   * @param query - Normalized user query.
   * @param users - Users available for search.
   * @returns Matching user results.
   */
  private userResults(query: string, users: UserProfile[]): SearchResult[] {
    return users
      .filter((user) => this.userMatches(user, query))
      .map((user) => ({ type: 'user', id: user.uid, label: user.displayName, user }));
  }

  /**
   * Creates channel results matching the normalized query.
   *
   * @param query - Normalized channel query.
   * @param channels - Channels available for search.
   * @returns Matching channel results.
   */
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

  /**
   * Checks whether a user profile matches the query.
   *
   * @param user - User profile to inspect.
   * @param query - Normalized query.
   * @returns Whether the display name or email matches.
   */
  private userMatches(user: UserProfile, query: string): boolean {
    return user.displayName.toLowerCase().includes(query)
      || user.email?.toLowerCase().includes(query) === true;
  }

  /**
   * Maps matching messages from one conversation into contextual search results.
   *
   * @param query - Normalized message query.
   * @param context - Conversation target and display label.
   * @returns An observable containing matching message results.
   */
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

  /**
   * Builds searchable contexts for all visible conversations.
   *
   * @param channels - Visible channels.
   * @param dms - Visible direct-message conversations.
   * @param users - Visible users used to resolve direct-message labels.
   * @returns Search contexts for all visible conversations.
   */
  private contexts(channels: Channel[], dms: DirectMessage[], users: UserProfile[]): SearchContext[] {
    return [
      ...channels.map((channel) => ({
        target: { type: 'channel' as const, id: channel.id },
        label: `# ${channel.name}`,
      })),
      ...dms.map((dm) => this.dmContext(dm, users)),
    ];
  }

  /**
   * Builds the search context for a direct-message conversation.
   *
   * @param dm - Direct-message conversation.
   * @param users - Visible user profiles.
   * @returns The resolved direct-message search context.
   */
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
