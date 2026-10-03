import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-workspace-header',
  imports: [RouterLink],
  templateUrl: './workspace-header.html',
  styleUrl: './workspace-header.scss',
})
export class WorkspaceHeader {
  @Input({ required: true }) displayName = '';
  @Output() readonly logoutRequested = new EventEmitter<void>();
}
