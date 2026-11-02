import { Component, HostListener, EventEmitter, Input, Output } from '@angular/core';

import { UserProfile } from '../../../core/models/user-profile.model';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { PresenceIndicator } from '../../../shared/components/presence-indicator/presence-indicator';

/** Displays profile details and exposes the available profile actions. */
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

  @Input({ required: true }) user!: UserProfile;
  @Input() ownProfile = false;
  /** Optional header anchor; other users' cards remain centered. */
  @Input() position: { top: number; right: number } | null = null;
  @Input() messageEnabled = true;
  @Output() readonly closeRequested = new EventEmitter<void>();
  @Output() readonly editRequested = new EventEmitter<void>();
  @Output() readonly messageRequested = new EventEmitter<string>();
}
