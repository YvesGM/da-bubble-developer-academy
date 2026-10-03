import { inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { CanActivateFn, Router } from '@angular/router';

export const registeredUserGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);
  await auth.authStateReady();
  const user = auth.currentUser;
  return user && !user.isAnonymous ? true : router.createUrlTree(['/workspace']);
};
