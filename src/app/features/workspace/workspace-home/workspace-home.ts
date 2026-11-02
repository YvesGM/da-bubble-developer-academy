import { Component } from '@angular/core';

/**
 * Renders the default workspace view when no conversation is selected.
 *
 * This component keeps the blank dashboard route separate from channel and
 * direct-message pages.
 */
@Component({
  selector: 'app-workspace-home',
  templateUrl: './workspace-home.html',
  styleUrl: './workspace-home.scss',
})
export class WorkspaceHome {}
