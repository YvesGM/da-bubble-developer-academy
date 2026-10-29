import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Splash } from './features/auth/splash/splash';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Splash],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly showSplash = signal(this.isSplashEntry());

  /** Removes the transition layer after the destination screen is visible. */
  finishSplash(): void {
    this.showSplash.set(false);
  }

  /** Only the initial app entry and the legacy splash URL trigger the intro. */
  private isSplashEntry(): boolean {
    const path = window.location.pathname.replace(/\/+$/, '');
    return path === '' || path === '/splash';
  }
}
