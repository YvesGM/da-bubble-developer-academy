import { Component, EventEmitter, Input, Output } from '@angular/core';

import { UserProfile } from '../../../core/models/user-profile.model';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { PresenceIndicator } from '../../../shared/components/presence-indicator/presence-indicator';

@Component({
  selector: 'app-profile-card',
  imports: [Avatar, PresenceIndicator],
  templateUrl: './profile-card.html',
  styleUrl: './profile-card.scss',
})
export class ProfileCard {
  @Input({ required: true }) user!: UserProfile;
  @Input() ownProfile = false;
  @Output() readonly closeRequested = new EventEmitter<void>();
  @Output() readonly editRequested = new EventEmitter<void>();
  @Output() readonly messageRequested = new EventEmitter<string>();
}
