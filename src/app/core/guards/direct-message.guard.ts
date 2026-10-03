import { EnvironmentInjector, inject, runInInjectionContext } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

export const directMessageGuard: CanActivateFn = async (route) => {
  const context = guardContext();
  await context.auth.authStateReady();
  const dmId = route.paramMap.get('dmId') ?? '';
  if (!validRequest(context.auth, dmId)) return context.router.createUrlTree(['/workspace']);
  return verifyConversation(context, dmId);
};

function guardContext() {
  return {
    auth: inject(Auth),
    firestore: inject(Firestore),
    injector: inject(EnvironmentInjector),
    router: inject(Router),
  };
}

function validRequest(auth: Auth, dmId: string): boolean {
  return Boolean(auth.currentUser?.uid && !auth.currentUser.isAnonymous && dmId);
}

async function verifyConversation(
  context: ReturnType<typeof guardContext>,
  dmId: string,
): Promise<true | UrlTree> {
  try {
    const snapshot = await readConversation(context, dmId);
    return hasAccess(snapshot.data(), context.auth.currentUser?.uid ?? '')
      ? true
      : context.router.createUrlTree(['/workspace']);
  } catch {
    return context.router.createUrlTree(['/workspace']);
  }
}

async function readConversation(context: ReturnType<typeof guardContext>, dmId: string) {
  const reference = runInInjectionContext(context.injector, () =>
    doc(context.firestore, 'directMessages', dmId),
  );
  return runInInjectionContext(context.injector, () => getDoc(reference));
}

function hasAccess(data: unknown, uid: string): boolean {
  if (!data || typeof data !== 'object') return false;
  const participantIds = (data as { participantIds?: unknown }).participantIds;
  return Array.isArray(participantIds) && participantIds.includes(uid);
}
