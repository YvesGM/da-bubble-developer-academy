import { AfterViewInit, Component, ElementRef, EventEmitter, inject, Output, ViewChild } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';

type LogoTargets = [HTMLImageElement, HTMLImageElement];

@Component({
  selector: 'app-splash',
  templateUrl: './splash.html',
  styleUrl: './splash.scss',
})
export class Splash implements AfterViewInit {
  @Output() readonly finished = new EventEmitter<void>();
  @ViewChild('backdrop') private backdrop!: ElementRef<HTMLElement>;
  @ViewChild('mark') private mark!: ElementRef<HTMLImageElement>;
  @ViewChild('nameWindow') private nameWindow!: ElementRef<HTMLElement>;
  @ViewChild('name') private name!: ElementRef<HTMLImageElement>;

  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  /** Starts only after the splash elements are available for animation. */
  ngAfterViewInit(): void {
    void this.continue();
  }

  /** Restores Firebase auth, navigates underneath the overlay, and animates out. */
  private async continue(): Promise<void> {
    try {
      await Promise.all([this.auth.authStateReady(), this.delay(1500)]);
      const destination = this.auth.currentUser ? '/workspace' : '/login';
      if (this.router.url !== destination) {
        const navigated = await this.router.navigateByUrl(destination);
        if (!navigated) throw new Error('Splash destination navigation was cancelled');
      }
      await this.waitForLayout();
      await this.playOutro();
    } catch (error) {
      console.error('Splash transition failed:', error);
    } finally {
      this.finished.emit();
    }
  }

  /** Fades the backdrop while each logo asset travels to its real header slot. */
  private async playOutro(): Promise<void> {
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 800;
    const animations = [this.backdrop.nativeElement.animate(
      [{ opacity: 1 }, { opacity: 0 }], this.animationOptions(duration),
    )];
    const targets = this.findLogoTargets();
    if (targets) this.animateLogo(targets, animations, duration);
    else this.fadeLogo(animations, duration);
    try {
      await Promise.all(animations.map((animation) => animation.finished));
    } finally {
      targets?.forEach((target) => target.style.removeProperty('visibility'));
    }
  }

  /** Identifies the actual auth or workspace header logo, including responsive sizes. */
  private findLogoTargets(): LogoTargets | null {
    const mark = document.querySelector<HTMLImageElement>(
      '.auth-brand-mark, .workspace-header .brand-mark',
    );
    const name = document.querySelector<HTMLImageElement>(
      '.auth-brand-name, .workspace-header .brand-name',
    );
    if (!mark || !name) return null;
    if (!mark.getBoundingClientRect().width || !name.getBoundingClientRect().width) return null;
    return [mark, name];
  }

  /** Animates the two logo elements independently to avoid distorted scaling. */
  private animateLogo(targets: LogoTargets, animations: Animation[], duration: number): void {
    targets.forEach((target) => { target.style.visibility = 'hidden'; });
    animations.push(this.moveTo(this.mark.nativeElement, targets[0], duration));
    animations.push(this.moveTo(this.nameWindow.nativeElement, targets[1], duration));
    animations.push(this.name.nativeElement.animate(
      [{ filter: 'brightness(0) invert(1)' }, { filter: 'none' }],
      this.animationOptions(duration),
    ));
  }

  /** Gracefully fades the logo if the destination has no visible header brand. */
  private fadeLogo(animations: Animation[], duration: number): void {
    for (const element of [this.mark.nativeElement, this.nameWindow.nativeElement]) {
      animations.push(element.animate(
        [{ opacity: 1 }, { opacity: 0 }], this.animationOptions(duration),
      ));
    }
  }

  /** Computes translation and scale from current bounds to target bounds. */
  private moveTo(source: HTMLElement, target: HTMLElement, duration: number): Animation {
    const start = source.getBoundingClientRect();
    const end = target.getBoundingClientRect();
    const x = end.left + end.width / 2 - start.left - start.width / 2;
    const y = end.top + end.height / 2 - start.top - start.height / 2;
    const scaleX = end.width / start.width;
    const scaleY = end.height / start.height;
    return source.animate(
      [{ transform: 'none' }, { transform: 'translate(' + x + 'px, ' + y + 'px) scale(' + scaleX + ', ' + scaleY + ')' }],
      this.animationOptions(duration),
    );
  }

  /** Shared easing ensures text and symbol arrive at the same time. */
  private animationOptions(duration: number): KeyframeAnimationOptions {
    return { duration, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'forwards' };
  }

  /** Defers measurement until routed components have completed layout. */
  private waitForLayout(): Promise<void> {
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  }

  /** Preserves the existing minimum intro duration. */
  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }
}
