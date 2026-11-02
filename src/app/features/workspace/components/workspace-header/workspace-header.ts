import { Component, ElementRef, EventEmitter, HostListener, Input, Output, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UserProfile } from '../../../../core/models/user-profile.model';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { PresenceIndicator } from '../../../../shared/components/presence-indicator/presence-indicator';
import { SearchBox } from '../search-box/search-box';

/** Displays workspace navigation and the current user's controls. */
@Component({
  selector: 'app-workspace-header',
  imports: [Avatar, PresenceIndicator, RouterLink, SearchBox],
  templateUrl: './workspace-header.html',
  styleUrl: './workspace-header.scss',
})
export class WorkspaceHeader {
  private readonly element = inject(ElementRef<HTMLElement>);
  @Input({ required: true }) displayName = '';
  @Input() avatarId = 'avatar-1';
  @Input() userId = '';
  @Input() profileEnabled = true;
  @Input() conversationOpen = false;
  @Input() workspaceName = 'Workspace';
  @Output() readonly profileRequested = new EventEmitter<void>();
  @Output() readonly logoutRequested = new EventEmitter<void>();
  @Output() readonly userSelected = new EventEmitter<UserProfile>();

  readonly menuOpen = signal(false);
  readonly dragOffset = signal(0);
  readonly dragging = signal(false);
  private dragStartY: number | null = null;
  private readonly dismissDistance = 72;

  /** Returns the account button bounds for its anchored profile card. */
  profileAnchor(): DOMRect | null {
    return this.element.nativeElement.querySelector('.profile-button')?.getBoundingClientRect() ?? null;
  }

  /** Toggles the account menu without interrupting the closing animation. */
  toggleMenu(): void {
    this.menuOpen() ? this.closeMenu() : this.menuOpen.set(true);
  }

  /** Resets an active gesture and slides the account menu closed. */
  closeMenu(): void {
    this.cancelMenuDrag();
    this.menuOpen.set(false);
  }

  /** Restores the account menu after a successful profile edit. */
  reopenMenu(): void {
    this.menuOpen.set(true);
  }

  /**
   * Closes the account menu when the user clicks outside the header.
   *
   * @param event - Document pointer event to inspect.
   */
  @HostListener('document:click', ['$event'])
  closeMenuOnOutsideClick(event: MouseEvent): void {
    if (!this.element.nativeElement.contains(event.target as Node)) this.closeMenu();
  }

  /** Closes the account menu with Escape. */
  @HostListener('document:keydown.escape')
  closeMenuOnEscape(): void {
    this.closeMenu();
  }

  /**
   * Requests the current user's profile view and closes the account menu.
   */
  openProfile(): void {
    this.closeMenu();
    this.profileRequested.emit();
  }

  /**
   * Requests sign-out from the parent workspace and closes the account menu.
   */
  logout(): void {
    this.closeMenu();
    this.logoutRequested.emit();
  }

  /** Starts the drag gesture on the mobile menu handle. */
  startMenuDrag(event: PointerEvent): void {
    if (!this.menuOpen()) return;
    this.dragStartY = event.clientY;
    this.dragging.set(true);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  /** Moves the mobile sheet down while its handle is being dragged. */
  moveMenuDrag(event: PointerEvent): void {
    if (this.dragStartY === null) return;
    this.dragOffset.set(Math.max(0, event.clientY - this.dragStartY));
  }

  /** Closes the sheet after a sufficiently long downward swipe. */
  finishMenuDrag(): void {
    const shouldClose = this.dragOffset() >= this.dismissDistance;
    this.cancelMenuDrag();
    if (shouldClose) this.closeMenu();
  }

  /** Clears a completed or cancelled sheet drag. */
  cancelMenuDrag(): void {
    this.dragStartY = null;
    this.dragging.set(false);
    this.dragOffset.set(0);
  }
}
