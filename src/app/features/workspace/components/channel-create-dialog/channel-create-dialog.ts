import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth } from '@angular/fire/auth';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ChannelNameTakenError } from '../../../../core/errors/channel-name-taken.error';
import { ChannelService } from '../../../../core/services/channel.service';
import { UserProfile } from '../../../../core/models/user-profile.model';
import { UserService } from '../../../../core/services/user.service';
import { firebaseErrorMessage } from '../../../../core/utils/firebase-error.util';

@Component({
  selector: 'app-channel-create-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './channel-create-dialog.html',
  styleUrl: './channel-create-dialog.scss',
})
export class ChannelCreateDialog {
  readonly auth = inject(Auth);
  private readonly channels = inject(ChannelService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly userService = inject(UserService);

  @Output() readonly closeRequested = new EventEmitter<void>();
  @Output() readonly channelCreated = new EventEmitter<string>();

  readonly users = toSignal(this.userService.observeUsers(), { initialValue: [] });
  readonly step = signal<'details' | 'members'>('details');
  readonly memberMode = signal<'all' | 'selected'>('all');
  readonly selectedMemberIds = signal(new Set<string>());
  readonly guestAccess = signal(false);
  readonly query = signal('');
  readonly createdChannelId = signal('');
  readonly errorMessage = signal('');
  readonly submitting = signal(false);
  readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
  });

  async submitDetails(): Promise<void> {
    if (this.form.invalid) return this.markInvalid();
    this.startSubmit();
    await this.createChannel();
  }

  async finishMembers(): Promise<void> {
    const channelId = this.createdChannelId();
    if (!channelId) return;
    this.startSubmit();
    await this.addSelectedMembers(channelId);
  }

  filteredUsers(): UserProfile[] {
    const query = this.query().trim().toLowerCase();
    return this.users().filter((user) => this.matchesUser(user, query));
  }

  isSelected(uid: string): boolean {
    return this.selectedMemberIds().has(uid);
  }

  toggleMember(uid: string): void {
    const selected = new Set(this.selectedMemberIds());
    selected.has(uid) ? selected.delete(uid) : selected.add(uid);
    this.selectedMemberIds.set(selected);
  }

  finishWithoutMembers(): void {
    const id = this.createdChannelId();
    if (id) this.channelCreated.emit(id);
  }

  private async createChannel(): Promise<void> {
    try {
      const id = await this.channels.createChannel(this.channelInput());
      this.createdChannelId.set(id);
      this.isGuestCurrentUser() ? this.channelCreated.emit(id) : this.step.set('members');
    } catch (error) {
      this.errorMessage.set(this.channelError(error));
    } finally {
      this.submitting.set(false);
    }
  }

  private async addSelectedMembers(channelId: string): Promise<void> {
    try {
      await this.channels.addMembers(channelId, this.memberIds(), this.guestAccess());
      this.channelCreated.emit(channelId);
    } catch (error) {
      this.errorMessage.set(firebaseErrorMessage(error, 'Members could not be added.'));
    } finally {
      this.submitting.set(false);
    }
  }

  private memberIds(): string[] {
    if (this.memberMode() === 'selected') return [...this.selectedMemberIds()];
    return this.users().map((user) => user.uid).filter((uid) => uid !== this.currentUserId());
  }

  private channelInput() {
    return { ...this.form.getRawValue(), memberIds: [], guestAccess: this.isGuestCurrentUser() };
  }

  private matchesUser(user: UserProfile, query: string): boolean {
    if (user.uid === this.currentUserId()) return false;
    if (!query) return true;
    return user.displayName.toLowerCase().includes(query);
  }

  private channelError(error: unknown): string {
    if (error instanceof ChannelNameTakenError) return 'This channel name is already in use.';
    return firebaseErrorMessage(error, 'The channel could not be created.');
  }

  private isGuestCurrentUser(): boolean {
    return this.auth.currentUser?.isAnonymous ?? false;
  }

  private currentUserId(): string {
    return this.auth.currentUser?.uid ?? '';
  }

  private markInvalid(): void {
    this.form.markAllAsTouched();
    this.errorMessage.set('Please enter a channel name.');
  }

  private startSubmit(): void {
    this.submitting.set(true);
    this.errorMessage.set('');
  }
}
