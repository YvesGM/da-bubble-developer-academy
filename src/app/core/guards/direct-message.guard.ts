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
