import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth } from '@angular/fire/auth';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

import { ConversationTarget } from '../../../core/models/conversation.model';
import { UserService } from '../../../core/services/user.service';
import { ChatPanel } from '../components/chat-panel/chat-panel';

@Component({
  selector: 'app-direct-message-view',
  imports: [ChatPanel],
  templateUrl: './direct-message-view.html',
  styleUrl: './direct-message-view.scss',
})
export class DirectMessageView {
  private readonly auth = inject(Auth);
  private readonly route = inject(ActivatedRoute);
  private readonly usersService = inject(UserService);

  readonly users = toSignal(this.usersService.observeUsers(), { initialValue: [] });
  readonly dmId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('dmId') ?? '')),
    { initialValue: '' },
  );
  readonly partner = computed(() => this.findPartner());
  readonly target = computed<ConversationTarget>(() => ({
    type: 'directMessage',
    id: this.dmId(),
  }));

  private findPartner() {
    const ids = this.dmId().split('__');
    const partnerId = ids.find((uid) => uid !== this.auth.currentUser?.uid);
    return this.users().find((user) => user.uid === partnerId);
  }
}
