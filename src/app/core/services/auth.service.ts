import { Injectable, inject } from '@angular/core';
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

  async login(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  async register(name: string, email: string, password: string): Promise<UserCredential> {
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    await this.users.upsertProfile(credential.user, name);
    return credential;
  }

  async loginAsGuest(): Promise<UserCredential> {
    const credential = await signInAnonymously(this.auth);
    await this.users.upsertProfile(credential.user, 'Gast');
    return credential;
  }

  async loginWithGoogle(): Promise<UserCredential> {
    const credential = await signInWithPopup(this.auth, new GoogleAuthProvider());
    await this.users.upsertProfile(credential.user);
    return credential;
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
  }
}
