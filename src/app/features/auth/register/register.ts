import { Component, inject, signal } from '@angular/core';
import { FirebaseError } from 'firebase/app';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AVATAR_IDS } from '../../../core/constants/avatar.constants';
import { AUTH_EMAIL_VALIDATORS, AUTH_NAME_VALIDATORS } from '../../../core/constants/auth-validation.constants';
import { AuthService } from '../../../core/services/auth.service';
import { firebaseErrorMessage } from '../../../core/utils/firebase-error.util';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { AuthShell } from '../components/auth-shell/auth-shell';
import { InputCaretDirective } from '../../../shared/directives/input-caret.directive';

/**
 * Guides account creation through credentials and avatar selection.
 *
 * The reactive form, step state, and submission status coordinate Firebase
 * registration with the profile data required by the workspace.
 */
@Component({
  selector: 'app-register',
  host: { '[class.register-leaving]': 'leaving()' },
  imports: [InputCaretDirective, ReactiveFormsModule, RouterLink, Avatar, AuthShell],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  /** Application auth service used to execute account operations. */
  private readonly auth = inject(AuthService);
  /** Angular form builder used to create typed and validated controls. */
  private readonly formBuilder = inject(FormBuilder);
  /** Router dependency used for navigation after the current action completes. */
  private readonly router = inject(Router);

  /** Built-in avatar IDs offered during profile setup. */
  readonly avatarIds = AVATAR_IDS;
  /** Active step in the multi-stage registration or creation flow. */
  readonly step = signal<'details' | 'avatar'>('details');
  /** Human-readable error currently shown in the form. */
  readonly errorMessage = signal('');
  /** True while an asynchronous form submission is in progress. */
  readonly submitting = signal(false);
  /** Progress marker for account creation and profile persistence. */
  readonly registrationStatus = signal<'creating' | 'success' | null>(null);
  /** True while navigating away from a completed auth flow. */
  readonly leaving = signal(false);
  /** Non-nullable reactive form holding the fields and validation state. */
  readonly form = this.formBuilder.nonNullable.group({
    name: ['', AUTH_NAME_VALIDATORS],
    email: ['', AUTH_EMAIL_VALIDATORS],
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
   * Creates the account, ends Firebase's automatic session, and returns to login.
   *
   * @param input - Validated registration form values.
   * @returns A promise that resolves after registration and navigation complete.
   */
  private async runRegistration(input: RegistrationInput): Promise<void> {
    this.startSubmit();
    try {
      await this.auth.register(input.name.trim(), input.email.trim(), input.password, input.avatarId);
      await this.auth.logout();
    } catch (error) {
      this.showRegistrationError(error);
      this.registrationStatus.set(null);
      this.errorMessage.set(firebaseErrorMessage(error, 'Registrierung fehlgeschlagen.'));
      this.submitting.set(false);
      return;
    }
    await this.finishRegistration();
  }

  /**
   * Returns Firebase email errors to their input so users can correct them immediately.
   *
   * @param error - Failure from registration or automatic-session cleanup.
   */
  private showRegistrationError(error: unknown): void {
    if (error instanceof FirebaseError && ['auth/invalid-email', 'auth/email-already-in-use'].includes(error.code)) {
      this.step.set('details');
      this.form.controls.email.setErrors({ server: true });
      this.form.controls.email.markAsTouched();
    }
  }

  /** Presents Figma's success notice before leaving the registration screen. */
  private async finishRegistration(): Promise<void> {
    this.registrationStatus.set('success');
    await this.delay(1600);
    try {
      await this.openLogin();
    } catch {
      this.registrationStatus.set(null);
      this.errorMessage.set('Konto erstellt. Bitte melde dich über die Anmeldeseite an.');
    } finally {
      this.submitting.set(false);
    }
  }

  /** Uses a native view transition where supported and a fade fallback elsewhere. */
  private async openLogin(): Promise<void> {
    if (this.reducedMotion()) return this.navigateLogin();
    const page = document as TransitionDocument;
    if (page.startViewTransition) {
      await page.startViewTransition(() => this.navigateLogin()).finished;
      return;
    }
    this.leaving.set(true);
    await this.delay(300);
    await this.navigateLogin();
    document.documentElement.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 400, easing: 'ease-out',
    });
  }

  /** Guards against cancelled navigation after account creation. */
  private async navigateLogin(): Promise<void> {
    if (!await this.router.navigateByUrl('/login')) {
      throw new Error('Login navigation was cancelled');
    }
  }

  /**
   * Respects the OS preference for reduced motion.
   *
   * @returns Whether navigation animations should be minimized.
   */
  private reducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Keeps the success notice readable independently of Firebase response speed.
   *
   * @param milliseconds - Minimum display time for the notice.
   * @returns Promise that resolves after the configured delay.
   */
  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
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
    this.registrationStatus.set('creating');
  }
}

interface RegistrationInput {
  name: string;
  email: string;
  password: string;
  privacyAccepted: boolean;
  avatarId: string;
}

/** Browser-native crossfade is progressively enhanced; Firefox uses the fade fallback. */
type TransitionDocument = Document & {
  startViewTransition?: (update: () => Promise<void>) => { finished: Promise<void> };
};
