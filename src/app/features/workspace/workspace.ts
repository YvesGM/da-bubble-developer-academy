import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth } from '@angular/fire/auth';
import { Router, RouterOutlet } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ChannelService } from '../../core/services/channel.service';
import { DirectMessageService } from '../../core/services/direct-message.service';
import { UserService } from '../../core/services/user.service';
import { ProfileDialog } from '../profile/profile-dialog/profile-dialog';
import { ChannelCreateDialog } from './components/channel-create-dialog/channel-create-dialog';
import { NewMessageDialog } from './components/new-message-dialog/new-message-dialog';
import { WorkspaceHeader } from './components/workspace-header/workspace-header';
import { WorkspaceSidebar } from './components/workspace-sidebar/workspace-sidebar';

@Component({
  selector: 'app-workspace',
  imports: [
    RouterOutlet,
    ChannelCreateDialog,
    NewMessageDialog,
    ProfileDialog,
    WorkspaceHeader,
    WorkspaceSidebar,
  ],
  templateUrl: './workspace.html',
  styleUrl: './workspace.scss',
})
export class Workspace {
  readonly auth = inject(Auth);
  private readonly authService = inject(AuthService);
  private readonly channelsService = inject(ChannelService);
  private readonly directMessagesService = inject(DirectMessageService);
  private readonly router = inject(Router);
  private readonly usersService = inject(UserService);

  readonly channels = toSignal(this.channelsService.observeCurrentUserChannels(), { initialValue: [] });
  readonly directMessages = toSignal(this.directMessagesService.observeCurrentUserConversations(), { initialValue: [] });
  readonly users = toSignal(this.usersService.observeUsers(), { initialValue: [] });
  readonly profile = toSignal(this.usersService.observeCurrentProfile());
  readonly showCreateChannel = signal(false);
  readonly showNewMessage = signal(false);
  readonly showProfile = signal(false);
  readonly sidebarCollapsed = signal(false);

  get displayName(): string {
    return this.auth.currentUser?.displayName || (this.auth.currentUser?.isAnonymous ? 'Guest' : 'User');
  }

  get avatarId(): string {
    return this.profile()?.avatarId ?? 'avatar-1';
  }

  get currentUserId(): string {
    return this.auth.currentUser?.uid ?? '';
  }

  get isGuest(): boolean {
    return this.auth.currentUser?.isAnonymous ?? false;
  }

  get conversationOpen(): boolean {
    return /\/workspace\/(channel|dm)\//.test(this.router.url);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((value) => !value);
  }

  async selectCreatedChannel(channelId: string): Promise<void> {
    this.showCreateChannel.set(false);
    await this.router.navigate(['/workspace/channel', channelId]);
  }

  async openChannel(channelId: string): Promise<void> {
    this.showNewMessage.set(false);
    await this.router.navigate(['/workspace/channel', channelId]);
  }

  async startDirectMessage(userId: string): Promise<void> {
    const dmId = await this.directMessagesService.openConversation(userId);
    this.showNewMessage.set(false);
    await this.router.navigate(['/workspace/dm', dmId]);
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigateByUrl('/login');
  }
}
