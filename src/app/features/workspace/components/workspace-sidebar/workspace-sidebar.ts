import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { Channel } from '../../../../core/models/channel.model';
import { DirectMessage } from '../../../../core/models/direct-message.model';
import { UserProfile } from '../../../../core/models/user-profile.model';
import { PresenceIndicator } from '../../../../shared/components/presence-indicator/presence-indicator';

@Component({
  selector: 'app-workspace-sidebar',
  imports: [RouterLink, RouterLinkActive, PresenceIndicator],
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

  directMessageName(dm: DirectMessage): string {
    return this.users.find((user) => user.uid === this.directMessagePartnerId(dm))?.displayName
      ?? 'Unknown user';
  }

  directMessagePartnerId(dm: DirectMessage): string {
    return dm.participantIds.find((uid) => uid !== this.currentUserId) ?? '';
  }
}
