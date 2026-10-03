import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-avatar',
  templateUrl: './avatar.html',
  styleUrl: './avatar.scss',
})
export class Avatar {
  @Input() avatarId = 'avatar-1';
  @Input() name = 'User';
  @Input() size: 'small' | 'medium' | 'large' | 'hero' | 'option' = 'medium';

  source(): string {
    const number = this.avatarId.match(/^avatar-(\d+)$/)?.[1];
    return number ? `/assets/avatars/avatar${number}.svg` : '/assets/default-profile-icon.svg';
  }
}
