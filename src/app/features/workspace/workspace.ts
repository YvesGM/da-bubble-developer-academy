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
import { WorkspaceHeader } from './components/workspace-header/workspace-header';
import { WorkspaceNameDialog } from './components/workspace-name-dialog/workspace-name-dialog';
import { WorkspaceSidebar } from './components/workspace-sidebar/workspace-sidebar';

@Component({
  selector: 'app-workspace',
  imports: [
    RouterOutlet,
    ChannelCreateDialog,
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
  readonly showProfileEditor = signal(false);
  readonly showWorkspaceEditor = signal(false);
  readonly selectedUser = signal<UserProfile | null>(null);
  readonly sidebarCollapsed = signal(false);

  /**
   * Starts realtime presence tracking when the workspace shell is created.
   */
  constructor() {
    this.presence.start();
  }

  /**
   * Resolves the display name shown in the workspace header.
   *
   * @returns Firebase display name, or the appropriate registered/guest fallback.
   */
  get displayName(): string {
    return this.auth.currentUser?.displayName || (this.auth.currentUser?.isAnonymous ? 'Guest' : 'User');
  }

  /**
   * Resolves the avatar displayed for the current user.
   *
   * @returns Stored profile avatar id or the default avatar identifier.
   */
  get avatarId(): string {
    return this.profile()?.avatarId ?? 'avatar-1';
  }

  /**
   * Resolves the workspace name displayed in the sidebar.
   *
   * @returns Stored workspace name or the default `Workspace` label.
   */
  get workspaceName(): string {
    return this.profile()?.workspaceName || 'Workspace';
  }

  /**
   * Exposes the current Firebase user identifier to child components.
   *
   * @returns Current uid, or an empty string when no session is available.
   */
  get currentUserId(): string {
    return this.auth.currentUser?.uid ?? '';
  }

  /**
   * Indicates whether the active Firebase session is anonymous.
   *
   * @returns `true` for an anonymous guest session.
   */
  get isGuest(): boolean {
    return this.auth.currentUser?.isAnonymous ?? false;
  }

  /**
   * Indicates whether the current route displays a conversation surface.
   *
   * @returns `true` for channel, direct-message and new-message workspace routes.
   */
  get conversationOpen(): boolean {
    return /\/workspace\/(channel|dm)\/|\/workspace\/new-message/.test(this.router.url);
  }

  /**
   * Toggles the collapsed state of the workspace sidebar.
   */
  toggleSidebar(): void {
    this.sidebarCollapsed.update((value) => !value);
  }

  /**
   * Opens the current registered user's profile card when a profile is available.
   */
  openOwnProfile(): void {
    if (this.profile()) this.selectedUser.set(this.profile()!);
  }

  /**
   * Opens the profile editor and closes any currently selected profile card.
   */
  openProfileEditor(): void {
    this.selectedUser.set(null);
    this.showProfileEditor.set(true);
  }

  /**
   * Persists a new workspace display name for the current user.
   *
   * @param name - New workspace display name.
   * @returns A promise that resolves after persistence completes.
   */
  async saveWorkspaceName(name: string): Promise<void> {
    await this.usersService.updateWorkspaceName(name);
    this.showWorkspaceEditor.set(false);
  }

  /**
   * Closes the channel-creation dialog and navigates to the created channel.
   *
   * @param channelId - Identifier of the newly created channel.
   * @returns A promise that resolves after navigation completes.
   */
  async selectCreatedChannel(channelId: string): Promise<void> {
    this.showCreateChannel.set(false);
    await this.router.navigate(['/workspace/channel', channelId]);
  }

  /**
   * Navigates to the new-message view.
   *
   * @returns A promise that resolves after navigation completes.
   */
  async openNewMessage(): Promise<void> {
    await this.router.navigate(['/workspace/new-message']);
  }

  /**
   * Navigates to a channel from the workspace shell.
   *
   * @param channelId - Identifier of the channel to open.
   * @returns A promise that resolves after navigation completes.
   */
  async openChannel(channelId: string): Promise<void> {
    await this.router.navigate(['/workspace/channel', channelId]);
  }

  /**
   * Opens or creates a direct-message conversation with the selected user.
   *
   * @param userId - Firebase user identifier to message.
   * @returns A promise that resolves after conversation creation and navigation complete.
   */
  async startDirectMessage(userId: string): Promise<void> {
    const dmId = await this.directMessagesService.openConversation(userId);
    this.selectedUser.set(null);
    await this.router.navigate(['/workspace/dm', dmId]);
  }

  /**
   * Stops presence tracking, signs the current session out and returns to login.
   *
   * @returns A promise that resolves after cleanup, sign-out and navigation complete.
   */
  async logout(): Promise<void> {
    await this.presence.stop();
    await this.authService.logout();
    await this.router.navigateByUrl('/login');
  }
}
