import { Component, HostListener, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth } from '@angular/fire/auth';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ChannelNameTakenError } from '../../../../core/errors/channel-name-taken.error';
import { ChannelService } from '../../../../core/services/channel.service';
import { UserProfile } from '../../../../core/models/user-profile.model';
import { UserService } from '../../../../core/services/user.service';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { firebaseErrorMessage } from '../../../../core/utils/firebase-error.util';

/**
 * Collects channel details and selects the initial membership before creation.
 *
 * Form validation, user search, and async submission are coordinated in stages;
 * the resulting channel ID is returned to the owning workspace.
 */
@Component({
  selector: 'app-channel-create-dialog',
  imports: [ReactiveFormsModule, Avatar],
  templateUrl: './channel-create-dialog.html',
  styleUrl: './channel-create-dialog.scss',
})
export class ChannelCreateDialog {
  /** Firebase auth context used to identify the current channel creator. */
  readonly auth = inject(Auth);
  /** Channel service used to load membership and update the current channel. */
  private readonly channels = inject(ChannelService);
  /** Angular form builder used to create typed and validated controls. */
  private readonly formBuilder = inject(FormBuilder);
  /** User service used to load candidates and persist profile data. */
  private readonly userService = inject(UserService);

  /** Workspace display name shown in headings and dialogs. */
  @Input() workspaceName = 'Workspace';
  /** Asks the owning view to dismiss the current dialog or panel. */
  @Output() readonly closeRequested = new EventEmitter<void>();
  /** Emits the ID of a newly persisted channel. */
  @Output() readonly channelCreated = new EventEmitter<string>();

