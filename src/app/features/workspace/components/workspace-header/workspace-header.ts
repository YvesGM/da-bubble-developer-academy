import { Component, ElementRef, EventEmitter, HostListener, Input, Output, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UserProfile } from '../../../../core/models/user-profile.model';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { PresenceIndicator } from '../../../../shared/components/presence-indicator/presence-indicator';
import { SearchBox } from '../search-box/search-box';

/**
 * Renders workspace identity, navigation controls, and the current account menu.
 *
 * The account menu has responsive drag state; profile and sign-out actions
 * are emitted to the parent rather than performed by the header.
 */
@Component({
  selector: 'app-workspace-header',
  imports: [Avatar, PresenceIndicator, RouterLink, SearchBox],
  templateUrl: './workspace-header.html',
  styleUrl: './workspace-header.scss',
})
export class WorkspaceHeader {
  /** Header host element used to locate the profile button anchor. */
  private readonly element = inject(ElementRef<HTMLElement>);
  /** Authenticated user's name displayed in the header. */
  @Input({ required: true }) displayName = '';
  /** Avatar selection currently active in the profile editor. */
  @Input() avatarId = 'avatar-1';
  /** Firebase UID used to resolve the header account's presence. */
  @Input() userId = '';
  /** Whether the account menu and profile actions are enabled. */
  @Input() profileEnabled = true;
  /** Whether the header is displayed above an active conversation. */
  @Input() conversationOpen = false;
  /** Workspace display name shown in headings and dialogs. */
  @Input() workspaceName = 'Workspace';
  /** Requests display of the account's profile editor. */
  @Output() readonly profileRequested = new EventEmitter<void>();
  /** Requests logout through the workspace auth service. */
  @Output() readonly logoutRequested = new EventEmitter<void>();
  /** Emits a member profile selected in the list or dialog. */
  @Output() readonly userSelected = new EventEmitter<UserProfile>();

  /** Whether the responsive account menu is visible. */
  readonly menuOpen = signal(false);
  /** Current vertical drag displacement of the mobile menu sheet. */
  readonly dragOffset = signal(0);
  /** Whether the mobile sheet handle is actively being dragged. */
  readonly dragging = signal(false);
  /** Initial vertical pointer coordinate of the current mobile-menu drag. */
  private dragStartY: number | null = null;
  /** Minimum downward drag in pixels required to dismiss the mobile menu. */
  private readonly dismissDistance = 72;

  /**
   * Finds the account button used to anchor the profile card.
   *
   * @returns Viewport bounds of the button, or null when it is not rendered.
   */
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

  /**
   * Starts a pointer drag on the mobile account-menu handle.
   *
   * Pointer capture ensures the drag continues when the pointer leaves the handle.
   *
   * @param event - Pointer event providing the starting position and pointer ID.
   */
  startMenuDrag(event: PointerEvent): void {
    if (!this.menuOpen()) return;
    this.dragStartY = event.clientY;
    this.dragging.set(true);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  /**
   * Updates the menu's nonnegative downward displacement during a drag gesture.
   *
   * @param event - Pointer event providing the current vertical position.
   */
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
