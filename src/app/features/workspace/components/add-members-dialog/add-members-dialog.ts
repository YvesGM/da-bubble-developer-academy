import { Component, EventEmitter, Input, Output, signal } from '@angular/core';

import { UserProfile } from '../../../../core/models/user-profile.model';

export interface AddMembersSelection {
  memberIds: string[];
  guestAccess: boolean;
}

@Component({
  selector: 'app-add-members-dialog',
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

  filteredUsers(): UserProfile[] {
    const value = this.query().trim().toLowerCase();
    if (!value) return this.users;
    return this.users.filter((user) => user.displayName.toLowerCase().includes(value));
  }

  toggleUser(uid: string): void {
    const selected = new Set(this.selectedIds());
    selected.has(uid) ? selected.delete(uid) : selected.add(uid);
    this.selectedIds.set(selected);
  }

  submit(): void {
    this.addRequested.emit({
      memberIds: [...this.selectedIds()],
      guestAccess: this.guestSelected(),
    });
  }

  canSubmit(): boolean {
    return this.selectedIds().size > 0 || this.guestSelected();
  }
}
