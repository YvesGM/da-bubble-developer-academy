import { Injectable, inject } from '@angular/core';
import { User } from '@angular/fire/auth';
import { Firestore, doc, serverTimestamp, setDoc } from '@angular/fire/firestore';

import { UserProfile } from '../models/user-profile.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly firestore = inject(Firestore);

  async upsertProfile(user: User, displayName?: string): Promise<void> {
    const reference = doc(this.firestore, 'users', user.uid);
    const profile = this.buildProfile(user, displayName);
    await setDoc(reference, profile, { merge: true });
  }

  private buildProfile(user: User, displayName?: string): UserProfile {
    return {
      uid: user.uid,
      email: user.email,
      displayName: displayName || user.displayName || 'Gast',
      avatarId: 'avatar-1',
      isGuest: user.isAnonymous,
      updatedAt: serverTimestamp(),
    };
  }
}
