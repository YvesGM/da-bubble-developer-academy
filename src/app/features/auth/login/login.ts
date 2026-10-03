import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly errorMessage = signal('');
  readonly submitting = signal(false);
  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) return this.markInvalid();
    const { email, password } = this.form.getRawValue();
    await this.runLogin(() => this.auth.login(email, password));
  }

  async loginAsGuest(): Promise<void> {
    await this.runLogin(() => this.auth.loginAsGuest());
  }

  async loginWithGoogle(): Promise<void> {
    await this.runLogin(() => this.auth.loginWithGoogle());
  }

  private markInvalid(): void {
    this.form.markAllAsTouched();
    this.errorMessage.set('Bitte prüfe deine Eingaben.');
  }

  private async runLogin(action: () => Promise<unknown>): Promise<void> {
    this.submitting.set(true);
    this.errorMessage.set('');
    try {
      await action();
      await this.router.navigateByUrl('/workspace');
    } catch {
      this.errorMessage.set('Anmeldung fehlgeschlagen. Bitte prüfe deine Daten.');
    } finally {
      this.submitting.set(false);
    }
  }
}
