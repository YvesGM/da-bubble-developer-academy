import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

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
  @Input({ required: true }) channels: Channel[] = [];
  @Input() directMessages: DirectMessage[] = [];
  @Input() users: UserProfile[] = [];
  @Input() currentUserId = '';
  @Input() workspaceName = 'Workspace';
  @Input() guest = false;
  @Input() collapsed = false;
  @Output() readonly createRequested = new EventEmitter<void>();
  @Output() readonly newMessageRequested = new EventEmitter<void>();
  @Output() readonly collapseRequested = new EventEmitter<void>();
  @Output() readonly workspaceEditRequested = new EventEmitter<void>();

  /**
   * Resolves the other participant of a direct-message conversation.
   *
   * @param dm - Direct-message conversation to resolve.
   * @returns The matching user profile when available.
   */
  directMessageUser(dm: DirectMessage): UserProfile | undefined {
    return this.users.find((user) => user.uid === this.directMessagePartnerId(dm));
  }

  /**
   * Resolves the display name shown for a direct-message conversation.
   *
   * @param dm - Direct-message conversation to label.
   * @returns The participant display name or a fallback label.
   */
  directMessageName(dm: DirectMessage): string {
    return this.directMessageUser(dm)?.displayName ?? 'Unbekannter Benutzer';
  }

  /**
   * Resolves the participant identifier represented by a direct-message entry.
   *
   * @param dm - Direct-message conversation to inspect.
   * @returns The other participant identifier, or the current user's identifier for a self conversation.
   */
  directMessagePartnerId(dm: DirectMessage): string {
    return dm.participantIds.find((uid) => uid !== this.currentUserId) ?? this.currentUserId;
  }
}
