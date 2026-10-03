import { Component, EventEmitter, Input, Output, signal } from '@angular/core';

import { Channel } from '../../../../core/models/channel.model';
import { UserProfile } from '../../../../core/models/user-profile.model';

@Component({
  selector: 'app-new-message-dialog',
  templateUrl: './new-message-dialog.html',
  styleUrl: './new-message-dialog.scss',
})
export class NewMessageDialog {
  @Input() users: UserProfile[] = [];
  @Input() channels: Channel[] = [];
  @Input() currentUserId = '';
  @Output() readonly closeRequested = new EventEmitter<void>();
  @Output() readonly userSelected = new EventEmitter<string>();
  @Output() readonly channelSelected = new EventEmitter<string>();

  readonly query = signal('');

  mode(): '@' | '#' {
    return this.query().trim().startsWith('#') ? '#' : '@';
  }

  filteredUsers(): UserProfile[] {
    const value = this.normalizedQuery();
    return this.users.filter((user) => this.matchesUser(user, value));
  }

  filteredChannels(): Channel[] {
    const value = this.normalizedQuery();
    return this.channels.filter((channel) => channel.name.toLowerCase().includes(value));
  }

  private normalizedQuery(): string {
    return this.query().trim().replace(/^[@#]/, '').toLowerCase();
  }

  private matchesUser(user: UserProfile, query: string): boolean {
    if (user.uid === this.currentUserId) return false;
    if (!query) return true;
    return user.displayName.toLowerCase().includes(query) || user.email?.toLowerCase().includes(query) === true;
  }
}
