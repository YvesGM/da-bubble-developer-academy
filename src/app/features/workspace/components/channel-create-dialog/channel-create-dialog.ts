import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth } from '@angular/fire/auth';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ChannelNameTakenError } from '../../../../core/errors/channel-name-taken.error';
import { ChannelService } from '../../../../core/services/channel.service';
import { UserService } from '../../../../core/services/user.service';

@Component({
  selector: 'app-channel-create-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './channel-create-dialog.html',
  styleUrl: './channel-create-dialog.scss',
})
export class ChannelCreateDialog {
  private readonly auth = inject(Auth);
  private readonly channels = inject(ChannelService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly userService = inject(UserService);

  @Output() readonly closeRequested = new EventEmitter<void>();
  @Output() readonly channelCreated = new EventEmitter<string>();

  readonly users = toSignal(this.userService.observeUsers(), { initialValue: [] });
  readonly selectedMemberIds = signal(new Set<string>([this.currentUserId()]));
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
    if (uid === this.currentUserId()) return;
    const selected = new Set(this.selectedMemberIds());
    selected.has(uid) ? selected.delete(uid) : selected.add(uid);
    this.selectedMemberIds.set(selected);
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
    return { ...value, memberIds: [...this.selectedMemberIds()] };
  }

  private channelError(error: unknown): string {
    if (error instanceof ChannelNameTakenError) return 'Dieser Channelname ist bereits vergeben.';
    return 'Der Channel konnte nicht erstellt werden.';
  }

  private markInvalid(): void {
    this.form.markAllAsTouched();
    this.errorMessage.set('Bitte gib einen Channelnamen ein.');
  }

  private startSubmit(): void {
    this.submitting.set(true);
    this.errorMessage.set('');
  }

  private currentUserId(): string {
    return this.auth.currentUser?.uid ?? '';
  }
}
