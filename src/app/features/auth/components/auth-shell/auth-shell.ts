import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Provides the shared responsive shell for login, registration, and password recovery.
 *
 * Input flags select which auth view and registration stage is active so the
 * surrounding layout can adapt without each page duplicating shell markup.
 */
@Component({
  selector: 'app-auth-shell',
  imports: [RouterLink],
  templateUrl: './auth-shell.html',
  styleUrl: './auth-shell.scss',
})
export class AuthShell {
  /** Shows the registration-specific shell and navigation. */
  @Input() showSignup = false;
  /** Shows password-recovery-specific shell content. */
  @Input() showForgotPassword = false;
  /** Shows the form for changing a password from a reset link. */
  @Input() showResetPassword = false;
  /** Current registration stage, or null outside registration. */
  @Input() registerStep: 'details' | 'avatar' | null = null;
}
