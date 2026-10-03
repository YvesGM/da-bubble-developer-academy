import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { Channel } from '../../../../core/models/channel.model';

@Component({
  selector: 'app-workspace-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './workspace-sidebar.html',
  styleUrl: './workspace-sidebar.scss',
})
export class WorkspaceSidebar {
  @Input({ required: true }) channels: Channel[] = [];
  @Output() readonly createRequested = new EventEmitter<void>();
}
