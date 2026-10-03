import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { firebaseErrorMessage } from '../../../core/utils/firebase-error.util';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink],
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
      this.message.set('Password reset instructions were sent to your email address.');
    } catch (error) {
      this.errorMessage.set(firebaseErrorMessage(error, 'Password reset could not be started.'));
    } finally {
      this.submitting.set(false);
    }
  }

  private markInvalid(): void {
    this.form.markAllAsTouched();
    this.errorMessage.set('Please enter a valid email address.');
  }

  private startSubmit(): void {
    this.submitting.set(true);
    this.message.set('');
    this.errorMessage.set('');
  }
}