  /** Workspace user profiles used to resolve visible names and avatar data. */
  readonly users = toSignal(this.userService.observeUsers(), { initialValue: [] });
  /** Active step in the multi-stage registration or creation flow. */
  readonly step = signal<'details' | 'members'>('details');
  /** Whether channel creation includes all members or selected users. */
  readonly memberMode = signal<'all' | 'selected'>('all');
  /** UIDs invited in the channel-creation member step. */
  readonly selectedMemberIds = signal(new Set<string>());
  /** Whether this channel allows anonymous guest participation. */
  readonly guestAccess = signal(false);
  /** Whether the channel automatically includes registered users and guests. */
  readonly autoJoin = signal(false);
  /** Current search or mention query typed by the user. */
  readonly query = signal('');
  /** ID returned by channel creation for subsequent navigation. */
  readonly createdChannelId = signal('');
  /** Human-readable error currently shown in the form. */
  readonly errorMessage = signal('');
  /** True while an asynchronous form submission is in progress. */
  readonly submitting = signal(false);
  /** Non-nullable reactive form holding the fields and validation state. */
  readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
  });

  /** Closes the dialog on Escape; an already created channel is preserved. */
  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    if (this.submitting()) return;
    this.cancelCreation();
  }

  /**
   * Validates the channel details step and starts channel creation.
   *
   * @returns A promise that resolves after the creation attempt completes.
   */
  async submitDetails(): Promise<void> {
    if (this.form.invalid) return this.markInvalid();
    if (this.isGuestCurrentUser()) return this.step.set('members');
    this.startSubmit();
    await this.createChannel();
  }

  /**
   * Adds the selected members to the newly created channel.
   *
   * @returns A promise that resolves after member assignment completes.
   */
  async finishMembers(): Promise<void> {
    const channelId = this.createdChannelId();
    this.startSubmit();
    if (!channelId && this.isGuestCurrentUser()) return this.createChannel(this.memberIds());
    if (channelId) await this.addSelectedMembers(channelId);
  }

  /**
   * Filters available workspace users by the current member-search query.
   *
   * @returns Matching users available for selection.
   */
  filteredUsers(): UserProfile[] {
    const query = this.query().trim().toLowerCase();
    return this.users().filter((user) => this.matchesUser(user, query));
  }

  /**
   * Checks whether a user is part of the pending member selection.
   *
   * @param uid - Firebase user identifier to test.
   * @returns Whether the user is currently selected.
   */
  isSelected(uid: string): boolean {
    return this.selectedMemberIds().has(uid);
  }

  /**
   * Determines whether the current member-selection step can be completed.
   *
   * @returns Whether the current member mode contains a valid selection.
   */
  canFinishMembers(): boolean {
    if (this.memberMode() === 'all') return this.memberIds().length > 0;
    return this.selectedMemberIds().size > 0 || this.guestAccess();
  }

  /**
   * Adds or removes a user from the pending member selection.
   *
   * @param uid - Firebase user identifier to toggle.
   */
  toggleMember(uid: string): void {
    const selected = new Set(this.selectedMemberIds());
    selected.has(uid) ? selected.delete(uid) : selected.add(uid);
    this.selectedMemberIds.set(selected);
  }

  /**
   * Completes channel creation without adding additional members.
   */
  async finishWithoutMembers(): Promise<void> {
    const id = this.createdChannelId();
    if (id) return void this.channelCreated.emit(id);
    if (!this.isGuestCurrentUser()) return;
    this.startSubmit();
    await this.createChannel();
  }

  /** Dismisses an unpersisted guest channel or completes an already created channel. */
  cancelCreation(): void {
    if (this.submitting()) return;
    if (!this.createdChannelId()) return void this.closeRequested.emit();
    void this.finishWithoutMembers();
  }

  /**
   * Persists the channel, including selected members when the creator is a guest.
   *
   * @param memberIds - Registered users included in the initial transaction.
   * @returns A promise that resolves after channel creation handling completes.
   */
  private async createChannel(memberIds: string[] = []): Promise<void> {
    try {
      const id = await this.channels.createChannel({ ...this.channelInput(), memberIds });
      this.createdChannelId.set(id);
      this.isGuestCurrentUser() || this.autoJoin()
        ? this.channelCreated.emit(id) : this.step.set('members');
    } catch (error) {
      this.errorMessage.set(this.channelError(error));
    } finally {
      this.submitting.set(false);
    }
  }

  /**
   * Adds selected members and guest access to a newly created channel.
   *
   * @param channelId - Identifier of the newly created channel.
   * @returns A promise that resolves after member assignment completes.
   */
  private async addSelectedMembers(channelId: string): Promise<void> {
    try {
      await this.channels.addMembers(channelId, this.memberIds(), this.guestAccess());
      this.channelCreated.emit(channelId);
    } catch (error) {
      this.errorMessage.set(firebaseErrorMessage(error, 'Mitglieder konnten nicht hinzugefügt werden.'));
    } finally {
      this.submitting.set(false);
    }
  }

  /**
   * Builds the member identifier list for the current selection mode.
   *
   * @returns Registered member identifiers to add to the channel.
   */
  private memberIds(): string[] {
    if (this.memberMode() === 'selected') return [...this.selectedMemberIds()];
    return this.users().map((user) => user.uid).filter((uid) => uid !== this.currentUserId());
  }

  /**
   * Builds the channel creation payload from the current form state.
   *
   * @returns The channel name, description and initial access settings.
   */
  private channelInput() {
    return {
      ...this.form.getRawValue(), memberIds: [],
      guestAccess: this.isGuestCurrentUser() || this.autoJoin(),
      autoJoin: this.autoJoin(),
    };
  }

  /**
   * Checks whether a user should appear in the member-selection results.
   *
   * @param user - User profile to inspect.
   * @param query - Normalized member-search query.
   * @returns Whether the user is selectable and matches the query.
   */
  private matchesUser(user: UserProfile, query: string): boolean {
    if (user.uid === this.currentUserId()) return false;
    if (!query) return true;
    return user.displayName.toLowerCase().includes(query);
  }

  /**
   * Maps channel-creation failures to a localized user-facing message.
   *
   * @param error - Error returned by the channel operation.
   * @returns The message to display in the dialog.
   */
  private channelError(error: unknown): string {
    if (error instanceof ChannelNameTakenError) return 'Dieser Channelname wird bereits verwendet.';
    return firebaseErrorMessage(error, 'Der Channel konnte nicht erstellt werden.');
  }

  /**
   * Checks whether the current Firebase session is anonymous.
   *
   * @returns Whether the current user is a guest.
   */
  private isGuestCurrentUser(): boolean {
    return this.auth.currentUser?.isAnonymous ?? false;
  }

  /**
   * Returns the current Firebase user identifier.
   *
   * @returns The active user identifier, or an empty string when unavailable.
   */
  private currentUserId(): string {
    return this.auth.currentUser?.uid ?? '';
  }

  /**
   * Marks the channel details form as touched and exposes validation errors.
   */
  private markInvalid(): void {
    this.form.markAllAsTouched();
    this.errorMessage.set('Bitte gib einen Channelnamen ein.');
  }

  /**
   * Clears previous errors and marks the dialog as submitting.
   */
  private startSubmit(): void {
    this.submitting.set(true);
    this.errorMessage.set('');
  }
}
