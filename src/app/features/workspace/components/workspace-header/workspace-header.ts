import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Avatar } from '../../../../shared/components/avatar/avatar';
import { SearchBox } from '../search-box/search-box';

@Component({
  selector: 'app-workspace-header',
  imports: [RouterLink, Avatar, SearchBox],
  templateUrl: './workspace-header.html',
  styleUrl: './workspace-header.scss',
})
export class WorkspaceHeader {
  @Input({ required: true }) displayName = '';
  @Input() avatarId = 'avatar-1';
  @Input() profileEnabled = true;
  @Output() readonly profileRequested = new EventEmitter<void>();
  @Output() readonly logoutRequested = new EventEmitter<void>();
}
