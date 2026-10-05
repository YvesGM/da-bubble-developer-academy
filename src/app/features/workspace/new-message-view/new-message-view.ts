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

  /**
   * Navigates to the selected channel.
   *
   * @param channelId - Identifier of the selected channel.
   * @returns A promise that resolves after navigation completes.
   */
  async selectChannel(channelId: string): Promise<void> {
    await this.router.navigate(['/workspace/channel', channelId]);
  }

  /**
   * Normalizes the current query by removing an optional prefix and lowercasing it.
   *
   * @returns The normalized search query.
   */
  private normalizedQuery(): string {
    return this.query().trim().replace(/^[@#]/, '').toLowerCase();
  }

  /**
   * Checks whether a user identifier belongs to the current Firebase session.
   *
   * @param uid - User identifier to compare.
   * @returns Whether the identifier belongs to the current user.
   */
  isCurrentUser(uid: string): boolean {
    return uid === this.auth.currentUser?.uid;
  }

  /**
   * Checks whether a user profile matches the normalized query.
   *
   * @param user - User profile to inspect.
   * @param query - Normalized query.
   * @returns Whether the display name or email matches.
   */
  private matchesUser(user: UserProfile, query: string): boolean {
    if (!query) return true;
    return user.displayName.toLowerCase().includes(query)
      || user.email?.toLowerCase().includes(query) === true;
  }
}
