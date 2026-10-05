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
  sendPasswordResetEmail,
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
   * Requests a Firebase password-reset email for the supplied address.
   *
   * @param email - Email address that should receive the reset link.
   * @throws If Firebase cannot create or send the reset request.
   */
  async sendPasswordReset(email: string): Promise<void> {
    await this.run(() => sendPasswordResetEmail(this.auth, email));
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
   * Signs the current Firebase Authentication session out.
   *
   * @throws If Firebase cannot terminate the session.
   */
  async logout(): Promise<void> {
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
