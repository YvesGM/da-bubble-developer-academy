import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

import { conversationRoute } from '../../../../core/models/conversation.model';
import { SearchResult } from '../../../../core/models/search-result.model';
import { UserProfile } from '../../../../core/models/user-profile.model';
import { SearchService } from '../../../../core/services/search.service';

@Component({
  selector: 'app-search-box',
  templateUrl: './search-box.html',
  styleUrl: './search-box.scss',
})
export class SearchBox {
  private readonly router = inject(Router);
  private readonly searchService = inject(SearchService);

  @Output() readonly userSelected = new EventEmitter<UserProfile>();

  readonly query = signal('');
  readonly focused = signal(false);
  readonly results = toSignal(
    toObservable(this.query).pipe(
      debounceTime(150),
      distinctUntilChanged(),
      switchMap((value) => this.searchService.search(value)),
    ),
    { initialValue: [] as SearchResult[] },
  );

  /**
   * Opens the route or profile represented by a selected search result.
   *
   * @param result - Search result selected by the user.
   * @returns A promise that resolves after any required navigation completes.
   */
  async openResult(result: SearchResult): Promise<void> {
    this.focused.set(false);
    if (result.type === 'user') return this.userSelected.emit(result.user);
    if (result.type === 'channel') {
      await this.router.navigate(['/workspace/channel', result.channelId]);
      return;
    }
    await this.router.navigate(conversationRoute(result.target));
  }
}
