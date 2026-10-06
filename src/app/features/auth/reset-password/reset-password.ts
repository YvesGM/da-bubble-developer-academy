import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { firebaseErrorMessage } from '../../../core/utils/firebase-error.util';
import { AuthShell } from '../components/auth-shell/auth-shell';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, AuthShell],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword {
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);

  readonly email = signal('');
  readonly message = signal('');
  readonly errorMessage = signal('');
  readonly passwordMismatch = signal(false);
  readonly ready = signal(false);
  readonly submitting = signal(false);
  readonly form = this.formBuilder.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  });

  /**
   * Initializes reset-link validation as soon as the component is created.
   *
   * The asynchronous request is intentionally started without blocking component
   * construction; its result is reflected through the component signals.
   */
  constructor() {
    void this.loadResetRequest();
  }

  /**
   * Validates the reset form and confirms the password change when all inputs are valid.
   *
   * @returns A promise that resolves after reset handling completes.
   */
  async submit(): Promise<void> {
    if (this.form.invalid) return this.markInvalid();
    if (!this.passwordsMatch()) return this.markMismatch();
    this.startSubmit();
    await this.confirmReset();
  }

  /**
   * Validates the reset action code from the current route and loads its account email.
   *
   * @returns A promise that resolves after the reset request has been verified.
   */
  private async loadResetRequest(): Promise<void> {
    const code = this.resetCode();
    if (!code) return this.errorMessage.set('Der Link zum Zurücksetzen ist ungültig.');
    try {
      this.email.set(await this.auth.verifyResetCode(code));
      this.ready.set(true);
    } catch (error) {
      this.errorMessage.set(firebaseErrorMessage(error, 'Der Link ist ungültig oder abgelaufen.'));
    }
  }

  /**
   * Submits the new password with the current reset action code and updates UI state.
   *
   * @returns A promise that resolves after Firebase confirms the password reset.
   */
  private async confirmReset(): Promise<void> {
    try {
      await this.auth.resetPassword(this.resetCode(), this.form.controls.password.value);
      this.message.set('Dein Passwort wurde geändert. Du kannst dich jetzt anmelden.');
      this.ready.set(false);
    } catch (error) {
      this.errorMessage.set(firebaseErrorMessage(error, 'Das Passwort konnte nicht geändert werden.'));
    } finally {
      this.submitting.set(false);
    }
  }

  /**
   * Checks whether both password fields contain the same value.
   *
   * @returns Whether password and confirmation match.
   */
  passwordsMatch(): boolean {
    return this.form.controls.password.value === this.form.controls.confirmPassword.value;
  }

  /**
   * Exposes the password-mismatch state and clears unrelated form errors.
   */
  private markMismatch(): void {
    this.passwordMismatch.set(true);
    this.errorMessage.set('');
  }

  /**
   * Reads the Firebase reset action code from the current route.
   *
   * @returns The reset action code, or an empty string when missing.
   */
  private resetCode(): string {
    return this.route.snapshot.queryParamMap.get('oobCode') ?? '';
  }

  /**
   * Marks all reset-form controls as touched and exposes the validation error state.
   */
  private markInvalid(): void {
    this.form.markAllAsTouched();
    this.errorMessage.set('Bitte überprüfe deine Passworteingaben.');
  }

  /**
   * Clears transient validation state and marks the reset form as submitting.
   */
  private startSubmit(): void {
    this.submitting.set(true);
    this.passwordMismatch.set(false);
    this.errorMessage.set('');
  }
}
