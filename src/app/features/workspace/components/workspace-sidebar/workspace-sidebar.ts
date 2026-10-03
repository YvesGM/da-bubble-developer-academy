import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { Channel } from '../../../../core/models/channel.model';
import { DirectMessage } from '../../../../core/models/direct-message.model';
import { UserProfile } from '../../../../core/models/user-profile.model';

@Component({
  selector: 'app-workspace-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './workspace-sidebar.html',
  styleUrl: './workspace-sidebar.scss',
})
export class WorkspaceSidebar {
  @Input({ required: true }) channels: Channel[] = [];
  @Input() directMessages: DirectMessage[] = [];
  @Input() users: UserProfile[] = [];
  @Input() currentUserId = '';
  @Input() guest = false;
  @Input() collapsed = false;
  @Output() readonly createRequested = new EventEmitter<void>();
  @Output() readonly newMessageRequested = new EventEmitter<void>();
  @Output() readonly collapseRequested = new EventEmitter<void>();

  directMessageName(dm: DirectMessage): string {
    const partnerId = dm.participantIds.find((uid) => uid !== this.currentUserId);
    return this.users.find((user) => user.uid === partnerId)?.displayName ?? 'Unknown user';
  }
}
