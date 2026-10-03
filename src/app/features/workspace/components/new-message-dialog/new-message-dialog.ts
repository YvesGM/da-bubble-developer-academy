import { Component, EventEmitter, Input, Output, signal } from '@angular/core';

import { UserProfile } from '../../../../core/models/user-profile.model';

@Component({
  selector: 'app-new-message-dialog',
  templateUrl: './new-message-dialog.html',
  styleUrl: './new-message-dialog.scss',
})
export class NewMessageDialog {
  @Input() users: UserProfile[] = [];
  @Input() currentUserId = '';
  @Output() readonly closeRequested = new EventEmitter<void>();
  @Output() readonly userSelected = new EventEmitter<string>();

  readonly query = signal('');

  filteredUsers(): UserProfile[] {
    const value = this.query().trim().toLowerCase();
    return this.users.filter((user) => this.matches(user, value));
  }

  private matches(user: UserProfile, query: string): boolean {
    if (user.uid === this.currentUserId) return false;
    if (!query) return true;
    return user.displayName.toLowerCase().includes(query) || user.email?.toLowerCase().includes(query) === true;
  }
}
