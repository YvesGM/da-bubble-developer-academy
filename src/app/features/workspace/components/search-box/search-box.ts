import { Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

import { conversationRoute } from '../../../../core/models/conversation.model';
import { MessageSearchResult } from '../../../../core/models/search-result.model';
import { SearchService } from '../../../../core/services/search.service';

@Component({
  selector: 'app-search-box',
  templateUrl: './search-box.html',
  styleUrl: './search-box.scss',
})
export class SearchBox {
  private readonly router = inject(Router);
  private readonly search = inject(SearchService);

  readonly query = signal('');
  readonly focused = signal(false);
  readonly results = toSignal(
    toObservable(this.query).pipe(
      debounceTime(150),
      distinctUntilChanged(),
      switchMap((value) => this.search.searchMessages(value)),
    ),
    { initialValue: [] as MessageSearchResult[] },
  );

  async openResult(result: MessageSearchResult): Promise<void> {
    this.focused.set(false);
    await this.router.navigate(conversationRoute(result.target));
  }
}
