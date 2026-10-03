import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth } from '@angular/fire/auth';
import { Router, RouterOutlet } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ChannelService } from '../../core/services/channel.service';
import { ChannelCreateDialog } from './components/channel-create-dialog/channel-create-dialog';
import { WorkspaceHeader } from './components/workspace-header/workspace-header';
import { WorkspaceSidebar } from './components/workspace-sidebar/workspace-sidebar';

@Component({
  selector: 'app-workspace',
  imports: [RouterOutlet, ChannelCreateDialog, WorkspaceHeader, WorkspaceSidebar],
  templateUrl: './workspace.html',
  styleUrl: './workspace.scss',
})
export class Workspace {
  private readonly auth = inject(Auth);
  private readonly authService = inject(AuthService);
  private readonly channelsService = inject(ChannelService);
  private readonly router = inject(Router);

  readonly channels = toSignal(this.channelsService.observeCurrentUserChannels(), { initialValue: [] });
  readonly showCreateChannel = signal(false);

  get displayName(): string {
    return this.auth.currentUser?.displayName || (this.auth.currentUser?.isAnonymous ? 'Gast' : 'User');
  }

  openChannelDialog(): void {
    this.showCreateChannel.set(true);
  }

  closeChannelDialog(): void {
    this.showCreateChannel.set(false);
  }

  async selectCreatedChannel(channelId: string): Promise<void> {
    this.closeChannelDialog();
    await this.router.navigate(['/workspace/channel', channelId]);
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigateByUrl('/login');
  }
}
