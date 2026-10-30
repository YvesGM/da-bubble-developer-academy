import {
  EnvironmentInjector,
  Injectable,
  inject,
  runInInjectionContext,
} from '@angular/core';
import {
  Auth,
  GoogleAuthProvider,
  UserCredential,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  deleteUser,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  verifyPasswordResetCode,
} from '@angular/fire/auth';

import { UserService } from './user.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly users = inject(UserService);
  private readonly injector = inject(EnvironmentInjector);


  /**
   * Authenticates a registered user with email and password and ensures that the application profile exists.
   *
   * @param email - Email address used for authentication.
   * @param password - User password.
   * @returns The Firebase user credential for the authenticated user.
   * @throws If Firebase Authentication rejects the credentials or profile initialization fails.
   */
  async login(email: string, password: string): Promise<UserCredential> {
    const credential = await this.run(() => signInWithEmailAndPassword(this.auth, email, password));
    await this.users.ensureProfile(credential.user);
    return credential;
  }


  /**
   * Creates a registered Firebase account and persists the corresponding application profile.
   *
   * @param name - Display name stored on the Firebase user and app profile.
   * @param email - Email address for the new account.
   * @param password - Password for the new account.
   * @param avatarId - Identifier of the selected profile avatar.
   * @returns The Firebase user credential for the newly created account.
   * @throws If account creation, profile synchronization or Firestore persistence fails.
   */
  async register(
    name: string,
    email: string,
    password: string,
    avatarId: string,
  ): Promise<UserCredential> {
    const credential = await this.run(() => createUserWithEmailAndPassword(this.auth, email, password));
    await this.run(() => updateProfile(credential.user, { displayName: name }));
    await this.users.createProfile(credential.user, name, avatarId);
    return credential;
  }


  /**
   * Starts an anonymous Firebase Authentication session.
   *
   * @returns The Firebase user credential for the anonymous guest session.
   * @throws If anonymous authentication is unavailable or rejected.
   */
  async loginAsGuest(): Promise<UserCredential> {
    return this.run(() => signInAnonymously(this.auth));
  }


  /**
   * Authenticates with Google through a popup and ensures that the application profile exists.
   *
   * @returns The Firebase user credential returned by Google authentication.
   * @throws If the popup flow or profile initialization fails.
   */
  async loginWithGoogle(): Promise<UserCredential> {
    const provider = new GoogleAuthProvider();
    const credential = await this.run(() => signInWithPopup(this.auth, provider));
    await this.users.ensureProfile(credential.user);
    return credential;
  }

  /**
   * Sends reset requests to ALL-INKL from both the Akademie and portfolio sites.
   * Local development still uses the existing /api proxy.
   */
  async sendPasswordReset(email: string): Promise<void> {
    const response = await fetch(this.passwordResetEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
      throw new Error('Password reset endpoint unavailable');
    }
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== 'object' || !('message' in payload)
      || payload.message !== 'If an account exists, a reset email will be sent') {
      throw new Error('Invalid password reset endpoint response');
    }
  }

  /** Returns the remote API, keeping the local PHP development proxy intact. */
  private passwordResetEndpoint(): string {
    const local = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    return local ? '/api/request-password-reset.php'
      : 'https://dabubble.schniefs-portfolio.de/api/request-password-reset.php';
  }

  /**
   * Validates a Firebase password-reset action code.
   *
   * @param code - Out-of-band reset code from the reset link.
   * @returns The email address associated with the reset request.
   * @throws If the reset code is invalid, expired or already consumed.
   */
  async verifyResetCode(code: string): Promise<string> {
    return this.run(() => verifyPasswordResetCode(this.auth, code));
  }

  /**
   * Completes a Firebase password reset with a verified action code.
   *
   * @param code - Out-of-band reset code from the reset link.
   * @param password - New password to store for the account.
   * @throws If Firebase rejects the action code or new password.
   */
  async resetPassword(code: string, password: string): Promise<void> {
    await this.run(() => confirmPasswordReset(this.auth, code, password));
  }

  /**
   * Deletes anonymous accounts on logout; registered accounts are only signed out.
   * If Firebase rejects guest deletion, signs out so logout stays functional.
   * @throws If Firebase cannot sign out after a failed guest deletion.
   */
  async logout(): Promise<void> {
    const user = this.auth.currentUser;
    if (user?.isAnonymous) {
      try {
        await this.run(() => deleteUser(user));
        return;
      } catch {
        console.warn('Guest account deletion failed; signing out instead.');
      }
    }
    await this.run(() => signOut(this.auth));
  }

  /**
   * Executes an asynchronous Firebase operation inside the service injection context.
   *
   * @param action - Asynchronous Firebase operation to execute.
   * @returns The promise returned by the supplied operation.
   */
  private run<T>(action: () => Promise<T>): Promise<T> {
    return runInInjectionContext(this.injector, action);
  }
}
