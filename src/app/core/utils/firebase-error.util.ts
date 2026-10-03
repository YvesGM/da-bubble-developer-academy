import { FirebaseError } from 'firebase/app';

const FIREBASE_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'Diese E-Mail-Adresse wird bereits verwendet.',
  'auth/invalid-credential': 'E-Mail-Adresse oder Passwort ist nicht korrekt.',
  'auth/invalid-email': 'Die E-Mail-Adresse ist ungültig.',
  'auth/operation-not-allowed': 'Diese Anmeldemethode ist in Firebase nicht aktiviert.',
  'auth/popup-blocked': 'Das Anmeldefenster wurde vom Browser blockiert.',
  'auth/popup-closed-by-user': 'Die Google-Anmeldung wurde abgebrochen.',
  'auth/too-many-requests': 'Zu viele Versuche. Bitte versuche es später erneut.',
  'auth/user-disabled': 'Dieses Benutzerkonto wurde deaktiviert.',
  'auth/weak-password': 'Das Passwort ist zu schwach.',
  'permission-denied': 'Der Datenbankzugriff wurde von den Firebase-Regeln abgelehnt.',
};

export function firebaseErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof FirebaseError)) return fallback;
  return FIREBASE_MESSAGES[error.code] ?? fallback;
}
