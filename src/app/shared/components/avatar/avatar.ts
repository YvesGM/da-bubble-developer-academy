import { Component, Input } from '@angular/core';

/**
 * Renders a profile image from the application's predefined avatar set.
 *
 * The displayed image, accessible name, and dimensions are configured through
 * inputs so the same component works in messages, profile cards, and dialogs.
 */
@Component({
  selector: 'app-avatar',
  templateUrl: './avatar.html',
  styleUrl: './avatar.scss',
})
export class Avatar {
  /** Selected preset avatar ID, for example `avatar-1`. */
  @Input() avatarId = 'avatar-1';

  /** User's display name used by the template for accessible image text. */
  @Input() name = 'User';

  /** Visual size variant matching the avatar's current UI context. */
  @Input() size: 'small' | 'medium' | 'large' | 'hero' | 'option' = 'medium';

  /**
   * Resolves the asset URL for the selected predefined avatar.
   *
   * An ID outside the `avatar-<number>` convention falls back to the
   * generic profile icon rather than constructing an invalid avatar URL.
   *
   * @returns Path to the selected SVG avatar or the fallback profile icon.
   */
  source(): string {
    const number = this.avatarId.match(/^avatar-(\d+)$/)?.[1];
    return number ? `/assets/avatars/avatar${number}.svg` : '/assets/default-profile-icon.svg';
  }
}
