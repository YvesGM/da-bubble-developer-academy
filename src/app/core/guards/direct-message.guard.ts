import { EnvironmentInjector, inject, runInInjectionContext } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

/**
 * Evaluates participant membership on a direct-message document.
 *
 * @param data Raw Firestore document data.
 * @param uid Firebase uid of the user requesting access.
 * @returns `true` when `participantIds` is an array containing the uid.
 */
function hasAccess(data: unknown, uid: string): boolean {
  if (!data || typeof data !== 'object') return false;
  const participantIds = (data as { participantIds?: unknown }).participantIds;
  return Array.isArray(participantIds) && participantIds.includes(uid);
}

/**
 * Reads a direct-message document inside the Firebase injection context.
 *
 * @param firestore Firebase Firestore instance.
 * @param injector Angular environment injector.
 * @param dmId Requested conversation identifier.
 * @param uid Current registered user's identifier.
 * @returns Whether the user is a participant in this conversation.
 */
async function canReadConversation(
  firestore: Firestore,
  injector: EnvironmentInjector,
  dmId: string,
  uid: string,
): Promise<boolean> {
  try {
    const reference = runInInjectionContext(injector, () => doc(firestore, 'directMessages', dmId));
    const snapshot = await runInInjectionContext(injector, () => getDoc(reference));
    
    return snapshot.exists() && hasAccess(snapshot.data(), uid);
  } catch {
    return false;
  }
}

/**
 * Allows registered users to open only their own direct-message conversations.
 *
 * @param route Route snapshot containing the direct-message identifier.
 * @returns True for members; otherwise a redirect to the workspace.
 */
export const directMessageGuard: CanActivateFn = async (route): Promise<boolean | UrlTree> => {
  const auth = inject(Auth);
  const firestore = inject(Firestore);
  const injector = inject(EnvironmentInjector);
  const router = inject(Router);
  await auth.authStateReady();
  const user = auth.currentUser;
  const dmId = route.paramMap.get('dmId');
  if (!user || user.isAnonymous || !dmId) return router.createUrlTree(['/workspace']);
  const allowed = await canReadConversation(firestore, injector, dmId, user.uid);
  return allowed ? true : router.createUrlTree(['/workspace']);
};
