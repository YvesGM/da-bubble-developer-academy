import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Provides the shared responsive layout for authentication screens. */
@Component({
  selector: 'app-auth-shell',
  imports: [RouterLink],
  templateUrl: './auth-shell.html',
  styleUrl: './auth-shell.scss',
})
export class AuthShell {
  @Input() showSignup = false;
  @Input() showForgotPassword = false;
  @Input() showResetPassword = false;
  @Input() registerStep: 'details' | 'avatar' | null = null;
}
