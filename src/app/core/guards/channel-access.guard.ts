import { EnvironmentInjector, inject, runInInjectionContext } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Checks whether the channel requested by the current route exists.
 *
 * @param route - Route data containing the channel identifier.
 * @returns True when the channel exists; otherwise a workspace redirect.
 */
export const channelAccessGuard: CanActivateFn = async (route) => {
  const auth = inject(Auth);
  const firestore = inject(Firestore);
  const injector = inject(EnvironmentInjector);
  const router = inject(Router);
  await auth.authStateReady();
  const channelId = route.paramMap.get('channelId') ?? '';
  if (!channelId) return router.createUrlTree(['/workspace']);

  try {
    const reference = runInInjectionContext(injector, () => doc(firestore, 'channels', channelId));
    const snapshot = await runInInjectionContext(injector, () => getDoc(reference));
    return snapshot.exists() ? true : router.createUrlTree(['/workspace']);
  } catch {
    return router.createUrlTree(['/workspace']);
  }
};
