import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { Channel } from '../../../../core/models/channel.model';
import { DirectMessage } from '../../../../core/models/direct-message.model';
import { UserProfile } from '../../../../core/models/user-profile.model';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { PresenceIndicator } from '../../../../shared/components/presence-indicator/presence-indicator';

/**
 * Lists accessible channels and direct-message conversations in the workspace.
 *
 * Inputs supply the navigation data and account permissions; creation and
 * recipient selection events are forwarded to the parent workspace.
 */
@Component({
  selector: 'app-workspace-sidebar',
  imports: [RouterLink, RouterLinkActive, Avatar, PresenceIndicator],
  templateUrl: './workspace-sidebar.html',
  styleUrl: './workspace-sidebar.scss',
})
export class WorkspaceSidebar {
  /** Router dependency used for navigation after the current action completes. */
  private readonly router = inject(Router);

  /** Channels accessible to the current account in this workspace. */
  @Input({ required: true }) channels: Channel[] = [];
  /** Private conversations accessible to the signed-in account. */
  @Input() directMessages: DirectMessage[] = [];
  /** Workspace user profiles used to resolve visible names and avatar data. */
  @Input() users: UserProfile[] = [];
  /** UID of the current account, used to mark the user's own row. */
  @Input() currentUserId = '';
  /** Workspace display name shown in headings and dialogs. */
  @Input() workspaceName = 'Workspace';
  /** Error shown when opening a direct conversation fails. */
  @Input() directMessageError = '';
  /** Requests opening the channel creation flow. */
  @Output() readonly createRequested = new EventEmitter<void>();
  /** Emits a user UID selected from the private-conversation navigation. */
  @Output() readonly userRequested = new EventEmitter<string>();

  /** Whether the channel navigation section is expanded. */
  readonly channelsExpanded = signal(true);
  /** Whether the private conversation list is expanded. */
  readonly directMessagesExpanded = signal(true);

  /** Toggles the visibility of the channel list. */
  toggleChannels(): void {
    this.channelsExpanded.update((expanded) => !expanded);
  }

  /** Toggles the visibility of all visible workspace users. */
  toggleDirectMessages(): void {
    this.directMessagesExpanded.update((expanded) => !expanded);
  }

  /**
   * Shows the signed-in user first, followed by the existing sorted user list.
   *
   * @returns User profiles in the sidebar's display order.
   */
  visibleUsers(): UserProfile[] {
    const self = this.users.find((user) => user.uid === this.currentUserId);
    const others = this.users.filter((user) => user.uid !== this.currentUserId);
    return self ? [self, ...others] : others;
  }

  /**
   * Resolves conversations with guests who have no registered profile.
   *
   * @returns Guest conversations with their anonymous participant identifier.
   */
  guestConversations(): { uid: string; id: string }[] {
    return this.directMessages.flatMap((dm) => {
      const uid = dm.participantIds.find((id) => id !== this.currentUserId);
      return uid && !this.users.some((user) => user.uid === uid) ? [{ uid, id: dm.id }] : [];
    });
  }

  /**
   * Highlights the user whose existing conversation matches the current DM route.
   *
   * @param uid - User ID from the sidebar.
   * @returns Whether the current route opens this user's conversation.
   */
  isActiveUser(uid: string): boolean {
    return this.directMessages.some((dm) => {
      const partner = dm.participantIds.find((id) => id !== this.currentUserId)
        ?? this.currentUserId;
      return partner === uid && this.router.url === `/workspace/dm/${dm.id}`;
    });
  }

  /**
   * Labels the current user's personal conversation as shown in the Figma menu.
   *
   * @param user - Profile to display in the sidebar.
   * @returns Display name with the current-user suffix when applicable.
   */
  userLabel(user: UserProfile): string {
    return user.displayName + (user.uid === this.currentUserId ? ' (Du)' : '');
  }
}
