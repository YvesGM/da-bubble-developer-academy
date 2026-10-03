import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import { User } from '@angular/fire/auth';
import {
  Firestore,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from '@angular/fire/firestore';

import { UserProfile } from '../models/user-profile.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(EnvironmentInjector);

  async createProfile(user: User, displayName?: string): Promise<void> {
    const reference = this.userReference(user.uid);
    await this.run(() => setDoc(reference, this.buildProfile(user, displayName)));
  }

  async ensureProfile(user: User, displayName?: string): Promise<void> {
    const reference = this.userReference(user.uid);
    const snapshot = await this.run(() => getDoc(reference));
    if (snapshot.exists()) return;
    await this.run(() => setDoc(reference, this.buildProfile(user, displayName)));
  }

  private userReference(uid: string) {
    return this.runSync(() => doc(this.firestore, 'users', uid));
  }

  private buildProfile(user: User, displayName?: string): UserProfile {
    return {
      uid: user.uid,
      email: user.email,
      displayName: displayName || user.displayName || 'Gast',
      avatarId: 'avatar-1',
      isGuest: user.isAnonymous,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  }

  private run<T>(action: () => Promise<T>): Promise<T> {
    return runInInjectionContext(this.injector, action);
  }

  private runSync<T>(action: () => T): T {
    return runInInjectionContext(this.injector, action);
  }
}
