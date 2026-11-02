import { Component, HostListener, EventEmitter, Input, Output } from '@angular/core';

import { UserProfile } from '../../../../core/models/user-profile.model';
import { ChannelMembersContent } from '../channel-members-content/channel-members-content';

/** Displays the members of a channel. */
@Component({
  selector: 'app-channel-members-dialog',
  imports: [ChannelMembersContent],
  templateUrl: './channel-members-dialog.html',
  styleUrl: './channel-members-dialog.scss',
})
export class ChannelMembersDialog {
  /** Closes the member list via Escape. */
  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.closeRequested.emit();
  }

  @Input() members: UserProfile[] = [];
  @Input() position: { top: number; right: number } = { top: 100, right: 24 };
  @Input() guestAccess = false;
  @Input() currentUserId = '';
  @Input() canAdd = true;
  @Output() readonly closeRequested = new EventEmitter<void>();
  @Output() readonly addRequested = new EventEmitter<void>();
  @Output() readonly userSelected = new EventEmitter<UserProfile>();
}
