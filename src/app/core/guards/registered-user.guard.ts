import { inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Restricts registered-user features to non-anonymous Firebase sessions.
 *
 * @returns True for a registered user; otherwise a workspace redirect.
 */
/**
 * Restricts routes to fully registered users.
 *
 * Anonymous Firebase guest sessions remain authenticated but are intentionally
 * excluded from account-bound features such as direct messages.
 *
 * @returns `true` for a non-anonymous authenticated user; otherwise a URL tree
 * redirecting back to the workspace.
 */
export const registeredUserGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);
  await auth.authStateReady();
  const user = auth.currentUser;
  return user && !user.isAnonymous ? true : router.createUrlTree(['/workspace']);
};
