import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AVATAR_IDS } from '../../../core/constants/avatar.constants';
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

  readonly avatarIds = AVATAR_IDS;
  readonly errorMessage = signal('');
  readonly submitting = signal(false);
  readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    avatarId: ['avatar-1', Validators.required],
  });

  selectAvatar(avatarId: string): void {
    this.form.controls.avatarId.setValue(avatarId);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) return this.markInvalid();
    const value = this.form.getRawValue();
    await this.runRegistration(value);
  }

  private async runRegistration(value: ReturnType<typeof this.form.getRawValue>): Promise<void> {
    this.startSubmit();
    try {
      await this.auth.register(value.name, value.email, value.password, value.avatarId);
      await this.router.navigateByUrl('/workspace');
    } catch (error) {
      this.errorMessage.set(firebaseErrorMessage(error, 'Registration failed.'));
    } finally {
      this.submitting.set(false);
    }
  }

  private markInvalid(): void {
    this.form.markAllAsTouched();
    this.errorMessage.set('Please check your input.');
  }

  private startSubmit(): void {
    this.submitting.set(true);
    this.errorMessage.set('');
  }
}
