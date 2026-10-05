import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AVATAR_IDS } from '../../../core/constants/avatar.constants';
import { AuthService } from '../../../core/services/auth.service';
import { firebaseErrorMessage } from '../../../core/utils/firebase-error.util';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { AuthShell } from '../components/auth-shell/auth-shell';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, Avatar, AuthShell],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly avatarIds = AVATAR_IDS;
  readonly step = signal<'details' | 'avatar'>('details');
  readonly errorMessage = signal('');
  readonly submitting = signal(false);
  readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    privacyAccepted: [false, Validators.requiredTrue],
    avatarId: ['', Validators.required],
  });

  /**
   * Stores the avatar selected during registration.
   *
   * @param avatarId - Identifier of the selected avatar.
   */
  selectAvatar(avatarId: string): void {
    this.form.controls.avatarId.setValue(avatarId);
  }

  /**
   * Validates account details and advances registration to avatar selection.
   */
  continueToAvatar(): void {
    if (!this.detailsValid()) return this.markDetailsInvalid();
    this.errorMessage.set('');
    this.step.set('avatar');
  }

  /**
   * Returns registration to the account-details step and clears transient errors.
   */
  backToDetails(): void {
    this.errorMessage.set('');
    this.step.set('details');
  }

  /**
   * Validates avatar selection and submits the complete registration payload.
   *
   * @returns A promise that resolves after registration handling completes.
   */
  async submit(): Promise<void> {
    if (this.form.controls.avatarId.invalid) return this.markAvatarInvalid();
    const value = this.form.getRawValue();
    await this.runRegistration(value);
  }

  /**
   * Returns the currently selected avatar identifier.
   *
   * @returns The selected avatar identifier.
   */
  selectedAvatar(): string {
    return this.form.controls.avatarId.value;
  }

  /**
   * Checks whether all account-detail controls required for the first step are valid.
   *
   * @returns Whether the registration details are valid.
   */
  private detailsValid(): boolean {
    const controls = this.form.controls;
    return controls.name.valid && controls.email.valid
      && controls.password.valid && controls.privacyAccepted.valid;
  }

  /**
   * Executes account creation and navigates to the workspace after success.
   *
   * @param input - Validated registration form values.
   * @returns A promise that resolves after registration and navigation complete.
   */
  private async runRegistration(input: RegistrationInput): Promise<void> {
    this.startSubmit();
    try {
      await this.auth.register(input.name, input.email, input.password, input.avatarId);
      await this.router.navigateByUrl('/workspace');
    } catch (error) {
      this.errorMessage.set(firebaseErrorMessage(error, 'Registrierung fehlgeschlagen.'));
    } finally {
      this.submitting.set(false);
    }
  }

  /**
   * Marks every account-detail control as touched so validation messages become visible.
   */
  private markDetailsInvalid(): void {
    this.form.controls.name.markAsTouched();
    this.form.controls.email.markAsTouched();
    this.form.controls.password.markAsTouched();
    this.form.controls.privacyAccepted.markAsTouched();
  }

  /**
   * Marks avatar selection as invalid and exposes the corresponding form error.
   */
  private markAvatarInvalid(): void {
    this.form.controls.avatarId.markAsTouched();
    this.errorMessage.set('Bitte wähle einen Avatar aus.');
  }

  /**
   * Clears previous errors and marks registration as submitting.
   */
  private startSubmit(): void {
    this.submitting.set(true);
    this.errorMessage.set('');
  }
}

interface RegistrationInput {
  name: string;
  email: string;
  password: string;
  privacyAccepted: boolean;
  avatarId: string;
}
