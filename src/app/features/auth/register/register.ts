import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AVATAR_IDS } from '../../../core/constants/avatar.constants';
import { AuthService } from '../../../core/services/auth.service';
import { firebaseErrorMessage } from '../../../core/utils/firebase-error.util';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { AuthShell } from '../components/auth-shell/auth-shell';
import { InputCaretDirective } from '../../../shared/directives/input-caret.directive';

@Component({
  selector: 'app-register',
  host: { '[class.register-leaving]': 'leaving()' },
  imports: [InputCaretDirective, ReactiveFormsModule, RouterLink, Avatar, AuthShell],
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
  readonly registrationStatus = signal<'creating' | 'success' | null>(null);
  readonly leaving = signal(false);
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
    } catch (error) {
      this.registrationStatus.set(null);
      this.errorMessage.set(firebaseErrorMessage(error, 'Registrierung fehlgeschlagen.'));
      this.submitting.set(false);
      return;
    }
    await this.finishRegistration();
  }

  /** Presents Figma's success notice before leaving the registration screen. */
  private async finishRegistration(): Promise<void> {
    this.registrationStatus.set('success');
    await this.delay(1600);
    try {
      await this.openWorkspace();
    } catch {
      this.registrationStatus.set(null);
      this.errorMessage.set('Konto erstellt. Weiterleitung fehlgeschlagen. Bitte neu laden.');
    } finally {
      this.submitting.set(false);
    }
  }

  /** Uses a native view transition where supported and a fade fallback elsewhere. */
  private async openWorkspace(): Promise<void> {
    if (this.reducedMotion()) return this.navigateWorkspace();
    const page = document as TransitionDocument;
    if (page.startViewTransition) {
      await page.startViewTransition(() => this.navigateWorkspace()).finished;
      return;
    }
    this.leaving.set(true);
    await this.delay(300);
    await this.navigateWorkspace();
    document.documentElement.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 400, easing: 'ease-out',
    });
  }

  /** Guards against cancelled navigation after account creation. */
  private async navigateWorkspace(): Promise<void> {
    if (!await this.router.navigateByUrl('/workspace')) {
      throw new Error('Workspace navigation was cancelled');
    }
  }

  /** Respects the OS preference for reduced motion. */
  private reducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** Keeps the success notice readable independently of Firebase response speed. */
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
