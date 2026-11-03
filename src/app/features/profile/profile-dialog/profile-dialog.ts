import { Component, HostListener, EventEmitter, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { take } from 'rxjs';

import { AVATAR_IDS } from '../../../core/constants/avatar.constants';
import { UserService } from '../../../core/services/user.service';
import { Avatar } from '../../../shared/components/avatar/avatar';

/**
 * Edits the current user's display name and preset avatar.
 *
 * The form and saving state coordinate profile persistence, validation, and
 * the close or save events consumed by the workspace.
 */
@Component({
  selector: 'app-profile-dialog',
  imports: [ReactiveFormsModule, Avatar],
  templateUrl: './profile-dialog.html',
  styleUrl: './profile-dialog.scss',
})
export class ProfileDialog {
  /** Angular form builder used to create typed and validated controls. */
  private readonly formBuilder = inject(FormBuilder);
  /** User service used to retrieve and persist profile information. */
  private readonly users = inject(UserService);

  /** Asks the owning view to dismiss the current dialog or panel. */
  @Output() readonly closeRequested = new EventEmitter<void>();
  /** Emits when the updated profile has been persisted successfully. */
  @Output() readonly saved = new EventEmitter<void>();

  /** Built-in avatar IDs offered during profile setup. */
  readonly avatarIds = AVATAR_IDS;
  /** Currently selected profile avatar before changes are saved. */
  readonly avatarId = signal<string>(AVATAR_IDS[0]);
  /** Human-readable error currently shown in the form. */
  readonly errorMessage = signal('');
  /** True while the profile update is being written. */
  readonly saving = signal(false);
  /** Non-nullable reactive form holding the fields and validation state. */
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
      this.avatarId.set(AVATAR_IDS.find((id) => id === profile.avatarId) ?? AVATAR_IDS[0]);
    });
  }

  /**
   * Updates the pending avatar selection without persisting it prematurely.
   *
   * @param avatarId - Identifier selected from the built-in avatar options.
   */
  selectAvatar(avatarId: string): void {
    this.avatarId.set(avatarId);
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
   * Persists both the edited name and selected avatar.
   *
   * @returns A promise that resolves after the profile update completes.
   */
  private async runSave(): Promise<void> {
    try {
      await this.users.updateCurrentProfile(this.form.controls.displayName.value.trim(), this.avatarId());
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
