import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { take } from 'rxjs';

import { AVATAR_IDS } from '../../../core/constants/avatar.constants';
import { UserService } from '../../../core/services/user.service';
import { Avatar } from '../../../shared/components/avatar/avatar';

@Component({
  selector: 'app-profile-dialog',
  imports: [ReactiveFormsModule, Avatar],
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

  /**
   * Preloads the current user profile into the edit form.
   *
   * Only the first profile emission is consumed because the dialog edits a local
   * form snapshot until the user explicitly saves the changes.
   */
  constructor() {
    this.users.observeCurrentProfile().pipe(take(1)).subscribe((profile) => {
      if (!profile) return;
      this.form.setValue({ displayName: profile.displayName, avatarId: profile.avatarId });
    });
  }

  /**
   * Stores the avatar selected in the profile editor.
   *
   * @param avatarId - Identifier of the selected avatar.
   */
  selectAvatar(avatarId: string): void {
    this.form.controls.avatarId.setValue(avatarId);
  }

  /**
   * Validates the profile form and starts persistence of the current values.
   *
   * @returns A promise that resolves after save handling completes.
   */
  async save(): Promise<void> {
    if (this.form.invalid) return this.markInvalid();
    this.saving.set(true);
    await this.runSave();
  }

  /**
   * Persists the edited profile and closes the dialog after a successful update.
   *
   * @returns A promise that resolves after the profile update completes.
   */
  private async runSave(): Promise<void> {
    const value = this.form.getRawValue();
    try {
      await this.users.updateCurrentProfile(value.displayName, value.avatarId);
      this.closeRequested.emit();
    } catch {
      this.errorMessage.set('Das Profil konnte nicht aktualisiert werden.');
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Marks the profile form as touched and exposes the validation error state.
   */
  private markInvalid(): void {
    this.form.markAllAsTouched();
    this.errorMessage.set('Bitte gib deinen Namen ein.');
  }
}
