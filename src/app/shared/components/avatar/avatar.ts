import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-avatar',
  templateUrl: './avatar.html',
  styleUrl: './avatar.scss',
})
export class Avatar {
  @Input() avatarId = 'avatar-1';
  @Input() name = 'User';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';

  label(): string {
    const number = this.avatarId.match(/\d+$/)?.[0];
    return number ?? this.name.charAt(0).toUpperCase();
  }
}
