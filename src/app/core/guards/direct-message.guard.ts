import { EnvironmentInjector, inject, runInInjectionContext } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { CanActivateFn, Router } from '@angular/router';

export const directMessageGuard: CanActivateFn = async (route) => {
  const auth = inject(Auth);
  const firestore = inject(Firestore);
  const injector = inject(EnvironmentInjector);
  const router = inject(Router);
  await auth.authStateReady();

  const dmId = route.paramMap.get('dmId') ?? '';
  const uid = auth.currentUser?.uid ?? '';
  if (!uid || auth.currentUser?.isAnonymous || !dmId) {
    return router.createUrlTree(['/workspace']);
  }

  try {
    const reference = runInInjectionContext(injector, () => doc(firestore, 'directMessages', dmId));
    const snapshot = await runInInjectionContext(injector, () => getDoc(reference));
    if (!snapshot.exists()) return router.createUrlTree(['/workspace']);
    const participants = snapshot.data()['participantIds'] as string[] | undefined;
    return participants?.includes(uid) ? true : router.createUrlTree(['/workspace']);
  } catch {
    return router.createUrlTree(['/workspace']);
  }
};
