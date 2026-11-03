import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getDatabase, provideDatabase } from '@angular/fire/database';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { provideRouter, withHashLocation } from '@angular/router';

import { firebaseConfig } from '../environments/environment.generated';
import { routes } from './app.routes';

/**
 * Uses fragment-based routes on the Akademie FTP host so nested URLs refresh
 * without requiring Apache rewrite access. Other deployments keep clean URLs.
 */
const academyHashRouting = window.location.hostname === 'yves-gildemeister.developerakademie.net';

/**
 * Provides the application-wide services required by the Angular root.
 *
 * Routing uses the protected route definitions from `app.routes`. A single
 * Firebase web app initializes Authentication, Firestore, and Realtime Database
 * with the configuration generated during the local or CI build.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, ...(academyHashRouting ? [withHashLocation()] : [])),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),
    provideDatabase(() => getDatabase()),
    provideFirestore(() => getFirestore()),
  ],
};
