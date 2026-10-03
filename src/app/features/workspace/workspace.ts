import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth } from '@angular/fire/auth';
import { Router, RouterOutlet } from '@angular/router';

import { UserProfile } from '../../core/models/user-profile.model';
import { AuthService } from '../../core/services/auth.service';
import { ChannelService } from '../../core/services/channel.service';
import { DirectMessageService } from '../../core/services/direct-message.service';
import { PresenceService } from '../../core/services/presence.service';
import { UserService } from '../../core/services/user.service';
import { ProfileCard } from '../profile/profile-card/profile-card';
import { ProfileDialog } from '../profile/profile-dialog/profile-dialog';
import { ChannelCreateDialog } from './components/channel-create-dialog/channel-create-dialog';
import { NewMessageDialog } from './components/new-message-dialog/new-message-dialog';
import { WorkspaceHeader } from './components/workspace-header/workspace-header';
import { WorkspaceNameDialog } from './components/workspace-name-dialog/workspace-name-dialog';
import { WorkspaceSidebar } from './components/workspace-sidebar/workspace-sidebar';

@Component({
  selector: 'app-workspace',
  imports: [
    RouterOutlet,
    ChannelCreateDialog,
    NewMessageDialog,
    ProfileCard,
    ProfileDialog,
    WorkspaceHeader,
    WorkspaceNameDialog,
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
  private readonly presence = inject(PresenceService);
  private readonly router = inject(Router);
  private readonly usersService = inject(UserService);

  readonly channels = toSignal(this.channelsService.observeCurrentUserChannels(), { initialValue: [] });
  readonly directMessages = toSignal(this.directMessagesService.observeCurrentUserConversations(), { initialValue: [] });
  readonly users = toSignal(this.usersService.observeUsers(), { initialValue: [] });
  readonly profile = toSignal(this.usersService.observeCurrentProfile());
  readonly showCreateChannel = signal(false);
  readonly showNewMessage = signal(false);
  readonly showProfileEditor = signal(false);
  readonly showWorkspaceEditor = signal(false);
  readonly selectedUser = signal<UserProfile | null>(null);
  readonly sidebarCollapsed = signal(false);

  constructor() {
    this.presence.start();
  }

  get displayName(): string {
    return this.auth.currentUser?.displayName || (this.auth.currentUser?.isAnonymous ? 'Guest' : 'User');
  }

  get avatarId(): string {
    return this.profile()?.avatarId ?? 'avatar-1';
  }

  get workspaceName(): string {
    return this.profile()?.workspaceName || 'Workspace';
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

  openOwnProfile(): void {
    if (this.profile()) this.selectedUser.set(this.profile()!);
  }

  openProfileEditor(): void {
    this.selectedUser.set(null);
    this.showProfileEditor.set(true);
  }

  async saveWorkspaceName(name: string): Promise<void> {
    await this.usersService.updateWorkspaceName(name);
    this.showWorkspaceEditor.set(false);
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
    this.selectedUser.set(null);
    this.showNewMessage.set(false);
    await this.router.navigate(['/workspace/dm', dmId]);
  }

  async logout(): Promise<void> {
    await this.presence.stop();
    await this.authService.logout();
    await this.router.navigateByUrl('/login');
  }
}
