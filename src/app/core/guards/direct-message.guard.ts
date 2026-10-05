import { EnvironmentInjector, inject, runInInjectionContext } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

/**
 * Restricts direct-message routes to registered participants of the requested conversation.
 *
 * @param route - Route data containing the direct-message conversation identifier.
 * @returns True when access is allowed; otherwise a workspace redirect.
 */
export const directMessageGuard: CanActivateFn = async (route) => {
  const context = guardContext();
  await context.auth.authStateReady();
  const dmId = route.paramMap.get('dmId') ?? '';
  if (!validRequest(context.auth, dmId)) return context.router.createUrlTree(['/workspace']);
  return verifyConversation(context, dmId);
};

/**
 * Resolves the injected services required by the direct-message route guard.
 *
 * @returns The authentication, Firestore, injector and router dependencies.
 */
function guardContext() {
  return {
    auth: inject(Auth),
    firestore: inject(Firestore),
    injector: inject(EnvironmentInjector),
    router: inject(Router),
  };
}

/**
 * Validates the minimum requirements for opening a direct-message route.
 *
 * @param auth - Firebase Authentication service.
 * @param dmId - Requested direct-message conversation identifier.
 * @returns Whether a registered user and conversation id are available.
 */
function validRequest(auth: Auth, dmId: string): boolean {
  return Boolean(auth.currentUser?.uid && !auth.currentUser.isAnonymous && dmId);
}

/**
 * Verifies that the current user is a participant of the requested conversation.
 *
 * @param context - Dependencies used by the route guard.
 * @param dmId - Requested direct-message conversation identifier.
 * @returns True when access is allowed, otherwise a redirect URL tree.
 */
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

/**
 * Reads the requested direct-message conversation from Firestore.
 *
 * @param context - Dependencies used by the route guard.
 * @param dmId - Requested direct-message conversation identifier.
 * @returns The Firestore document snapshot for the conversation.
 */
async function readConversation(context: ReturnType<typeof guardContext>, dmId: string) {
  const reference = runInInjectionContext(context.injector, () =>
    doc(context.firestore, 'directMessages', dmId),
  );
  return runInInjectionContext(context.injector, () => getDoc(reference));
}

/**
 * Checks whether the supplied conversation data contains the current user.
 *
 * @param data - Firestore conversation payload.
 * @param uid - Current Firebase user identifier.
 * @returns Whether the user is listed as a participant.
 */
function hasAccess(data: unknown, uid: string): boolean {
  if (!data || typeof data !== 'object') return false;
  const participantIds = (data as { participantIds?: unknown }).participantIds;
  return Array.isArray(participantIds) && participantIds.includes(uid);
}
