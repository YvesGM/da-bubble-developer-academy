import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

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
  /** Router used to recognize the transition from the workspace to login. */
  private readonly router = inject(Router);
  /** Route seen before the next completed navigation. */
  private previousRoute = this.router.url;
  /** Whether the introductory splash should be rendered before routing. */
  readonly showSplash = signal(this.isSplashEntry());

  /** Replays the existing splash when signing out of a workspace. */
  constructor() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe((event) => {
      const route = event.urlAfterRedirects;
      if (this.previousRoute.startsWith('/workspace') && route === '/login') this.showSplash.set(true);
      this.previousRoute = route;
    });
  }

  /** Removes the transition layer after the destination screen is visible. */
  finishSplash(): void {
    this.showSplash.set(false);
  }

  /**
   * Only an entry without a hash route or the explicit splash URL triggers the intro.
   *
   * @returns Whether the splash overlay should be displayed.
   */
  private isSplashEntry(): boolean {
    const path = window.location.pathname.replace(/\/+$/, '');
    const hashPath = window.location.hash.split('?')[0].replace(/^#/, '').replace(/\/+$/, '');
    return (path === '' && (!hashPath || hashPath === '/splash')) || path === '/splash';
  }
}
