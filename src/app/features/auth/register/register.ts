import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { firebaseErrorMessage } from '../../../core/utils/firebase-error.util';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly errorMessage = signal('');
  readonly submitting = signal(false);
  readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) return this.markInvalid();
    const { name, email, password } = this.form.getRawValue();
    await this.runRegistration(name, email, password);
  }

  private markInvalid(): void {
    this.form.markAllAsTouched();
    this.errorMessage.set('Please check your input.');
  }

  private async runRegistration(name: string, email: string, password: string): Promise<void> {
    this.startSubmit();
    try {
      await this.auth.register(name, email, password);
      await this.router.navigateByUrl('/workspace');
    } catch (error) {
      this.errorMessage.set(firebaseErrorMessage(error, 'Registration failed.'));
    } finally {
      this.submitting.set(false);
    }
  }

  private startSubmit(): void {
    this.submitting.set(true);
    this.errorMessage.set('');
  }
}
