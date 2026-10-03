import { Component, EventEmitter, Input, Output } from '@angular/core';

import { UserProfile } from '../../../../core/models/user-profile.model';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { PresenceIndicator } from '../../../../shared/components/presence-indicator/presence-indicator';

@Component({
  selector: 'app-channel-members-dialog',
  imports: [Avatar, PresenceIndicator],
  templateUrl: './channel-members-dialog.html',
  styleUrl: './channel-members-dialog.scss',
})
export class ChannelMembersDialog {
  @Input() members: UserProfile[] = [];
  @Input() guestAccess = false;
  @Input() currentUserId = '';
  @Output() readonly closeRequested = new EventEmitter<void>();
  @Output() readonly addRequested = new EventEmitter<void>();
  @Output() readonly userSelected = new EventEmitter<UserProfile>();
}
