import { Component, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.html',
  styleUrl: './splash.scss',
})
export class Splash {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  /**
   * Starts the splash-screen transition immediately after component creation.
   *
   * Navigation waits for both Firebase Authentication restoration and the minimum
   * splash duration before choosing the next route.
   */
  constructor() {
    void this.continue();
  }

  /**
   * Waits for authentication readiness and the splash delay before choosing the next route.
   *
   * @returns A promise that resolves after the splash flow has navigated to login or workspace.
   */
  private async continue(): Promise<void> {
    await Promise.all([this.auth.authStateReady(), this.delay(1500)]);
    const target = this.auth.currentUser ? '/workspace' : '/login';
    await this.router.navigateByUrl(target);
  }

  /**
   * Creates the timer used to keep the splash screen visible for a fixed duration.
   *
   * @param milliseconds - Delay duration in milliseconds.
   * @returns A promise that resolves after the timer expires.
   */
  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }
}
