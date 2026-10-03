import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { firebaseErrorMessage } from '../../../core/utils/firebase-error.util';
import { AuthShell } from '../components/auth-shell/auth-shell';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, AuthShell],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);

  readonly message = signal('');
  readonly errorMessage = signal('');
  readonly submitting = signal(false);
  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) return this.markInvalid();
    this.startSubmit();
    await this.sendReset();
  }

  private async sendReset(): Promise<void> {
    try {
      await this.auth.sendPasswordReset(this.form.controls.email.value);
      this.message.set('Die E-Mail zum Zurücksetzen deines Passworts wurde versendet.');
    } catch (error) {
      this.errorMessage.set(
        firebaseErrorMessage(error, 'Das Zurücksetzen konnte nicht gestartet werden.'),
      );
    } finally {
      this.submitting.set(false);
    }
  }

  private markInvalid(): void {
    this.form.markAllAsTouched();
    this.errorMessage.set('Bitte gib eine gültige E-Mail-Adresse ein.');
  }

  private startSubmit(): void {
    this.submitting.set(true);
    this.message.set('');
    this.errorMessage.set('');
  }
}
