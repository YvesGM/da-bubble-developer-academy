import { Component, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';

import { PresenceService } from '../../../core/services/presence.service';

@Component({
  selector: 'app-presence-indicator',
  templateUrl: './presence-indicator.html',
  styleUrl: './presence-indicator.scss',
})
export class PresenceIndicator {
  private readonly presence = inject(PresenceService);

  readonly userId = input('');
  readonly showLabel = input(false);
  readonly online = toSignal(
    toObservable(this.userId).pipe(
      switchMap((uid) => uid ? this.presence.observeOnline(uid) : of(false)),
    ),
    { initialValue: false },
  );
}
