import { inject } from '@angular/core';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { CanActivateFn, Router } from '@angular/router';

export const channelAccessGuard: CanActivateFn = async (route) => {
  const firestore = inject(Firestore);
  const router = inject(Router);
  const channelId = route.paramMap.get('channelId') ?? '';
  if (!channelId) return router.createUrlTree(['/workspace']);

  try {
    const reference = doc(firestore, 'channels', channelId);
    const snapshot = await getDoc(reference);
    return snapshot.exists() ? true : router.createUrlTree(['/workspace']);
  } catch {
    return router.createUrlTree(['/workspace']);
  }
};
