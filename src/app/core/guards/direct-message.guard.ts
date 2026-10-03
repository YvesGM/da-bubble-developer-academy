import { inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { CanActivateFn, Router } from '@angular/router';

export const directMessageGuard: CanActivateFn = async (route) => {
  const auth = inject(Auth);
  const router = inject(Router);
  await auth.authStateReady();
  const dmId = route.paramMap.get('dmId') ?? '';
  const uid = auth.currentUser?.uid ?? '';
  const participants = dmId.split('__');
  return uid && participants.includes(uid) ? true : router.createUrlTree(['/workspace']);
};
