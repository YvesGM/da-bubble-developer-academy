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


  /**
   * Starts realtime presence tracking for the current registered user. The service subscribes to Firebase's connection state and writes one connection node per browser session.

  start(): void {
    if (this.connectedUnsubscribe || !this.registeredUserId()) return;
    const connectedRef = this.dbRef('.info/connected');
    this.connectedUnsubscribe = this.runSync(() =>
      onValue(connectedRef, (snapshot) => void this.handleConnection(snapshot)),
    );
  }


  /**
   * Stops realtime presence tracking and removes the current browser connection from the Realtime Database.
   *
   * @throws If the Realtime Database update fails.

  async stop(): Promise<void> {
    this.connectedUnsubscribe?.();
    this.connectedUnsubscribe = undefined;
    if (!this.connectionPath) return;
    await this.run(() => set(this.dbRef(this.connectionPath), null));
    this.connectionPath = '';
  }


  /**
   * Observes whether a user owns at least one active presence connection.
   *
   * @param uid - Firebase user identifier whose presence should be observed.
   * @returns An observable that emits true while at least one connection exists.

  observeOnline(uid: string): Observable<boolean> {
    return new Observable((subscriber) => {
      const reference = this.dbRef(`presence/${uid}/connections`);
      const unsubscribe = this.runSync(() =>
        onValue(reference, (snapshot) => subscriber.next(snapshot.exists())),
      );
      return unsubscribe;
    });
  }

  /**
   * Handles Firebase connection-state changes and registers the current browser session when connectivity is established.
   *
   * @param snapshot - Realtime Database snapshot for `.info/connected`.
   * @throws If disconnect handlers or the connection write fail.

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

  /**
   * Creates a unique Realtime Database reference for this browser session and stores its path for cleanup.
   *
   * @param uid - Firebase user identifier for the presence owner.
   * @returns The reference for the newly generated connection node.

  private createConnectionRef(uid: string) {
    const id = crypto.randomUUID().replaceAll('-', '');
    this.connectionPath = `presence/${uid}/connections/${id}`;
    return this.dbRef(this.connectionPath);
  }

  /**
   * Returns the current registered user identifier while excluding anonymous sessions.
   *
   * @returns The user identifier, or an empty string for anonymous and unauthenticated sessions.
   */
  private registeredUserId(): string {
    const user = this.auth.currentUser;
    return !user || user.isAnonymous ? '' : user.uid;
  }

  /**
   * Creates a Realtime Database reference within the Angular injection context.
   *
   * @param path - Realtime Database path to reference.
   * @returns The Firebase database reference.
   */
  private dbRef(path: string) {
    return this.runSync(() => ref(this.database, path));
  }

  /**
   * Executes an asynchronous Realtime Database operation inside the service injection context.
   *
   * @param action - Asynchronous Firebase operation.
   * @returns The promise returned by the supplied operation.
   */
  private run<T>(action: () => Promise<T>): Promise<T> {
    return runInInjectionContext(this.injector, action);
  }

  /**
   * Executes a synchronous Realtime Database operation inside the service injection context.
   *
   * @param action - Synchronous Firebase operation.
   * @returns The value returned by the supplied operation.
   */
  private runSync<T>(action: () => T): T {
    return runInInjectionContext(this.injector, action);
  }
}
