import { Component, HostListener, EventEmitter, Input, Output } from '@angular/core';

import { UserProfile } from '../../../../core/models/user-profile.model';
import { ChannelMembersContent } from '../channel-members-content/channel-members-content';

/**
 * Presents the member list in a positioned channel popover.
 *
 * The dialog forwards add-member, close, and profile selection actions while
 * membership data stays owned by the surrounding channel view.
 */
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

  /** Profiles currently belonging to the selected channel. */
  @Input() members: UserProfile[] = [];
  /** Viewport coordinates controlling the contextual dialog's placement. */
  @Input() position: { top: number; right: number } = { top: 100, right: 24 };
  /** Whether this channel allows anonymous guest participation. */
  @Input() guestAccess = false;
  /** UID of the current account, used to mark the user's own row. */
  @Input() currentUserId = '';
  /** Whether the current account may invite additional members. */
  @Input() canAdd = true;
  /** Asks the owning view to dismiss the current dialog or panel. */
  @Output() readonly closeRequested = new EventEmitter<void>();
  /** Emits the add-members action to the owning channel view. */
  @Output() readonly addRequested = new EventEmitter<void>();
  /** Emits a member profile selected in the list or dialog. */
  @Output() readonly userSelected = new EventEmitter<UserProfile>();
}
