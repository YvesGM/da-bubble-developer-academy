import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { firebaseErrorMessage } from '../../../core/utils/firebase-error.util';
import { AuthShell } from '../components/auth-shell/auth-shell';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, AuthShell],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly errorMessage = signal('');
  readonly credentialError = signal('');
  readonly submitting = signal(false);
  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
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
    await this.runLogin(() => this.auth.login(email, password), true);
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
    this.errorMessage.set('Bitte überprüfe deine Eingaben.');
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
    credentialFlow ? this.credentialError.set(message) : this.errorMessage.set(message);
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
