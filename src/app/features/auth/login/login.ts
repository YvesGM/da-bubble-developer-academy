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

  async submit(): Promise<void> {
    if (this.form.invalid) return this.markInvalid();
    const { email, password } = this.form.getRawValue();
    await this.runLogin(() => this.auth.login(email, password), true);
  }

  async loginAsGuest(): Promise<void> {
    await this.runLogin(() => this.auth.loginAsGuest());
  }

  async loginWithGoogle(): Promise<void> {
    await this.runLogin(() => this.auth.loginWithGoogle());
  }

  private markInvalid(): void {
    this.form.markAllAsTouched();
    this.errorMessage.set('Please check your input.');
  }

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

  private setLoginError(error: unknown, credentialFlow: boolean): void {
    const message = firebaseErrorMessage(error, 'Login failed.');
    credentialFlow ? this.credentialError.set(message) : this.errorMessage.set(message);
  }

  private startSubmit(): void {
    this.submitting.set(true);
    this.errorMessage.set('');
    this.credentialError.set('');
  }
}
