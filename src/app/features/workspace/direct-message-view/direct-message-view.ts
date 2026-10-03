import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth } from '@angular/fire/auth';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { ConversationTarget } from '../../../core/models/conversation.model';
import { UserProfile } from '../../../core/models/user-profile.model';
import { UserService } from '../../../core/services/user.service';
import { ProfileCard } from '../../profile/profile-card/profile-card';
import { ProfileDialog } from '../../profile/profile-dialog/profile-dialog';
import { ChatPanel } from '../components/chat-panel/chat-panel';

@Component({
  selector: 'app-direct-message-view',
  imports: [ChatPanel, RouterLink, ProfileCard, ProfileDialog],
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
    { initialValue: this.route.snapshot.paramMap.get('dmId') ?? '' },
  );
  readonly participantUsers = computed(() =>
    this.users().filter((user) => this.dmId().split('__').includes(user.uid)),
  );
  readonly partner = computed(() => this.findPartner());
  readonly target = computed<ConversationTarget>(() => ({
    type: 'directMessage',
    id: this.dmId(),
  }));
  readonly selectedUser = signal<UserProfile | null>(null);
  readonly showProfileEditor = signal(false);

  openProfile(uid: string): void {
    const user = this.users().find((item) => item.uid === uid);
    if (user) this.selectedUser.set(user);
  }

  openProfileEditor(): void {
    this.selectedUser.set(null);
    this.showProfileEditor.set(true);
  }

  currentUserId(): string {
    return this.auth.currentUser?.uid ?? '';
  }

  private findPartner(): UserProfile | undefined {
    const partnerId = this.dmId().split('__').find((uid) => uid !== this.currentUserId());
    return this.users().find((user) => user.uid === partnerId);
  }
}
