import { inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Protects routes that require an authenticated Firebase session.
 *
 * @returns True when a Firebase user is authenticated; otherwise a redirect to the login route.
 */
/**
 * Protects routes that require any authenticated Firebase session.
 *
 * The guard waits until Firebase Authentication has restored the persisted
 * session before deciding whether navigation may continue.
 *
 * @returns `true` when a user is authenticated; otherwise a URL tree that
 * redirects the visitor to the login page.
 */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);
  await auth.authStateReady();
  return auth.currentUser ? true : router.createUrlTree(['/login']);
};
