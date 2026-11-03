import { Component, inject, signal } from '@angular/core';
import { FirebaseError } from 'firebase/app';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AUTH_EMAIL_VALIDATORS } from '../../../core/constants/auth-validation.constants';
import { AuthService } from '../../../core/services/auth.service';
import { firebaseErrorMessage } from '../../../core/utils/firebase-error.util';
import { AuthShell } from '../components/auth-shell/auth-shell';
import { InputCaretDirective } from '../../../shared/directives/input-caret.directive';

/**
 * Handles the email, Google, and guest sign-in flows for DABubble.
 *
 * Reactive form and submission signals drive validation and feedback before a
 * successful authentication hands navigation to the workspace.
 */
@Component({
  selector: 'app-login',
  imports: [InputCaretDirective, ReactiveFormsModule, RouterLink, AuthShell],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  /** Application auth service used to execute account operations. */
  private readonly auth = inject(AuthService);
  /** Angular form builder used to create typed and validated controls. */
  private readonly formBuilder = inject(FormBuilder);
  /** Router dependency used for navigation after the current action completes. */
  private readonly router = inject(Router);

  /** Human-readable error currently shown in the form. */
  readonly errorMessage = signal('');
  /** Error associated specifically with the entered login credentials. */
  readonly credentialError = signal('');
  /** True while an asynchronous form submission is in progress. */
  readonly submitting = signal(false);
  /** Non-nullable reactive form holding the fields and validation state. */
  readonly form = this.formBuilder.nonNullable.group({
    email: ['', AUTH_EMAIL_VALIDATORS],
    password: ['', Validators.required],
  });

  /**
   * Validates the login form and starts the sign-in flow.
   *
   * @returns A promise that resolves after the sign-in attempt completes.
   */
  async submit(): Promise<void> {
    if (this.form.invalid) return this.markInvalid();
    const { email, password } = this.form.getRawValue();
    await this.runLogin(() => this.auth.login(email.trim(), password), true);
  }

  /**
   * Hides prior login feedback while a field is being corrected.
   *
   * @param field - Login control that the user started editing again.
   */
  editingField(field: 'email' | 'password'): void {
    this.form.controls[field].markAsUntouched();
    this.credentialError.set('');
  }

  /** Trims e-mail surrounding whitespace but never changes the password. */
  normalizeEmail(): void {
    const control = this.form.controls.email;
    control.setValue(control.value.trim());
  }

  /**
   * Starts an anonymous guest session and opens the workspace.
   *
   * @returns A promise that resolves after sign-in and navigation complete.
   */
  async loginAsGuest(): Promise<void> {
    await this.runLogin(() => this.auth.loginAsGuest());
  }

  /**
   * Starts Google sign-in and opens the workspace after success.
   *
   * @returns A promise that resolves after sign-in and navigation complete.
   */
  async loginWithGoogle(): Promise<void> {
    await this.runLogin(() => this.auth.loginWithGoogle());
  }

  /**
   * Marks every login field as touched so validation messages become visible.
   */
  private markInvalid(): void {
    this.form.markAllAsTouched();
    this.errorMessage.set('');
  }

  /**
   * Executes one sign-in strategy and centralizes loading, error and navigation handling.
   *
   * @param action - Sign-in operation to execute.
   * @param credentialFlow - Whether failures should be displayed with the form credentials.
   * @returns A promise that resolves after the complete sign-in flow.
   */
  private async runLogin(action: () => Promise<unknown>, credentialFlow = false): Promise<void> {
    this.startSubmit();
    try {
      await action();
      await this.router.navigateByUrl('/workspace');
    } catch (error) {
      this.setLoginError(error, credentialFlow);
    } finally {
      this.submitting.set(false);
    }
  }

  /**
   * Maps a sign-in failure to the appropriate visible error state.
   *
   * @param error - Error returned by the sign-in operation.
   * @param credentialFlow - Whether the message belongs to the form credential error.
   */
  private setLoginError(error: unknown, credentialFlow: boolean): void {
    const message = firebaseErrorMessage(error, 'Anmeldung fehlgeschlagen.');
    const invalidCredentials = error instanceof FirebaseError && [
      'auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found',
    ].includes(error.code);
    const visibleMessage = invalidCredentials
      ? 'Falsches Passwort oder E-Mail.. Bitte noch einmal versuchen.'
      : message;
    credentialFlow ? this.credentialError.set(visibleMessage) : this.errorMessage.set(message);
  }

  /**
   * Clears previous errors and marks the login form as submitting.
   */
  private startSubmit(): void {
    this.submitting.set(true);
    this.errorMessage.set('');
    this.credentialError.set('');
  }
}
