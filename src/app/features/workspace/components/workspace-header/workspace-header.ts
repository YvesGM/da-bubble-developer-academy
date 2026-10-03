import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SearchBox } from '../search-box/search-box';

@Component({
  selector: 'app-workspace-header',
  imports: [RouterLink, SearchBox],
  templateUrl: './workspace-header.html',
  styleUrl: './workspace-header.scss',
})
export class WorkspaceHeader {
  @Input({ required: true }) displayName = '';
  @Output() readonly profileRequested = new EventEmitter<void>();
  @Output() readonly logoutRequested = new EventEmitter<void>();
}
