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

  constructor() {
    void this.continue();
  }

  private async continue(): Promise<void> {
    await Promise.all([this.auth.authStateReady(), this.delay(1500)]);
    const target = this.auth.currentUser ? '/workspace' : '/login';
    await this.router.navigateByUrl(target);
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }
}
