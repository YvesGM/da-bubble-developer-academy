import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { firebaseErrorMessage } from '../../../core/utils/firebase-error.util';
import { AuthShell } from '../components/auth-shell/auth-shell';
import { InputCaretDirective } from '../../../shared/directives/input-caret.directive';

/**
 * Collects an email address and requests a password-reset message from the backend.
 *
 * Submission state and feedback are exposed as signals; the response shown to
 * users does not reveal whether a particular account exists.
 */
@Component({
  selector: 'app-forgot-password',
  imports: [InputCaretDirective, ReactiveFormsModule, RouterLink, AuthShell],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  /** Application auth service used to execute account operations. */
  private readonly auth = inject(AuthService);
  /** Angular form builder used to create typed and validated controls. */
  private readonly formBuilder = inject(FormBuilder);
  /** Angular lifecycle reference used to cancel timers or subscriptions on teardown. */
  private readonly destroyRef = inject(DestroyRef);
  /** Handle for clearing temporary password-reset feedback. */
  private noticeTimer?: ReturnType<typeof setTimeout>;

  /** Neutral completion notice shown after requesting the reset email. */
  readonly message = signal('');
  /** Human-readable error currently shown in the form. */
  readonly errorMessage = signal('');
  /** True while an asynchronous form submission is in progress. */
  readonly submitting = signal(false);
  /** Non-nullable reactive form holding the fields and validation state. */
  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  /** Clears pending notice timers if the user navigates away. */
  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.noticeTimer));
  }

  /**
   * Validates the reset form and starts the password-reset request.
   *
   * @returns A promise that resolves after validation and request handling complete.
   */
  async submit(): Promise<void> {
    if (this.form.invalid) return this.markInvalid();
    this.startSubmit();
    await this.sendReset();
  }

  /**
   * Sends the password-reset email for the current form value and updates UI state.
   *
   * @returns A promise that resolves after Firebase finishes the request.
   */
  private async sendReset(): Promise<void> {
    try {
      await this.auth.sendPasswordReset(this.form.controls.email.value);
      this.message.set('Falls für diese Adresse ein Konto existiert, erhältst du eine E-Mail zum Zurücksetzen.');
      this.noticeTimer = setTimeout(() => this.message.set(''), 3500);
    } catch (error) {
      this.errorMessage.set(
        firebaseErrorMessage(error, 'Das Zurücksetzen konnte nicht gestartet werden.'),
      );
    } finally {
      this.submitting.set(false);
    }
  }

  /**
   * Marks the email control as touched so its validation error becomes visible.
   */
  private markInvalid(): void {
    this.form.markAllAsTouched();
    this.errorMessage.set('Bitte gib eine gültige E-Mail-Adresse ein.');
  }

  /**
   * Resets transient messages and marks the form as submitting.
   */
  private startSubmit(): void {
    this.submitting.set(true);
    clearTimeout(this.noticeTimer);
    this.message.set('');
    this.errorMessage.set('');
  }
}
