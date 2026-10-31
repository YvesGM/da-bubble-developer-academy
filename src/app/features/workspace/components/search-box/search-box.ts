import { Component, EventEmitter, HostListener, Input, Output, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

import { conversationRoute } from '../../../../core/models/conversation.model';
import { SearchResult } from '../../../../core/models/search-result.model';
import { UserProfile } from '../../../../core/models/user-profile.model';
import { SearchService } from '../../../../core/services/search.service';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { PresenceIndicator } from '../../../../shared/components/presence-indicator/presence-indicator';
import { InputCaretDirective } from '../../../../shared/directives/input-caret.directive';

@Component({
  selector: 'app-search-box',
  imports: [InputCaretDirective, Avatar, PresenceIndicator],
  templateUrl: './search-box.html',
  styleUrl: './search-box.scss',
})
export class SearchBox {
  private readonly router = inject(Router);
  private readonly searchService = inject(SearchService);

  @Input() placeholder = 'Workspace durchsuchen';
  @Output() readonly userSelected = new EventEmitter<UserProfile>();

  readonly query = signal('');
  readonly focused = signal(false);
  readonly mobileOpen = signal(false);
  readonly results = toSignal(
    toObservable(this.query).pipe(
      debounceTime(150),
      distinctUntilChanged(),
      switchMap((value) => this.searchService.search(value)),
    ),
    { initialValue: [] as SearchResult[] },
  );

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
