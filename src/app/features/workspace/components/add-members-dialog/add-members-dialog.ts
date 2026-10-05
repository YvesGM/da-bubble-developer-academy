import { Component, EventEmitter, Input, Output, signal } from '@angular/core';

import { UserProfile } from '../../../../core/models/user-profile.model';
import { Avatar } from '../../../../shared/components/avatar/avatar';

export interface AddMembersSelection {
  memberIds: string[];
  guestAccess: boolean;
}

@Component({
  selector: 'app-add-members-dialog',
  imports: [Avatar],
  templateUrl: './add-members-dialog.html',
  styleUrl: './add-members-dialog.scss',
})
export class AddMembersDialog {
  @Input() users: UserProfile[] = [];
  @Input() guestAvailable = false;
  @Output() readonly closeRequested = new EventEmitter<void>();
  @Output() readonly addRequested = new EventEmitter<AddMembersSelection>();

  readonly query = signal('');
  readonly selectedIds = signal(new Set<string>());
  readonly guestSelected = signal(false);

  /**
   * Filters available users by the current search query.
   *
   * @returns Users whose display name or email matches the query.
   */
  filteredUsers(): UserProfile[] {
    const value = this.query().trim().toLowerCase();
    if (!value) return this.users;
    return this.users.filter((user) => user.displayName.toLowerCase().includes(value));
  }

  /**
   * Resolves the currently selected member identifiers to user profiles.
   *
   * @returns The selected user profiles.
   */
  selectedUsers(): UserProfile[] {
    return this.users.filter((user) => this.selectedIds().has(user.uid));
  }

  /**
   * Adds or removes a user from the pending member selection.
   *
   * @param uid - Firebase user identifier to toggle.
   */
  toggleUser(uid: string): void {
    const selected = new Set(this.selectedIds());
    selected.has(uid) ? selected.delete(uid) : selected.add(uid);
    this.selectedIds.set(selected);
  }

  /**
   * Emits the selected members and guest-access setting to the parent component.
   */
  submit(): void {
    this.addRequested.emit({
      memberIds: [...this.selectedIds()],
      guestAccess: this.guestSelected(),
    });
  }

  /**
   * Determines whether the current selection contains a meaningful change.
   *
   * @returns Whether the dialog can submit its current selection.
   */
  canSubmit(): boolean {
    return this.selectedIds().size > 0 || this.guestSelected();
  }
}
