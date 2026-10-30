import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { Channel } from '../../../../core/models/channel.model';
import { DirectMessage } from '../../../../core/models/direct-message.model';
import { UserProfile } from '../../../../core/models/user-profile.model';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { PresenceIndicator } from '../../../../shared/components/presence-indicator/presence-indicator';

@Component({
  selector: 'app-workspace-sidebar',
  imports: [RouterLink, RouterLinkActive, Avatar, PresenceIndicator],
  templateUrl: './workspace-sidebar.html',
  styleUrl: './workspace-sidebar.scss',
})
export class WorkspaceSidebar {
  private readonly router = inject(Router);

  @Input({ required: true }) channels: Channel[] = [];
  @Input() directMessages: DirectMessage[] = [];
  @Input() users: UserProfile[] = [];
  @Input() currentUserId = '';
  @Input() workspaceName = 'Workspace';
  @Input() guest = false;
  @Output() readonly createRequested = new EventEmitter<void>();
  @Output() readonly newMessageRequested = new EventEmitter<void>();
  @Output() readonly workspaceEditRequested = new EventEmitter<void>();
  @Output() readonly userRequested = new EventEmitter<string>();

  readonly channelsExpanded = signal(true);
  readonly directMessagesExpanded = signal(true);

  /** Toggles the visibility of the channel list. */
  toggleChannels(): void {
    this.channelsExpanded.update((expanded) => !expanded);
  }

  /** Toggles the visibility of all visible workspace users. */
  toggleDirectMessages(): void {
    this.directMessagesExpanded.update((expanded) => !expanded);
  }

  /** Shows the signed-in user first, followed by the existing sorted user list. */
  visibleUsers(): UserProfile[] {
    const self = this.users.find((user) => user.uid === this.currentUserId);
    const others = this.users.filter((user) => user.uid !== this.currentUserId);
    return self ? [self, ...others] : others;
  }

  /** Highlights the user whose existing conversation matches the current DM route. */
  isActiveUser(uid: string): boolean {
    return this.directMessages.some((dm) => {
      const partner = dm.participantIds.find((id) => id !== this.currentUserId)
        ?? this.currentUserId;
      return partner === uid && this.router.url === `/workspace/dm/${dm.id}`;
    });
  }

  /** Labels the current user's personal conversation as shown in the Figma menu. */
  userLabel(user: UserProfile): string {
    return user.displayName + (user.uid === this.currentUserId ? ' (Du)' : '');
  }
}
