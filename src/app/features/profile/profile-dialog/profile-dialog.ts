import { Component, HostListener, EventEmitter, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { take } from 'rxjs';

import { UserService } from '../../../core/services/user.service';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { InputCaretDirective } from '../../../shared/directives/input-caret.directive';

/** Edits the authenticated user's public profile information. */
@Component({
  selector: 'app-profile-dialog',
  imports: [InputCaretDirective, ReactiveFormsModule, Avatar],
  templateUrl: './profile-dialog.html',
  styleUrl: './profile-dialog.scss',
})
export class ProfileDialog {
  private readonly formBuilder = inject(FormBuilder);
  private readonly users = inject(UserService);

  @Output() readonly closeRequested = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<void>();

  readonly avatarId = signal('avatar-1');
  readonly errorMessage = signal('');
  readonly saving = signal(false);
  readonly form = this.formBuilder.nonNullable.group({
    displayName: ['', Validators.required],
  });

  /** Closes the profile editor with Escape when no save is in progress. */
  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    if (!this.saving()) this.closeRequested.emit();
  }

  /**
   * Preloads the current user profile into the edit form.
   *
   * Only the first profile emission is consumed because the dialog edits a local
   * form snapshot until the user explicitly saves the changes.
   */
  constructor() {
    this.users.observeCurrentProfile().pipe(take(1)).subscribe((profile) => {
      if (!profile) return;
      this.form.controls.displayName.setValue(profile.displayName);
      this.avatarId.set(profile.avatarId);
    });
  }

  /**
   * Validates the profile form and starts persistence of the current values.
   *
   * @returns A promise that resolves after save handling completes.
   */
  async save(): Promise<void> {
    if (this.form.invalid || !this.form.controls.displayName.value.trim()) return this.markInvalid();
    this.saving.set(true);
    await this.runSave();
  }

  /**
   * Persists only the edited name, leaving the existing avatar unchanged.
   *
   * @returns A promise that resolves after the profile update completes.
   */
  private async runSave(): Promise<void> {
    try {
      await this.users.updateCurrentDisplayName(this.form.controls.displayName.value.trim());
      this.saved.emit();
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
