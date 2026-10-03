import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AVATAR_IDS } from '../../../core/constants/avatar.constants';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-profile-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './profile-dialog.html',
  styleUrl: './profile-dialog.scss',
})
export class ProfileDialog {
  private readonly formBuilder = inject(FormBuilder);
  private readonly users = inject(UserService);

  @Output() readonly closeRequested = new EventEmitter<void>();

  readonly avatarIds = AVATAR_IDS;
  readonly profile = toSignal(this.users.observeCurrentProfile());
  readonly errorMessage = signal('');
  readonly saving = signal(false);
  readonly form = this.formBuilder.nonNullable.group({
    displayName: ['', Validators.required],
    avatarId: ['avatar-1', Validators.required],
  });

  constructor() {
    const subscription = this.users.observeCurrentProfile().subscribe((profile) => {
      if (!profile) return;
      this.form.setValue({ displayName: profile.displayName, avatarId: profile.avatarId });
      subscription.unsubscribe();
    });
  }

  selectAvatar(avatarId: string): void {
    this.form.controls.avatarId.setValue(avatarId);
  }

  async save(): Promise<void> {
    if (this.form.invalid) return this.markInvalid();
    this.saving.set(true);
    await this.runSave();
  }

  private async runSave(): Promise<void> {
    const value = this.form.getRawValue();
    try {
      await this.users.updateCurrentProfile(value.displayName, value.avatarId);
      this.closeRequested.emit();
    } catch {
      this.errorMessage.set('The profile could not be updated.');
    } finally {
      this.saving.set(false);
    }
  }

  private markInvalid(): void {
    this.form.markAllAsTouched();
    this.errorMessage.set('Please enter your name.');
  }
}
