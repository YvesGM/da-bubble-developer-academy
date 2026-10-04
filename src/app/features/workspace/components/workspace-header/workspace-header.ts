import { Component, EventEmitter, Input, Output, signal } from '@angular/core';

import { UserProfile } from '../../../../core/models/user-profile.model';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { SearchBox } from '../search-box/search-box';

@Component({
  selector: 'app-workspace-header',
  imports: [Avatar, SearchBox],
  templateUrl: './workspace-header.html',
  styleUrl: './workspace-header.scss',
})
export class WorkspaceHeader {
  @Input({ required: true }) displayName = '';
  @Input() avatarId = 'avatar-1';
  @Input() profileEnabled = true;
  @Output() readonly profileRequested = new EventEmitter<void>();
  @Output() readonly logoutRequested = new EventEmitter<void>();
  @Output() readonly userSelected = new EventEmitter<UserProfile>();

  readonly menuOpen = signal(false);

  openProfile(): void {
    this.menuOpen.set(false);
    this.profileRequested.emit();
  }

  logout(): void {
    this.menuOpen.set(false);
    this.logoutRequested.emit();
  }
}
