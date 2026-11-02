import { Component, EventEmitter, Input, Output } from '@angular/core';

import { UserProfile } from '../../../../core/models/user-profile.model';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { PresenceIndicator } from '../../../../shared/components/presence-indicator/presence-indicator';

/** Shared channel-member rows for the desktop popup and mobile channel editor. */
@Component({
  selector: 'app-channel-members-content',
  imports: [Avatar, PresenceIndicator],
  templateUrl: './channel-members-content.html',
  styleUrl: './channel-members-content.scss',
})
export class ChannelMembersContent {
  @Input() members: UserProfile[] = [];
  @Input() guestAccess = false;
  @Input() currentUserId = '';
  @Input() canAdd = true;
  @Output() readonly addRequested = new EventEmitter<void>();
  @Output() readonly userSelected = new EventEmitter<UserProfile>();
}
