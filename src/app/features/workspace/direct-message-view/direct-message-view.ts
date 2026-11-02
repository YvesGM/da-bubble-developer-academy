import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth } from '@angular/fire/auth';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { ConversationTarget } from '../../../core/models/conversation.model';
import { UserProfile } from '../../../core/models/user-profile.model';
import { UserService } from '../../../core/services/user.service';
import { ProfileCard } from '../../profile/profile-card/profile-card';
import { ProfileDialog } from '../../profile/profile-dialog/profile-dialog';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { PresenceIndicator } from '../../../shared/components/presence-indicator/presence-indicator';
import { ChatPanel } from '../components/chat-panel/chat-panel';

/**
 * Loads a direct conversation from the route and resolves its participants.
 *
 * The chat panel receives the selected target while profile selection stays
 * local to the direct-message view.
 */
@Component({
  selector: 'app-direct-message-view',
  imports: [ChatPanel, RouterLink, ProfileCard, ProfileDialog, Avatar, PresenceIndicator],
  templateUrl: './direct-message-view.html',
  styleUrl: './direct-message-view.scss',
})
export class DirectMessageView {
  /** Firebase Auth client providing the active account identity. */
  private readonly auth = inject(Auth);
  /** Active route containing the selected conversation ID or reset parameters. */
  private readonly route = inject(ActivatedRoute);
  /** User service used to resolve participant and profile records. */
  private readonly usersService = inject(UserService);

  /** Workspace user profiles used to resolve visible names and avatar data. */
  readonly users = toSignal(this.usersService.observeUsers(), { initialValue: [] });
  /** Direct-message identifier derived from the active route. */
  readonly dmId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('dmId') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('dmId') ?? '' },
  );
  /** Profiles of all participants in the selected private conversation. */
  readonly participantUsers = computed(() =>
    this.users().filter((user) => this.dmId().split('__').includes(user.uid)),
  );
  /** Other participant in the direct conversation, when resolvable. */
  readonly partner = computed(() => this.findPartner());
  /** Conversation target passed to messaging, reactions, and navigation. */
  readonly target = computed<ConversationTarget>(() => ({
    type: 'directMessage',
    id: this.dmId(),
  }));
  /** Profile currently selected for contextual actions. */
  readonly selectedUser = signal<UserProfile | null>(null);
  /** Whether the current user's profile editing dialog is open. */
  readonly showProfileEditor = signal(false);

  /**
   * Opens the profile card for a requested direct-message participant.
   *
   * @param uid - Firebase user identifier to resolve.
   */
  openProfile(uid: string): void {
    const user = this.users().find((item) => item.uid === uid);
    if (user) this.selectedUser.set(user);
  }

  /**
   * Opens the current user's profile editor and closes the profile card.
   */
  openProfileEditor(): void {
    this.selectedUser.set(null);
    this.showProfileEditor.set(true);
  }

  /**
   * Returns the current Firebase user identifier.
   *
   * @returns The active user identifier, or an empty string when unavailable.
   */
  currentUserId(): string {
    return this.auth.currentUser?.uid ?? '';
  }

  /**
   * Checks whether the active direct-message conversation targets the current user.
   *
   * @returns Whether the conversation is a self conversation.
   */
  isSelfConversation(): boolean {
    return this.partner()?.uid === this.currentUserId();
  }

  /**
   * Resolves the profile represented by the active direct-message conversation.
   *
   * @returns The partner profile, including the current user for self conversations, when available.
   */
  private findPartner(): UserProfile | undefined {
    const ids = this.dmId().split('__');
    const partnerId = ids.find((uid) => uid !== this.currentUserId()) ?? this.currentUserId();
    return this.users().find((user) => user.uid === partnerId);
  }
}
