import { Component, HostListener, EventEmitter, Input, Output } from '@angular/core';

import { UserProfile } from '../../../core/models/user-profile.model';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { PresenceIndicator } from '../../../shared/components/presence-indicator/presence-indicator';

/**
 * Shows a workspace user's profile summary in a contextual card.
 *
 * Inputs control whose profile is shown and which actions are available;
 * outputs let the parent open messages, edit the profile, or close the card.
 */
@Component({
  selector: 'app-profile-card',
  imports: [Avatar, PresenceIndicator],
  templateUrl: './profile-card.html',
  styleUrl: './profile-card.scss',
})
export class ProfileCard {
  /** Dismisses the displayed profile card when Escape is pressed. */
  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.closeRequested.emit();
  }

  /** Profile being displayed or edited by this component. */
  @Input({ required: true }) user!: UserProfile;
  /** Whether the displayed profile belongs to the signed-in account. */
  @Input() ownProfile = false;
  /** Optional header anchor; other users' cards remain centered. */
  @Input() position: { top: number; right: number } | null = null;
  /** Whether the direct-message action is available for this profile. */
  @Input() messageEnabled = true;
  /** Asks the owning view to dismiss the current dialog or panel. */
  @Output() readonly closeRequested = new EventEmitter<void>();
  /** Asks the parent to open profile editing. */
  @Output() readonly editRequested = new EventEmitter<void>();
  /** Asks the parent to open a direct conversation with the selected UID. */
  @Output() readonly messageRequested = new EventEmitter<string>();
}
