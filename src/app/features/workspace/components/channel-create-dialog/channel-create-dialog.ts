import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth } from '@angular/fire/auth';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ChannelNameTakenError } from '../../../../core/errors/channel-name-taken.error';
import { ChannelService } from '../../../../core/services/channel.service';
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
  readonly selectedMemberIds = signal(new Set<string>(this.initialMembers()));
  readonly guestAccess = signal(this.isGuestCurrentUser());
  readonly errorMessage = signal('');
  readonly submitting = signal(false);
  readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
  });

  isSelected(uid: string): boolean {
    return this.selectedMemberIds().has(uid);
  }

  toggleMember(uid: string): void {
    if (uid === this.currentRegisteredUserId()) return;
    const selected = new Set(this.selectedMemberIds());
    selected.has(uid) ? selected.delete(uid) : selected.add(uid);
    this.selectedMemberIds.set(selected);
  }

  toggleGuest(): void {
    if (this.isGuestCurrentUser()) return;
    this.guestAccess.update((value) => !value);
  }

  isGuestCurrentUser(): boolean {
    return this.auth.currentUser?.isAnonymous ?? false;
  }

  async submit(): Promise<void> {
    if (this.form.invalid) return this.markInvalid();
    this.startSubmit();
    await this.createChannel();
  }

  private async createChannel(): Promise<void> {
    try {
      const id = await this.channels.createChannel(this.channelInput());
      this.channelCreated.emit(id);
    } catch (error) {
      this.errorMessage.set(this.channelError(error));
    } finally {
      this.submitting.set(false);
    }
  }

  private channelInput() {
    const value = this.form.getRawValue();
    return {
      ...value,
      memberIds: [...this.selectedMemberIds()],
      guestAccess: this.guestAccess(),
    };
  }

  private channelError(error: unknown): string {
    if (error instanceof ChannelNameTakenError) return 'This channel name is already in use.';
    return firebaseErrorMessage(error, 'The channel could not be created.');
  }

  private markInvalid(): void {
    this.form.markAllAsTouched();
    this.errorMessage.set('Please enter a channel name.');
  }

  private startSubmit(): void {
    this.submitting.set(true);
    this.errorMessage.set('');
  }

  private initialMembers(): string[] {
    const uid = this.currentRegisteredUserId();
    return uid ? [uid] : [];
  }

  private currentRegisteredUserId(): string {
    if (this.isGuestCurrentUser()) return '';
    return this.auth.currentUser?.uid ?? '';
  }
}
