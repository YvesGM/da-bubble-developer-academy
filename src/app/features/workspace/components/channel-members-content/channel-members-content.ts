import { Component, EventEmitter, Input, Output } from '@angular/core';

import { UserProfile } from '../../../../core/models/user-profile.model';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { PresenceIndicator } from '../../../../shared/components/presence-indicator/presence-indicator';

/**
 * Renders reusable channel-member rows for both desktop and mobile layouts.
 *
 * Member selection and add-member requests are emitted to the parent so
 * presentation can be shared without duplicating membership behavior.
 */
@Component({
  selector: 'app-channel-members-content',
  imports: [Avatar, PresenceIndicator],
  templateUrl: './channel-members-content.html',
  styleUrl: './channel-members-content.scss',
})
export class ChannelMembersContent {
  /** Profiles currently belonging to the selected channel. */
  @Input() members: UserProfile[] = [];
  /** Whether this channel allows anonymous guest participation. */
  @Input() guestAccess = false;
  /** UID of the current account, used to mark the user's own row. */
  @Input() currentUserId = '';
  /** Whether the current account may invite additional members. */
  @Input() canAdd = true;
  /** Emits the add-members action to the owning channel view. */
  @Output() readonly addRequested = new EventEmitter<void>();
  /** Emits a member profile selected in the list or dialog. */
  @Output() readonly userSelected = new EventEmitter<UserProfile>();
}
