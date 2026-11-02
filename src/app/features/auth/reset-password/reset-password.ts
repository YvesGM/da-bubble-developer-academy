import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { firebaseConfig } from '../../../../environments/environment.generated';
import { firebaseErrorMessage } from '../../../core/utils/firebase-error.util';
import { InputCaretDirective } from '../../../shared/directives/input-caret.directive';
import { AuthShell } from '../components/auth-shell/auth-shell';

/**
 * Validates a Firebase reset action code and saves the replacement password.
 *
 * The view distinguishes invalid or expired reset links from local form
 * validation errors, and reports completion before leaving the reset page.
 */
@Component({
  selector: 'app-reset-password',
  host: { '[class.reset-leaving]': 'leaving()' },
  imports: [InputCaretDirective, ReactiveFormsModule, RouterLink, AuthShell],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword {
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** Human-readable error currently shown in the form. */
  readonly errorMessage = signal('');
  /** Whether the two entered replacement passwords differ. */
  readonly passwordMismatch = signal(false);
  /** Whether the reset action code is valid and can be used. */
  readonly ready = signal(false);
  /** True while an asynchronous form submission is in progress. */
  readonly submitting = signal(false);
  /** Whether Firebase confirmed the password change. */
  readonly completed = signal(false);
  /** True while navigating away from a completed auth flow. */
  readonly leaving = signal(false);
  /** Non-nullable reactive form holding the fields and validation state. */
  readonly form = this.formBuilder.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  });

  /** Only resetPassword uses this page; delegate other Firebase action modes safely. */
  constructor() {
    const mode = this.route.snapshot.queryParamMap.get('mode');
    if (mode && mode !== 'resetPassword') {
      this.forwardOtherAction();
      return;
    }
    void this.loadResetRequest();
  }

  /** Keeps the standard Firebase handler available for other email action types. */
  private forwardOtherAction(): void {
    const handler = new URL('/__/auth/action', `https://${firebaseConfig.authDomain}`);
    handler.search = window.location.search;
    window.location.replace(handler.toString());
  }

  /** Confirms that the one-time Firebase code belongs to a valid reset request. */
  private async loadResetRequest(): Promise<void> {
    const code = this.resetCode();
    if (!code) {
      this.errorMessage.set('Der Link zum Zurücksetzen ist ungültig.');
      return;
    }
    try {
      await this.auth.verifyResetCode(code);
      this.ready.set(true);
    } catch (error) {
      this.errorMessage.set(firebaseErrorMessage(error, 'Der Link ist ungültig oder abgelaufen.'));
    }
  }

  /** Prevents submitting until both new passwords are valid and identical. */
  async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.submitting() || this.completed() || this.form.invalid) return;
    if (!this.passwordsMatch()) return this.passwordMismatch.set(true);
    this.submitting.set(true);
    this.passwordMismatch.set(false);
    this.errorMessage.set('');
    await this.confirmReset();
  }

  /** Changes the password only after Firebase accepts the one-time reset code. */
  private async confirmReset(): Promise<void> {
    try {
      await this.auth.resetPassword(this.resetCode(), this.form.controls.password.value);
      this.completed.set(true);
      await this.delay(1600);
      await this.navigateToLogin();
    } catch (error) {
      this.reportResetFailure(error);
    } finally {
      this.submitting.set(false);
    }
  }

  /**
   * Reports reset failures without falsely presenting a completed password change as failed.
   *
   * @param error - Firebase or navigation error raised during the reset flow.
   */
  private reportResetFailure(error: unknown): void {
    const message = this.completed()
      ? 'Passwort geändert. Bitte zur Anmeldung wechseln.'
      : firebaseErrorMessage(error, 'Das Passwort konnte nicht geändert werden.');
    this.errorMessage.set(message);
  }

  /** Displays the success overlay before a reduced-motion-aware route change. */
  private async navigateToLogin(): Promise<void> {
    const page = document as ViewTransitionDocument;
    if (!this.prefersReducedMotion() && page.startViewTransition) {
      await page.startViewTransition(() => this.openLogin()).finished;
      return;
    }
    await this.navigateWithoutViewTransition();
  }

  /** Runs the existing CSS and Web Animations fallback for route transitions. */
  private async navigateWithoutViewTransition(): Promise<void> {
    if (!this.prefersReducedMotion()) {
      this.leaving.set(true);
      await this.delay(300);
    }
    await this.openLogin();
    document.documentElement.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 400, easing: 'ease-out',
    });
  }

  /**
   * Checks whether the operating system requests reduced motion.
   *
   * @returns Whether transition animations should be skipped.
   */
  private prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** Propagates a cancelled navigation rather than silently treating it as success. */
  private async openLogin(): Promise<void> {
    if (!await this.router.navigateByUrl('/login')) {
      throw new Error('Login navigation was cancelled');
    }
  }

  /**
   * Reads the code from the Firebase reset link without persisting it.
   *
   * @returns One-time Firebase action code from the current route.
   */
  private resetCode(): string {
    return this.route.snapshot.queryParamMap.get('oobCode') ?? '';
  }

  /**
   * Matches the button's enabled state to Figma's confirmed-password state.
   *
   * @returns Whether both submitted password values are identical.
   */
  passwordsMatch(): boolean {
    return this.form.controls.password.value === this.form.controls.confirmPassword.value;
  }

  /**
   * Keeps the status toast readable before leaving the screen.
   *
   * @param ms - Minimum duration in milliseconds.
   * @returns Promise that resolves after the delay.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }
}

/** Optional browser API; unsupported browsers use the existing CSS exit motion. */
type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => Promise<void>) => { finished: Promise<void> };
};
