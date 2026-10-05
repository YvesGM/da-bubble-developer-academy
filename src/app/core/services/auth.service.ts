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

  /** Authenticates a registered user and ensures a Firestore profile exists. */
  async login(email: string, password: string): Promise<UserCredential> {
    const credential = await this.run(() => signInWithEmailAndPassword(this.auth, email, password));
    await this.users.ensureProfile(credential.user);
    return credential;
  }

  /** Creates an account, updates the Firebase profile and stores the app profile. */
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

  /** Starts an anonymous guest session. */
  async loginAsGuest(): Promise<UserCredential> {
    return this.run(() => signInAnonymously(this.auth));
  }

  /** Authenticates with Google and ensures the app profile exists. */
  async loginWithGoogle(): Promise<UserCredential> {
    const provider = new GoogleAuthProvider();
    const credential = await this.run(() => signInWithPopup(this.auth, provider));
    await this.users.ensureProfile(credential.user);
    return credential;
  }

  /** Sends Firebase's password-reset email to the supplied address. */
  async sendPasswordReset(email: string): Promise<void> {
    await this.run(() => sendPasswordResetEmail(this.auth, email));
  }

  /** Validates a password-reset code and returns its email address. */
  async verifyResetCode(code: string): Promise<string> {
    return this.run(() => verifyPasswordResetCode(this.auth, code));
  }

  /** Confirms a password reset with Firebase Authentication. */
  async resetPassword(code: string, password: string): Promise<void> {
    await this.run(() => confirmPasswordReset(this.auth, code, password));
  }

  /** Ends the active Firebase Authentication session. */
  async logout(): Promise<void> {
    await this.run(() => signOut(this.auth));
  }

  private run<T>(action: () => Promise<T>): Promise<T> {
    return runInInjectionContext(this.injector, action);
  }
}
