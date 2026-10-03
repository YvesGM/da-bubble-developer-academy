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
  createUserWithEmailAndPassword,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from '@angular/fire/auth';

import { UserService } from './user.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly users = inject(UserService);
  private readonly injector = inject(EnvironmentInjector);

  async login(email: string, password: string): Promise<UserCredential> {
    const credential = await this.run(() => signInWithEmailAndPassword(this.auth, email, password));
    await this.users.ensureProfile(credential.user);
    return credential;
  }

  async register(name: string, email: string, password: string): Promise<UserCredential> {
    const credential = await this.run(() => createUserWithEmailAndPassword(this.auth, email, password));
    await this.run(() => updateProfile(credential.user, { displayName: name }));
    await this.users.createProfile(credential.user, name);
    return credential;
  }

  async loginAsGuest(): Promise<UserCredential> {
    return this.run(() => signInAnonymously(this.auth));
  }

  async loginWithGoogle(): Promise<UserCredential> {
    const provider = new GoogleAuthProvider();
    const credential = await this.run(() => signInWithPopup(this.auth, provider));
    await this.users.ensureProfile(credential.user);
    return credential;
  }

  async logout(): Promise<void> {
    await this.run(() => signOut(this.auth));
  }

  private run<T>(action: () => Promise<T>): Promise<T> {
    return runInInjectionContext(this.injector, action);
  }
}
