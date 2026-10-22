import { Component, ElementRef, EventEmitter, HostListener, Input, Output, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UserProfile } from '../../../../core/models/user-profile.model';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { SearchBox } from '../search-box/search-box';

@Component({
  selector: 'app-workspace-header',
  imports: [Avatar, RouterLink, SearchBox],
  templateUrl: './workspace-header.html',
  styleUrl: './workspace-header.scss',
})
export class WorkspaceHeader {
  private readonly element = inject(ElementRef<HTMLElement>);
  @Input({ required: true }) displayName = '';
  @Input() avatarId = 'avatar-1';
  @Input() profileEnabled = true;
  @Input() conversationOpen = false;
  @Input() workspaceName = 'Workspace';
  @Output() readonly profileRequested = new EventEmitter<void>();
  @Output() readonly logoutRequested = new EventEmitter<void>();
  @Output() readonly userSelected = new EventEmitter<UserProfile>();

  readonly menuOpen = signal(false);

  /**
   * Closes the account menu when the user clicks outside the header.
   *
   * @param event - Document pointer event to inspect.
   */
  @HostListener('document:click', ['$event'])
  closeMenuOnOutsideClick(event: MouseEvent): void {
    if (!this.element.nativeElement.contains(event.target as Node)) this.menuOpen.set(false);
  }

  /** Closes the account menu with Escape. */
  @HostListener('document:keydown.escape')
  closeMenuOnEscape(): void {
    this.menuOpen.set(false);
  }

  /**
   * Requests the current user's profile view and closes the account menu.
   */
  openProfile(): void {
    this.menuOpen.set(false);
    this.profileRequested.emit();
  }

  /**
   * Requests sign-out from the parent workspace and closes the account menu.
   */
  logout(): void {
    this.menuOpen.set(false);
    this.logoutRequested.emit();
  }
}
