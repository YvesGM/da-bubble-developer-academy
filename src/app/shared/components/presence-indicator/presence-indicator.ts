import { Component, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';

import { PresenceService } from '../../../core/services/presence.service';

/**
 * Displays a user's online status as a reusable presence indicator.
 *
 * Reactively subscribes to the selected user's status. An empty user ID
 * resolves to offline without opening a presence subscription.
 */
@Component({
  selector: 'app-presence-indicator',
  templateUrl: './presence-indicator.html',
  styleUrl: './presence-indicator.scss',
})
export class PresenceIndicator {
  /** Shared service that observes live per-user presence changes. */
  private readonly presence = inject(PresenceService);

  /** Firebase user ID whose online status should be displayed. */
  readonly userId = input('');

  /** Enables the textual status label in addition to the status marker. */
  readonly showLabel = input(false);

  /** Current online state; starts offline and follows changes to `userId`. */
  readonly online = toSignal(
    toObservable(this.userId).pipe(
      switchMap((uid) => uid ? this.presence.observeOnline(uid) : of(false)),
    ),
    { initialValue: false },
  );
}
