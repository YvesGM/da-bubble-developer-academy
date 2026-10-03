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

  constructor() {
    void this.loadResetRequest();
  }

  async submit(): Promise<void> {
    if (this.form.invalid) return this.markInvalid();
    if (!this.passwordsMatch()) return this.markMismatch();
    this.startSubmit();
    await this.confirmReset();
  }

  private async loadResetRequest(): Promise<void> {
    const code = this.resetCode();
    if (!code) return this.errorMessage.set('The reset link is invalid.');
    try {
      this.email.set(await this.auth.verifyResetCode(code));
      this.ready.set(true);
    } catch (error) {
      this.errorMessage.set(firebaseErrorMessage(error, 'The reset link is invalid or expired.'));
    }
  }

  private async confirmReset(): Promise<void> {
    try {
      await this.auth.resetPassword(this.resetCode(), this.form.controls.password.value);
      this.message.set('Your password has been changed. You can now log in.');
      this.ready.set(false);
    } catch (error) {
      this.errorMessage.set(firebaseErrorMessage(error, 'The password could not be changed.'));
    } finally {
      this.submitting.set(false);
    }
  }

  private passwordsMatch(): boolean {
    return this.form.controls.password.value === this.form.controls.confirmPassword.value;
  }

  private markMismatch(): void {
    this.passwordMismatch.set(true);
    this.errorMessage.set('');
  }

  private resetCode(): string {
    return this.route.snapshot.queryParamMap.get('oobCode') ?? '';
  }

  private markInvalid(): void {
    this.form.markAllAsTouched();
    this.errorMessage.set('Please check your password entries.');
  }

  private startSubmit(): void {
    this.submitting.set(true);
    this.passwordMismatch.set(false);
    this.errorMessage.set('');
  }
}
