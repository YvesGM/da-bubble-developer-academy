import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Database,
  DataSnapshot,
  onDisconnect,
  onValue,
  ref,
  serverTimestamp,
  set,
} from '@angular/fire/database';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PresenceService {
  private readonly auth = inject(Auth);
  private readonly database = inject(Database);
  private readonly injector = inject(EnvironmentInjector);
  private connectedUnsubscribe?: () => void;
  private connectionPath = '';

  /** Starts realtime presence tracking for a registered user. */
  start(): void {
    if (this.connectedUnsubscribe || !this.registeredUserId()) return;
    const connectedRef = this.dbRef('.info/connected');
    this.connectedUnsubscribe = this.runSync(() =>
      onValue(connectedRef, (snapshot) => void this.handleConnection(snapshot)),
    );
  }

  /** Stops presence tracking and removes this client's connection entry. */
  async stop(): Promise<void> {
    this.connectedUnsubscribe?.();
    this.connectedUnsubscribe = undefined;
    if (!this.connectionPath) return;
    await this.run(() => set(this.dbRef(this.connectionPath), null));
    this.connectionPath = '';
  }

  /** Observes whether a user currently owns at least one active connection. */
  observeOnline(uid: string): Observable<boolean> {
    return new Observable((subscriber) => {
      const reference = this.dbRef(`presence/${uid}/connections`);
      const unsubscribe = this.runSync(() =>
        onValue(reference, (snapshot) => subscriber.next(snapshot.exists())),
      );
      return unsubscribe;
    });
  }

  private async handleConnection(snapshot: DataSnapshot): Promise<void> {
    if (snapshot.val() !== true) return;
    const uid = this.registeredUserId();
    if (!uid) return;
    const connectionRef = this.createConnectionRef(uid);
    const changedRef = this.dbRef(`presence/${uid}/lastChanged`);
    await this.run(() => onDisconnect(connectionRef).remove());
    await this.run(() => onDisconnect(changedRef).set(serverTimestamp()));
    await this.run(() => set(connectionRef, true));
  }

  private createConnectionRef(uid: string) {
    const id = crypto.randomUUID().replaceAll('-', '');
    this.connectionPath = `presence/${uid}/connections/${id}`;
    return this.dbRef(this.connectionPath);
  }

  private registeredUserId(): string {
    const user = this.auth.currentUser;
    return !user || user.isAnonymous ? '' : user.uid;
  }

  private dbRef(path: string) {
    return this.runSync(() => ref(this.database, path));
  }

  private run<T>(action: () => Promise<T>): Promise<T> {
    return runInInjectionContext(this.injector, action);
  }

  private runSync<T>(action: () => T): T {
    return runInInjectionContext(this.injector, action);
  }
}
