import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Splash } from './features/auth/splash/splash';

/**
 * Owns the root application shell and the first-launch splash transition.
 *
 * The shell keeps the introductory animation separate from routed Angular pages
 * so navigation starts only after the initial entry state is resolved.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Splash],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  /** Whether the introductory splash should be rendered before routing. */
  readonly showSplash = signal(this.isSplashEntry());

  /** Removes the transition layer after the destination screen is visible. */
  finishSplash(): void {
    this.showSplash.set(false);
  }

  /**
   * Only the initial app entry and the legacy splash URL trigger the intro.
   *
   * @returns Whether the splash overlay should be displayed.
   */
  private isSplashEntry(): boolean {
    const path = window.location.pathname.replace(/\/+$/, '');
    return path === '' || path === '/splash';
  }
}
