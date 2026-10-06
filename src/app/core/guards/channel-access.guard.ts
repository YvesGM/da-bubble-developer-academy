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
/**
 * Verifies that the requested channel can be opened by the current session.
 *
 * The guard resolves the channel id from the route, waits for Firebase Auth to
 * restore its state and then reads the corresponding Firestore document. The
 * Firestore security rules remain the authoritative permission boundary.
 *
 * @param route Angular route snapshot containing the `channelId` parameter.
 * @returns `true` when the channel document exists and is readable; otherwise
 * a URL tree redirecting to the workspace.
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
