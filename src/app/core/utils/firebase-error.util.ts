import { FirebaseError } from 'firebase/app';

const FIREBASE_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'This email address is already in use.',
  'auth/invalid-credential': 'The email address or password is incorrect.',
  'auth/invalid-email': 'The email address is invalid.',
  'auth/expired-action-code': 'This password reset link has expired.',
  'auth/invalid-action-code': 'This password reset link is invalid.',
  'auth/user-not-found': 'No account exists for this email address.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled in Firebase.',
  'auth/popup-blocked': 'The sign-in window was blocked by the browser.',
  'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/user-disabled': 'This user account has been disabled.',
  'auth/weak-password': 'The password is too weak.',
  'permission-denied': 'The database access was denied by the Firebase rules.',
};

export function firebaseErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof FirebaseError)) return fallback;
  return FIREBASE_MESSAGES[error.code] ?? fallback;
}
