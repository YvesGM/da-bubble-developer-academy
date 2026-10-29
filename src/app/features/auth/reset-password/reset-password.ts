import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { firebaseConfig } from '../../../../environments/environment.generated';
import { firebaseErrorMessage } from '../../../core/utils/firebase-error.util';
import { InputCaretDirective } from '../../../shared/directives/input-caret.directive';
import { AuthShell } from '../components/auth-shell/auth-shell';

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

  readonly errorMessage = signal('');
  readonly passwordMismatch = signal(false);
  readonly ready = signal(false);
  readonly submitting = signal(false);
  readonly completed = signal(false);
  readonly leaving = signal(false);
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
      if (this.completed()) {
        this.errorMessage.set('Passwort geändert. Bitte zur Anmeldung wechseln.');
      } else {
        this.errorMessage.set(firebaseErrorMessage(error, 'Das Passwort konnte nicht geändert werden.'));
      }
    } finally {
      this.submitting.set(false);
    }
  }

  /** Displays the success overlay before a reduced-motion-aware route change. */
  private async navigateToLogin(): Promise<void> {
    const page = document as ViewTransitionDocument;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && page.startViewTransition) {
      await page.startViewTransition(() => this.openLogin()).finished;
      return;
    }
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.leaving.set(true);
      await this.delay(300);
    }
    await this.openLogin();
    document.documentElement.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 400, easing: 'ease-out',
    });
  }

  /** Propagates a cancelled navigation rather than silently treating it as success. */
  private async openLogin(): Promise<void> {
    if (!await this.router.navigateByUrl('/login')) {
      throw new Error('Login navigation was cancelled');
    }
  }

  /** Returns the code from the Firebase reset link without persisting it. */
  private resetCode(): string {
    return this.route.snapshot.queryParamMap.get('oobCode') ?? '';
  }

  /** Matches the button's enabled state to Figma's confirmed-password state. */
  passwordsMatch(): boolean {
    return this.form.controls.password.value === this.form.controls.confirmPassword.value;
  }

  /** Keeps the status toast readable before leaving the screen. */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }
}

/** Optional browser API; unsupported browsers use the existing CSS exit motion. */
type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => Promise<void>) => { finished: Promise<void> };
};
