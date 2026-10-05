import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth } from '@angular/fire/auth';
import { Router, RouterLink } from '@angular/router';

import { Channel } from '../../../core/models/channel.model';
import { UserProfile } from '../../../core/models/user-profile.model';
import { ChannelService } from '../../../core/services/channel.service';
import { DirectMessageService } from '../../../core/services/direct-message.service';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-new-message-view',
  imports: [RouterLink],
  templateUrl: './new-message-view.html',
  styleUrl: './new-message-view.scss',
})
export class NewMessageView {
  private readonly auth = inject(Auth);
  private readonly channelsService = inject(ChannelService);
  private readonly directMessages = inject(DirectMessageService);
  private readonly router = inject(Router);
  private readonly usersService = inject(UserService);

  readonly query = signal('');
  readonly users = toSignal(this.usersService.observeUsers(), { initialValue: [] });
  readonly channels = toSignal(this.channelsService.observeCurrentUserChannels(), { initialValue: [] });
  readonly mode = computed<'@' | '#'>(() => this.query().trim().startsWith('#') ? '#' : '@');

  /**
   * Filters workspace users by the normalized new-message query.
   *
   * @returns User profiles matching the current query.
   */
  filteredUsers(): UserProfile[] {
    const query = this.normalizedQuery();
    return this.users().filter((user) => this.matchesUser(user, query));
  }

  /**
   * Filters visible channels by the normalized new-message query.
   *
   * @returns Channels whose names match the current query.
   */
  filteredChannels(): Channel[] {
    const query = this.normalizedQuery();
    return this.channels().filter((channel) => channel.name.toLowerCase().includes(query));
  }

  /**
   * Opens or creates a direct-message conversation with the selected user.
   *
   * @param uid - Firebase user identifier to message.
   * @returns A promise that resolves after navigation completes.
   */
  async selectUser(uid: string): Promise<void> {
    const dmId = await this.directMessages.openConversation(uid);
    await this.router.navigate(['/workspace/dm', dmId]);
  }

  async selectChannel(channelId: string): Promise<void> {
    await this.router.navigate(['/workspace/channel', channelId]);
  }

  private normalizedQuery(): string {
    return this.query().trim().replace(/^[@#]/, '').toLowerCase();
  }

  isCurrentUser(uid: string): boolean {
    return uid === this.auth.currentUser?.uid;
  }

  private matchesUser(user: UserProfile, query: string): boolean {
    if (!query) return true;
    return user.displayName.toLowerCase().includes(query)
      || user.email?.toLowerCase().includes(query) === true;
  }
}
