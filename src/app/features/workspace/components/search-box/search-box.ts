import { Component, EventEmitter, HostListener, Input, Output, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

import { conversationRoute } from '../../../../core/models/conversation.model';
import { Message } from '../../../../core/models/message.model';
import { resolveMessageAuthorName } from '../../../../core/utils/message-author.util';
import { SearchResult } from '../../../../core/models/search-result.model';
import { UserProfile } from '../../../../core/models/user-profile.model';
import { SearchService } from '../../../../core/services/search.service';
import { UserService } from '../../../../core/services/user.service';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { PresenceIndicator } from '../../../../shared/components/presence-indicator/presence-indicator';
import { InputCaretDirective } from '../../../../shared/directives/input-caret.directive';

/**
 * Provides workspace-wide search with suggestions for people, channels, and messages.
 *
 * The component manages query focus and responsive presentation while
 * navigation and user selection are exposed to the surrounding workspace.
 */
@Component({
  selector: 'app-search-box',
  imports: [InputCaretDirective, Avatar, PresenceIndicator],
  templateUrl: './search-box.html',
  styleUrl: './search-box.scss',
})
export class SearchBox {
  /** Router dependency used for navigation after the current action completes. */
  private readonly router = inject(Router);
  /** Workspace search service providing combined user, channel, and message matches. */
  private readonly searchService = inject(SearchService);
  /** User service supplying live names for message search results. */
  private readonly usersService = inject(UserService);

  /** Hint shown when the search or text field is empty. */
  @Input() placeholder = 'Workspace durchsuchen';
  /** Emits a member profile selected in the list or dialog. */
  @Output() readonly userSelected = new EventEmitter<UserProfile>();

  /** Current search or mention query typed by the user. */
  readonly query = signal('');
  /** Whether the search input has keyboard focus. */
  readonly focused = signal(false);
  /** Whether the mobile search surface is expanded. */
  readonly mobileOpen = signal(false);
  /** Current user profiles used to resolve message authors after profile renaming. */
  readonly users = toSignal(this.usersService.observeUsers(), { initialValue: [] as UserProfile[] });
  /** Reactive search suggestions derived from the entered query. */
  readonly results = toSignal(
    toObservable(this.query).pipe(
      debounceTime(150),
      distinctUntilChanged(),
      switchMap((value) => this.searchService.search(value)),
    ),
    { initialValue: [] as SearchResult[] },
  );

  /**
   * Resolves a message author's current name in search suggestions.
   *
   * @param message - Message whose author should be displayed.
   * @returns Current profile name, or the saved message author snapshot.
   */
  authorName(message: Message): string {
    return resolveMessageAuthorName(message, this.users());
  }

  /** Keeps the existing desktop dropdown and opens Figma's mobile search page. */
  activateSearch(): void {
    this.focused.set(true);
    if (window.innerWidth <= 800) this.mobileOpen.set(true);
  }

  /** Returns to the mobile workspace menu and clears the previous search. */
  closeMobileSearch(): void {
    this.mobileOpen.set(false);
    this.focused.set(false);
    this.query.set('');
  }

  /** Closes the mobile search view with Escape. */
  @HostListener('document:keydown.escape')
  dismissSearch(): void {
    if (this.mobileOpen()) this.closeMobileSearch();
  }

  /**
   * Opens the route or profile represented by a selected search result.
   *
   * @param result - Search result selected by the user.
   * @returns A promise that resolves after any required navigation completes.
   */
  async openResult(result: SearchResult): Promise<void> {
    this.closeMobileSearch();
    if (result.type === 'user') return this.userSelected.emit(result.user);
    if (result.type === 'channel') {
      await this.router.navigate(['/workspace/channel', result.channelId]);
      return;
    }
    await this.router.navigate(conversationRoute(result.target));
  }
}
