import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes), provideFirebaseApp(() => initializeApp({ apiKey: "AIzaSyAQsB_CQ63R4vjWwM647ugor8gD4tzV7i0", authDomain: "dabubble-48de7.firebaseapp.com", databaseURL: "https://dabubble-48de7-default-rtdb.europe-west1.firebasedatabase.app", projectId: "dabubble-48de7", storageBucket: "dabubble-48de7.firebasestorage.app", messagingSenderId: "1019918544334", appId: "1:1019918544334:web:9433c39c356542d420cf9f" })), provideAuth(() => getAuth()), provideFirestore(() => getFirestore())
  ]
};
