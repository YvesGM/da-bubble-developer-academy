import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AVATAR_IDS } from '../../../core/constants/avatar.constants';
import { AuthService } from '../../../core/services/auth.service';
import { firebaseErrorMessage } from '../../../core/utils/firebase-error.util';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { AuthShell } from '../components/auth-shell/auth-shell';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, Avatar, AuthShell],
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
  readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    privacyAccepted: [false, Validators.requiredTrue],
    avatarId: ['', Validators.required],
  });

  selectAvatar(avatarId: string): void {
    this.form.controls.avatarId.setValue(avatarId);
  }

  continueToAvatar(): void {
    if (!this.detailsValid()) return this.markDetailsInvalid();
    this.errorMessage.set('');
    this.step.set('avatar');
  }

  backToDetails(): void {
    this.errorMessage.set('');
    this.step.set('details');
  }

  async submit(): Promise<void> {
    if (this.form.controls.avatarId.invalid) return this.markAvatarInvalid();
    const value = this.form.getRawValue();
    await this.runRegistration(value.name, value.email, value.password, value.avatarId);
  }

  selectedAvatar(): string {
    return this.form.controls.avatarId.value;
  }

  private detailsValid(): boolean {
    const controls = this.form.controls;
    return controls.name.valid && controls.email.valid
      && controls.password.valid && controls.privacyAccepted.valid;
  }

  private async runRegistration(
    name: string,
    email: string,
    password: string,
    avatarId: string,
  ): Promise<void> {
    this.startSubmit();
    try {
      await this.auth.register(name, email, password, avatarId);
      await this.router.navigateByUrl('/workspace');
    } catch (error) {
      this.errorMessage.set(firebaseErrorMessage(error, 'Registrierung fehlgeschlagen.'));
    } finally {
      this.submitting.set(false);
    }
  }

  private markDetailsInvalid(): void {
    this.form.controls.name.markAsTouched();
    this.form.controls.email.markAsTouched();
    this.form.controls.password.markAsTouched();
    this.form.controls.privacyAccepted.markAsTouched();
  }

  private markAvatarInvalid(): void {
    this.form.controls.avatarId.markAsTouched();
    this.errorMessage.set('Bitte wähle einen Avatar aus.');
  }

  private startSubmit(): void {
    this.submitting.set(true);
    this.errorMessage.set('');
  }
}
